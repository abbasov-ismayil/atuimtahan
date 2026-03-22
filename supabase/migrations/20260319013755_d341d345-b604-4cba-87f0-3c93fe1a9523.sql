
-- user_credentials table for Excel-based auth tracking
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  auth_user_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creds_admin_select" ON public.user_credentials FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "creds_admin_insert" ON public.user_credentials FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "creds_admin_delete" ON public.user_credentials FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "creds_admin_update" ON public.user_credentials FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- messages table for real-time chat
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid,
  exam_result_id uuid,
  content text NOT NULL,
  is_from_admin boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid() OR is_admin(auth.uid()));

-- admin deletion requests
CREATE TABLE IF NOT EXISTS public.admin_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  admin_email text NOT NULL,
  admin_id uuid NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "del_req_select" ON public.admin_deletion_requests FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "del_req_insert" ON public.admin_deletion_requests FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "del_req_update" ON public.admin_deletion_requests FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "del_req_delete" ON public.admin_deletion_requests FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Update super admin email
UPDATE public.admins SET email = 'atuimtahanportali@atu.edu.az' WHERE email = 'atuimtahanportali@gmail.com';

-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
