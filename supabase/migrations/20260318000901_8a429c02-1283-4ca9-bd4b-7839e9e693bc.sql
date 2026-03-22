
-- Admins table
CREATE TABLE public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.admins (email) VALUES ('atuimtahanportali@gmail.com');

-- is_admin function for RLS
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admins a JOIN auth.users u ON u.email = a.email WHERE u.id = _user_id) $$;

-- check_is_admin for client RPC
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_admin(auth.uid()) $$;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_select" ON public.admins FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admins_insert" ON public.admins FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins_delete" ON public.admins FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dept_select" ON public.departments FOR SELECT TO authenticated USING (true);
INSERT INTO public.departments (name) VALUES 
  ('Nəqliyyat və sənaye texnologiyaları'),
  ('Qida mühəndisliyi'),
  ('Avtomatika, telekommunikasiya və informatika'),
  ('İqtisadiyyat və idarəetmə'),
  ('Turizm');

-- Groups
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, department_id)
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert" ON public.groups FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "groups_delete" ON public.groups FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Update profiles with department/group/onboarding
ALTER TABLE public.profiles 
  ADD COLUMN department_id uuid REFERENCES public.departments(id),
  ADD COLUMN group_id uuid REFERENCES public.groups(id),
  ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;

CREATE POLICY "admins_view_profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Group exams (admin-assigned)
CREATE TABLE public.group_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_type text NOT NULL DEFAULT 'test',
  question_count integer NOT NULL DEFAULT 0,
  questions_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_exams_select" ON public.group_exams FOR SELECT TO authenticated 
  USING (group_id IN (SELECT p.group_id FROM public.profiles p WHERE p.user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "group_exams_insert" ON public.group_exams FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "group_exams_delete" ON public.group_exams FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Exam results (official monitoring)
CREATE TABLE public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_name text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT 'test',
  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  unanswered_count integer NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  score numeric,
  is_official boolean NOT NULL DEFAULT false,
  answers_data jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_select" ON public.exam_results FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "results_insert" ON public.exam_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
