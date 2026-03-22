import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify caller is admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const body = await req.json();
  const { action } = body;

  // ─── Import users from Excel data ───
  if (action === 'import') {
    const { users } = body as { action: string; users: { username: string; password: string }[] };
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const u of users) {
      try {
        if (!u.username || !u.password) {
          results.errors.push(`Boş istifadəçi adı/şifrə`);
          continue;
        }

        const sanitizedUsername = u.username.trim();
        const email = sanitizedUsername.includes('@')
          ? sanitizedUsername
          : `${sanitizedUsername.replace(/[^a-zA-Z0-9._-]/g, '_')}@atu.student`;

        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from('user_credentials')
          .select('id')
          .eq('username', sanitizedUsername)
          .maybeSingle();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: u.password,
          email_confirm: true,
          user_metadata: { username: sanitizedUsername },
        });

        if (authError) {
          results.errors.push(`${sanitizedUsername}: ${authError.message}`);
          continue;
        }

        // Store credential mapping
        await supabaseAdmin.from('user_credentials').insert({
          username: sanitizedUsername,
          auth_user_id: authData.user.id,
        });

        // Update profile with username
        await supabaseAdmin.from('profiles')
          .update({ username: sanitizedUsername })
          .eq('user_id', authData.user.id);

        results.created++;
      } catch (e) {
        results.errors.push(`${u.username}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── Create admin account ───
  if (action === 'create-admin') {
    const { username, password } = body;
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const email = username.includes('@')
      ? username
      : `${username.replace(/[^a-zA-Z0-9._-]/g, '_')}@atu.admin`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, is_admin: true },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Add to admins table
    await supabaseAdmin.from('admins').insert({ email });

    // Store credential mapping
    await supabaseAdmin.from('user_credentials').insert({
      username,
      auth_user_id: authData.user.id,
    });

    return new Response(JSON.stringify({ success: true, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── Change password ───
  if (action === 'change-password') {
    const { newPassword, targetUserId } = body;
    const userId = targetUserId || user.id;

    // Only super admin can change others' passwords
    if (targetUserId && targetUserId !== user.id) {
      const superAdminEmail = 'atuimtahanportali@atu.edu.az';
      if (user.email !== superAdminEmail) {
        return new Response(JSON.stringify({ error: 'Only super admin can change others passwords' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUser(userId, { password: newPassword });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── Approve/Reject admin deletion ───
  if (action === 'approve-deletion') {
    const { requestId, approved } = body;
    const superAdminEmail = 'atuimtahanportali@atu.edu.az';

    if (user.email !== superAdminEmail) {
      return new Response(JSON.stringify({ error: 'Only super admin can approve deletions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (approved) {
      // Get the request
      const { data: request } = await supabaseAdmin
        .from('admin_deletion_requests')
        .select('admin_id, admin_email')
        .eq('id', requestId)
        .single();

      if (request) {
        // Delete from admins table
        await supabaseAdmin.from('admins').delete().eq('id', (request as any).admin_id);
        // Update request status
        await supabaseAdmin.from('admin_deletion_requests').update({ status: 'approved' }).eq('id', requestId);
      }
    } else {
      await supabaseAdmin.from('admin_deletion_requests').update({ status: 'rejected' }).eq('id', requestId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
