-- Inkstructs core schema
-- Run in order: 0001_schema.sql -> 0002_rls.sql -> 0003_functions.sql

create extension if not exists "pgcrypto";

-- ========== Identity ==========

do $$ begin
  create type user_role as enum ('admin', 'instructor', 'student');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'student',
  avatar_url text,
  bio text,
  phone text,
  created_at timestamptz not null default now()
);

-- ========== Admissions ==========

do $$ begin
  create type application_status as enum ('pending', 'accepted', 'rejected', 'enrolled');
exception when duplicate_object then null;
end $$;

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  course_id uuid,           -- FK added after courses table exists
  cohort_id uuid,           -- FK added after cohorts table exists
  message text,
  status application_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== Content (reusable) ==========

do $$ begin
  create type drip_mode as enum ('none', 'by_date', 'by_completion');
exception when duplicate_object then null;
end $$;

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  thumbnail_url text,
  level text,
  duration_weeks int not null default 4 check (duration_weeks > 0),
  days_per_week int not null default 5 check (days_per_week > 0 and days_per_week <= 7),
  drip_mode drip_mode not null default 'by_completion',
  price_kobo bigint not null default 0 check (price_kobo >= 0),
  currency text not null default 'NGN',
  is_published boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  week_number int not null check (week_number > 0),
  title text not null,
  summary text,
  unique (course_id, week_number)
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  day_number int not null check (day_number > 0),
  position int not null default 0,
  title text not null,
  description text,
  is_required boolean not null default true
);

do $$ begin
  create type lesson_type as enum ('video', 'document', 'image', 'text', 'link', 'assignment', 'live');
exception when duplicate_object then null;
end $$;

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  position int not null default 0,
  title text not null,
  type lesson_type not null,
  content_text text,
  external_url text,       -- meeting links, YouTube/Vimeo, live class links
  duration_min int,
  is_required boolean not null default true,
  created_at timestamptz not null default now()
);

do $$ begin
  create type video_source as enum ('mux', 'external_link');
exception when duplicate_object then null;
end $$;

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  storage_path text,               -- Supabase Storage path (documents/images)
  mime_type text,
  size_bytes bigint,
  video_source video_source,
  mux_asset_id text,
  mux_playback_id text,
  mux_upload_id text,
  mux_status text default 'preparing', -- preparing | ready | errored
  created_at timestamptz not null default now()
);

-- ========== Delivery ==========

do $$ begin
  create type cohort_status as enum ('draft', 'open', 'running', 'completed');
exception when duplicate_object then null;
end $$;

create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date,
  capacity int,
  price_kobo bigint not null default 0 check (price_kobo >= 0),
  currency text not null default 'NGN',
  status cohort_status not null default 'draft',
  created_at timestamptz not null default now()
);

do $$ begin
  alter table applications
    add constraint applications_course_fk foreign key (course_id) references courses(id),
    add constraint applications_cohort_fk foreign key (cohort_id) references cohorts(id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create type instructor_cohort_role as enum ('lead', 'assistant');
exception when duplicate_object then null;
end $$;

create table if not exists cohort_instructors (
  cohort_id uuid not null references cohorts(id) on delete cascade,
  instructor_id uuid not null references profiles(id) on delete cascade,
  role instructor_cohort_role not null default 'lead',
  primary key (cohort_id, instructor_id)
);

do $$ begin
  create type enrollment_status as enum ('pending_payment', 'invited', 'active', 'completed', 'paused', 'refunded');
exception when duplicate_object then null;
end $$;

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  cohort_id uuid not null references cohorts(id) on delete cascade,
  status enrollment_status not null default 'pending_payment',
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, cohort_id)
);

create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration_min int not null default 60,
  meeting_url text not null,
  recording_url text,
  created_at timestamptz not null default now()
);

-- ========== Progress ==========

do $$ begin
  create type progress_status as enum ('not_started', 'in_progress', 'complete');
exception when duplicate_object then null;
end $$;

create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table if not exists module_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  status progress_status not null default 'not_started',
  completed_at timestamptz,
  unique (student_id, module_id)
);

-- ========== Assessment ==========

do $$ begin
  create type submission_status as enum ('submitted', 'graded', 'resubmit');
exception when duplicate_object then null;
end $$;

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  file_url text,
  text_answer text,
  status submission_status not null default 'submitted',
  grade numeric,
  feedback text,
  graded_by uuid references profiles(id),
  graded_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== Payments (Paystack, NGN, full payment) ==========

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null;
end $$;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  provider text not null default 'paystack',
  provider_ref text not null unique,
  amount_kobo bigint not null check (amount_kobo >= 0),
  currency text not null default 'NGN',
  status payment_status not null default 'pending',
  paid_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off int check (percent_off between 1 and 100),
  amount_off_kobo bigint,
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== Certificates ==========

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  cohort_id uuid not null references cohorts(id) on delete cascade,
  verification_code text not null unique,
  pdf_path text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  issued_by uuid references profiles(id)
);

-- ========== Communication ==========

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  author_id uuid not null references profiles(id),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ========== Indexes ==========

create index if not exists idx_weeks_course on weeks(course_id);
create index if not exists idx_modules_week on modules(week_id);
create index if not exists idx_lessons_module on lessons(module_id);
create index if not exists idx_assets_lesson on assets(lesson_id);
create index if not exists idx_cohorts_course on cohorts(course_id);
create index if not exists idx_enrollments_student on enrollments(student_id);
create index if not exists idx_enrollments_cohort on enrollments(cohort_id);
create index if not exists idx_lesson_progress_student on lesson_progress(student_id);
create index if not exists idx_lesson_progress_lesson on lesson_progress(lesson_id);
create index if not exists idx_module_progress_student on module_progress(student_id);
create index if not exists idx_module_progress_module on module_progress(module_id);
create index if not exists idx_payments_enrollment on payments(enrollment_id);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_cohort_instructors_instructor on cohort_instructors(instructor_id);
create index if not exists idx_announcements_cohort on announcements(cohort_id);
create index if not exists idx_live_sessions_cohort on live_sessions(cohort_id);

