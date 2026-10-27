-- Physiology Practical Record: core schema

do $$ begin
  create type public.app_role as enum ('student','faculty','admin');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------- tables
create table if not exists public.batches (
  id text primary key,
  name text not null,
  roll_range text,
  student_count int not null default 0,
  mentor text,
  venue text,
  created_at timestamptz not null default now()
);

create table if not exists public.practicals (
  code text primary key,
  seq int not null,
  title text not null,
  category text not null,
  type text not null,
  active boolean not null default true
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  roll_number text,
  register_number text,
  admission_year int,
  academic_phase text,
  designation text,
  department text,
  batch_id text references public.batches(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table if not exists public.sessions (
  id text primary key,
  batch_id text references public.batches(id) on delete set null,
  practical_code text references public.practicals(code) on delete set null,
  session_date date not null,
  topic text not null,
  venue text,
  faculty_name text,
  faculty_id uuid references public.profiles(user_id) on delete set null,
  status text not null default 'Scheduled'
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  practical_code text not null references public.practicals(code),
  session_id text references public.sessions(id) on delete set null,
  status text not null default 'pending',
  marks int,
  max_marks int not null default 20,
  remarks text,
  page_no int,
  entry jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(user_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, practical_code)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'Scheduled',
  marked_by uuid references public.profiles(user_id) on delete set null,
  marked_at timestamptz,
  unique (session_id, student_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete cascade,
  audience public.app_role,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  action_view text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practicals TO authenticated;
GRANT ALL ON public.practicals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- ------------------------------------------------------------------- rls
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------- role check fn
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- ---------------------------------------------------- profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id, full_name, email, phone, roll_number, register_number,
    admission_year, academic_phase, designation, department
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(coalesce(new.email,''), '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'roll_number',
    new.raw_user_meta_data->>'register_number',
    nullif(coalesce(new.raw_user_meta_data->>'admission_year',''), '')::int,
    new.raw_user_meta_data->>'academic_phase',
    new.raw_user_meta_data->>'designation',
    new.raw_user_meta_data->>'department'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------ first-time role claim
create or replace function public.claim_own_role(_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid()) then
    raise exception 'A role has already been assigned to this account';
  end if;
  if _role = 'admin' then
    raise exception 'Administrator access must be granted by an administrator';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), _role);
end;
$$;

GRANT EXECUTE ON FUNCTION public.claim_own_role(public.app_role) TO authenticated;

-- -------------------------------------------------------------- policies
drop policy if exists "Authenticated read batches" on public.batches;
create policy "Authenticated read batches" on public.batches
  for select to authenticated using (true);
drop policy if exists "Admin writes batches" on public.batches;
create policy "Admin writes batches" on public.batches
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "Authenticated read practicals" on public.practicals;
create policy "Authenticated read practicals" on public.practicals
  for select to authenticated using (true);
drop policy if exists "Admin writes practicals" on public.practicals;
create policy "Admin writes practicals" on public.practicals
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Faculty and admin read profiles" on public.profiles;
create policy "Faculty and admin read profiles" on public.profiles
  for select to authenticated
  using (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'));
drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile" on public.profiles
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Admin updates any profile" on public.profiles;
create policy "Admin updates any profile" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "Read own roles" on public.user_roles;
create policy "Read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admin reads all roles" on public.user_roles;
create policy "Admin reads all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
drop policy if exists "Admin grants roles" on public.user_roles;
create policy "Admin grants roles" on public.user_roles
  for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "Admin revokes roles" on public.user_roles;
create policy "Admin revokes roles" on public.user_roles
  for delete to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "Authenticated read sessions" on public.sessions;
create policy "Authenticated read sessions" on public.sessions
  for select to authenticated using (true);
drop policy if exists "Faculty and admin write sessions" on public.sessions;
create policy "Faculty and admin write sessions" on public.sessions
  for all to authenticated
  using (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'));

drop policy if exists "Student reads own submissions" on public.submissions;
create policy "Student reads own submissions" on public.submissions
  for select to authenticated using (student_id = auth.uid());
drop policy if exists "Faculty and admin read submissions" on public.submissions;
create policy "Faculty and admin read submissions" on public.submissions
  for select to authenticated
  using (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'));
drop policy if exists "Student creates own submission" on public.submissions;
create policy "Student creates own submission" on public.submissions
  for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "Student updates own submission" on public.submissions;
create policy "Student updates own submission" on public.submissions
  for update to authenticated using (student_id = auth.uid())
  with check (student_id = auth.uid());
drop policy if exists "Faculty and admin update submissions" on public.submissions;
create policy "Faculty and admin update submissions" on public.submissions
  for update to authenticated
  using (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'));
drop policy if exists "Student deletes own submission" on public.submissions;
create policy "Student deletes own submission" on public.submissions
  for delete to authenticated using (student_id = auth.uid());

drop policy if exists "Student reads own attendance" on public.attendance;
create policy "Student reads own attendance" on public.attendance
  for select to authenticated using (student_id = auth.uid());
drop policy if exists "Faculty and admin read attendance" on public.attendance;
create policy "Faculty and admin read attendance" on public.attendance
  for select to authenticated
  using (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'));
drop policy if exists "Faculty and admin write attendance" on public.attendance;
create policy "Faculty and admin write attendance" on public.attendance
  for all to authenticated
  using (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'));

drop policy if exists "Read own or role notifications" on public.notifications;
create policy "Read own or role notifications" on public.notifications
  for select to authenticated using (
    user_id = auth.uid()
    or (user_id is null and audience is not null and audience = (
      select r.role from public.user_roles r where r.user_id = auth.uid() limit 1
    ))
  );
drop policy if exists "Faculty and admin send notifications" on public.notifications;
create policy "Faculty and admin send notifications" on public.notifications
  for insert to authenticated with check (
    public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin')
  );
drop policy if exists "Mark own notification read" on public.notifications;
create policy "Mark own notification read" on public.notifications
  for update to authenticated using (
    user_id = auth.uid()
    or (user_id is null and audience is not null and audience = (
      select r.role from public.user_roles r where r.user_id = auth.uid() limit 1
    ))
  )
  with check (true);
drop policy if exists "Admin deletes notifications" on public.notifications;
create policy "Admin deletes notifications" on public.notifications
  for delete to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "Authenticated read settings" on public.app_settings;
create policy "Authenticated read settings" on public.app_settings
  for select to authenticated using (true);
drop policy if exists "Admin writes settings" on public.app_settings;
create policy "Admin writes settings" on public.app_settings
  for update to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------------ seed
insert into public.batches (id, name, roll_range, student_count, mentor, venue) values
  ('BATCH-A1','Batch A1 (AY 2026-27)','Roll 001 - 038',38,'Dr. R. Sengupta','Hematology Lab 1'),
  ('BATCH-A2','Batch A2 (AY 2026-27)','Roll 039 - 075',37,'Dr. M. K. Rao','Hematology Lab 2'),
  ('BATCH-B1','Batch B1 (AY 2026-27)','Roll 076 - 112',37,'Dr. Ananya Roy','Clinical Amphitheatre'),
  ('BATCH-B2','Batch B2 (AY 2026-27)','Roll 113 - 150',38,'Dr. Smith R','Clinical Lab 1')
on conflict (id) do nothing;

insert into public.practicals (code, seq, title, category, type) values
  ('PH-EX-001',1,'Study of Compound Microscope & Neubauer Chamber','Hematology','Laboratory'),
  ('PH-EX-002',2,'Total Erythrocyte (RBC) Count by Hemocytometry','Hematology','Laboratory'),
  ('PH-EX-003',3,'Determination of Hemoglobin by Sahli Method','Hematology','Laboratory'),
  ('PH-EX-004',4,'Recording of Arterial Blood Pressure & Postural Variation','Cardiovascular','Clinical'),
  ('PH-EX-005',5,'Clinical Examination of Radial, Femoral & Carotid Pulses','Cardiovascular','Clinical'),
  ('PH-EX-006',6,'Normal 12-Lead Electrocardiogram (ECG)','Cardiovascular','Clinical'),
  ('PH-EX-007',7,'Measurement of Vital Capacity by Spirometry','Respiratory','Laboratory'),
  ('PH-EX-008',8,'Cardiopulmonary Resuscitation (CPR & BLS)','Respiratory','Simulation'),
  ('PH-EX-009',9,'Jugular Venous Pulse (JVP) Examination','Cardiovascular','Clinical'),
  ('PH-EX-010',10,'Deep Tendon Reflexes & Spinal Segment Levels','Nervous','Clinical'),
  ('PH-EX-011',11,'Simple Muscle Twitch & Stimulus Response','Muscle','Simulation'),
  ('PH-EX-012',12,'Muscle Tetanus and Fatigue','Muscle','Simulation')
on conflict (code) do nothing;

insert into public.sessions (id, batch_id, practical_code, session_date, topic, venue, faculty_name, status) values
  ('SES-01','BATCH-B2','PH-EX-001','2026-09-02','Microscope & Neubauer Chamber','Hematology Lab 1','Dr. Vinay Sharma','Completed'),
  ('SES-02','BATCH-B2','PH-EX-002','2026-09-05','Hemocytometer Pipettes & Fluids','Hematology Lab 1','Dr. Vinay Sharma','Completed'),
  ('SES-03','BATCH-B2','PH-EX-002','2026-09-09','RBC Counting Technique','Hematology Lab 1','Dr. R. Sengupta','Completed'),
  ('SES-04','BATCH-B2','PH-EX-003','2026-09-12','WBC Total & Differential Count','Hematology Lab 2','Dr. R. Sengupta','Completed'),
  ('SES-05','BATCH-B2','PH-EX-003','2026-09-16','Sahli Acid Hematin Method','Hematology Lab 2','Dr. Ananya Roy','Completed'),
  ('SES-06','BATCH-B2','PH-EX-005','2026-09-19','Blood Grouping & Rh Typing','Hematology Lab 2','Dr. Ananya Roy','Completed'),
  ('SES-07','BATCH-B2','PH-EX-005','2026-09-23','Radial & Carotid Pulses Examination','Amphitheatre','Dr. Vinay Sharma','Completed'),
  ('SES-08','BATCH-B2','PH-EX-009','2026-09-26','Jugular Venous Pulse (JVP)','Clinical Lab','Dr. Vinay Sharma','Completed'),
  ('SES-09','BATCH-B2','PH-EX-006','2026-09-30','Standard 12-Lead ECG Demonstration','ECG Station','Dr. Vinay Sharma','Completed'),
  ('SES-10','BATCH-B2','PH-EX-010','2026-10-04','Deep Tendon Reflexes Demo','Clinical Lab','Dr. Vinay Sharma','Completed'),
  ('SES-11','BATCH-B2','PH-EX-007','2026-10-07','Vital Capacity & Spirometry','PFT Lab','Dr. Ananya Roy','Completed'),
  ('SES-12','BATCH-B2','PH-EX-008','2026-10-11','Basic Life Support (BLS & CPR)','Simulation Center','Dr. M. K. Rao','Completed'),
  ('SES-13','BATCH-B2','PH-EX-004','2026-10-14','Blood Pressure & Postural Variation','Clinical Lab','Dr. Vinay Sharma','Completed'),
  ('SES-14','BATCH-B2','PH-EX-011','2026-10-16','Simple Muscle Twitch Simulation','Computer Lab','Dr. R. Sengupta','Completed'),
  ('SES-15','BATCH-B2','PH-EX-012','2026-10-21','Muscle Tetanus & Fatigue','Amphitheatre 2','Dr. M. K. Rao','Scheduled')
on conflict (id) do nothing;

insert into public.app_settings (key, value) values
  ('academic_freeze', '{"is_frozen": false, "note": "Term 1 practical records open for Batch B2 (AY 2026-27)."}'::jsonb)
on conflict (key) do nothing;

insert into public.notifications (audience, title, message, type, action_view)
select * from (values
  ('student'::public.app_role,'Welcome to the Digital Physiology Practical Record','Your MBBS Phase I practical journal is now online. Record each experiment on the day of the session and submit it for faculty review.','info','dashboard-overview'),
  ('student'::public.app_role,'Correction Requested: Normal 12-Lead ECG','Dr. Vinay Sharma returned Practical 06: Recalculate QRS frontal axis from Lead I and III.','warning','practical-entry'),
  ('student'::public.app_role,'Correction Requested: Deep Tendon Reflexes','Dr. Vinay Sharma noted: Include spinal cord segment levels in your inference notes.','warning','practical-entry'),
  ('student'::public.app_role,'Session Scheduled: Muscle Tetanus & Fatigue','Session 15 on 21-Oct-2026 in Amphitheatre 2 with Dr. M. K. Rao. Attendance is compulsory.','info','attendance'),
  ('faculty'::public.app_role,'Submission Queue','3 practical records are awaiting your review in Batch B2 (AY 2026-27).','info','reviews-approvals'),
  ('admin'::public.app_role,'Curriculum Loaded','12 physiology practicals and 4 academic batches are active for AY 2026-27.','success','manage-practicals')
) as v(audience, title, message, type, action_view)
where not exists (select 1 from public.notifications);