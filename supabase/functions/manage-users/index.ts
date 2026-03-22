import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify caller is admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id });
  if (!isAdmin) return json({ error: 'Forbidden' }, 403);

  const body = await req.json();
  const { action } = body;
  const superAdminEmail = 'atuimtahanportali@atu.edu.az';

  // ─── Import users from Excel data ───
  if (action === 'import') {
    const { users } = body as { action: string; users: { username: string; password: string }[] };
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const u of users) {
      try {
        if (!u.username || !u.password) { results.errors.push('Boş istifadəçi adı/şifrə'); continue; }
        const sanitizedUsername = u.username.trim();
        const email = sanitizedUsername.includes('@')
          ? sanitizedUsername
          : `${sanitizedUsername.replace(/[^a-zA-Z0-9._-]/g, '_')}@atu.student`;

        const { data: existing } = await supabaseAdmin
          .from('user_credentials').select('id').eq('username', sanitizedUsername).maybeSingle();
        if (existing) { results.skipped++; continue; }

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email, password: u.password, email_confirm: true,
          user_metadata: { username: sanitizedUsername },
        });

        if (authError) {
          if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
            results.skipped++; continue;
          }
          results.errors.push(`${sanitizedUsername}: ${authError.message}`); continue;
        }

        await supabaseAdmin.from('user_credentials').insert({ username: sanitizedUsername, auth_user_id: authData.user.id });
        await supabaseAdmin.from('profiles').update({ username: sanitizedUsername }).eq('user_id', authData.user.id);
        results.created++;
      } catch (e) {
        results.errors.push(`${u.username}: ${(e as Error).message}`);
      }
    }
    return json(results);
  }

  // ─── Create admin account ───
  if (action === 'create-admin') {
    const { username, password } = body;
    if (!username || !password) return json({ error: 'Username and password required' }, 400);

    const email = username.includes('@') ? username : `${username.replace(/[^a-zA-Z0-9._-]/g, '_')}@atu.admin`;

    // Remove old admin entry if exists (for re-creation)
    const { data: existingAdmin } = await supabaseAdmin.from('admins').select('id').eq('email', email).maybeSingle();
    if (existingAdmin) await supabaseAdmin.from('admins').delete().eq('id', existingAdmin.id);

    const { data: existingCred } = await supabaseAdmin
      .from('user_credentials').select('auth_user_id').eq('username', username.trim()).maybeSingle();

    let authUserId: string;
    if (existingCred?.auth_user_id) {
      await supabaseAdmin.auth.admin.updateUser(existingCred.auth_user_id, { password });
      authUserId = existingCred.auth_user_id;
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { username, is_admin: true },
      });
      if (authError) return json({ error: authError.message }, 400);
      authUserId = authData.user.id;
      await supabaseAdmin.from('user_credentials').upsert({ username, auth_user_id: authUserId }, { onConflict: 'username' });
    }

    await supabaseAdmin.from('admins').insert({ email });
    await supabaseAdmin.from('profiles').update({ onboarding_complete: true, username } as any).eq('user_id', authUserId);
    return json({ success: true, email });
  }

  // ─── Change password ───
  if (action === 'change-password') {
    const { newPassword, targetUserId } = body;
    const userId = targetUserId || user.id;
    if (targetUserId && targetUserId !== user.id && user.email !== superAdminEmail) {
      return json({ error: 'Only super admin can change others passwords' }, 403);
    }
    const { error } = await supabaseAdmin.auth.admin.updateUser(userId, { password: newPassword });
    if (error) return json({ error: error.message }, 400);
    return json({ success: true });
  }

  // ─── Approve/Reject admin deletion ───
  if (action === 'approve-deletion') {
    const { requestId, approved } = body;
    if (user.email !== superAdminEmail) return json({ error: 'Only super admin can approve deletions' }, 403);

    if (approved) {
      const { data: request } = await supabaseAdmin
        .from('admin_deletion_requests').select('admin_id, admin_email').eq('id', requestId).single();
      if (request) {
        await supabaseAdmin.from('admins').delete().eq('id', (request as any).admin_id);
        await supabaseAdmin.from('admin_deletion_requests').update({ status: 'approved' }).eq('id', requestId);
      }
    } else {
      await supabaseAdmin.from('admin_deletion_requests').update({ status: 'rejected' }).eq('id', requestId);
    }
    return json({ success: true });
  }

  // ─── Full System Reset (Super Admin only) ───
  if (action === 'full-reset') {
    if (user.email !== superAdminEmail) return json({ error: 'Only super admin can reset system' }, 403);

    try {
      // Delete all data tables
      await supabaseAdmin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('exam_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('exam_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('group_exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('user_exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('admin_deletion_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete all non-super-admin entries from admins
      await supabaseAdmin.from('admins').delete().neq('email', superAdminEmail);

      // Delete all user credentials
      await supabaseAdmin.from('user_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete all profiles except super admin's
      const { data: superUser } = await supabaseAdmin.auth.admin.listUsers();
      const superAdminId = superUser?.users?.find(u => u.email === superAdminEmail)?.id;
      if (superAdminId) {
        await supabaseAdmin.from('profiles').delete().neq('user_id', superAdminId);
      }

      // Delete all auth users except super admin
      if (superUser?.users) {
        for (const u of superUser.users) {
          if (u.email !== superAdminEmail) {
            await supabaseAdmin.auth.admin.deleteUser(u.id);
          }
        }
      }

      return json({ success: true });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  // ─── Legacy reset (data only, no user deletion) ───
  if (action === 'reset-system') {
    if (user.email !== superAdminEmail) return json({ error: 'Only super admin can reset system' }, 403);
    try {
      await supabaseAdmin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('exam_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('exam_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('group_exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('user_exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('admin_deletion_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return json({ success: true });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  // ─── Reset Student Exams & Messages (keep profile) ───
  if (action === 'reset-student-exams') {
    if (user.email !== superAdminEmail) return json({ error: 'Only super admin' }, 403);
    const { targetUserId } = body;
    if (!targetUserId) return json({ error: 'targetUserId required' }, 400);

    try {
      await supabaseAdmin.from('exam_results').delete().eq('user_id', targetUserId);
      await supabaseAdmin.from('exam_history').delete().eq('user_id', targetUserId);
      await supabaseAdmin.from('user_exams').delete().eq('user_id', targetUserId);
      await supabaseAdmin.from('messages').delete().eq('sender_id', targetUserId);
      return json({ success: true });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  // ─── Reset Student Profile (keep credentials, clear personal data) ───
  if (action === 'reset-student-profile') {
    if (user.email !== superAdminEmail) return json({ error: 'Only super admin can reset profiles' }, 403);
    const { targetUserId } = body;
    if (!targetUserId) return json({ error: 'targetUserId required' }, 400);

    const { error } = await supabaseAdmin.from('profiles').update({
      full_name: '',
      department_id: null,
      group_id: null,
      onboarding_complete: false,
    }).eq('user_id', targetUserId);

    if (error) return json({ error: error.message }, 400);
    return json({ success: true });
  }

  // ─── Hard Delete Student (remove profile, credentials, exam data; keep auth for re-login) ───
  if (action === 'delete-student') {
    if (user.email !== superAdminEmail) return json({ error: 'Only super admin can delete students' }, 403);
    const { targetUserId } = body;
    if (!targetUserId) return json({ error: 'targetUserId required' }, 400);

    try {
      // Delete exam-related data
      await supabaseAdmin.from('exam_results').delete().eq('user_id', targetUserId);
      await supabaseAdmin.from('exam_history').delete().eq('user_id', targetUserId);
      await supabaseAdmin.from('user_exams').delete().eq('user_id', targetUserId);
      await supabaseAdmin.from('messages').delete().eq('sender_id', targetUserId);

      // Hard delete the profile — on next login, handle_new_user trigger won't fire
      // since auth user still exists, so we reset it instead
      await supabaseAdmin.from('profiles').update({
        full_name: '',
        department_id: null,
        group_id: null,
        onboarding_complete: false,
      }).eq('user_id', targetUserId);

      return json({ success: true });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  // ─── Cleanup hidden/lingering students (reset all profiles with no onboarding) ───
  if (action === 'cleanup-hidden-students') {
    if (user.email !== superAdminEmail) return json({ error: 'Only super admin' }, 403);
    try {
      // Find profiles that have personal data but onboarding_complete=false (lingering)
      const { data: lingering } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name')
        .eq('onboarding_complete', false)
        .neq('full_name', '');

      if (lingering && lingering.length > 0) {
        for (const p of lingering) {
          await supabaseAdmin.from('profiles').update({
            full_name: '',
            department_id: null,
            group_id: null,
          }).eq('user_id', p.user_id);
        }
      }

      return json({ success: true, cleaned: lingering?.length || 0 });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  return json({ error: 'Unknown action' }, 400);
});
