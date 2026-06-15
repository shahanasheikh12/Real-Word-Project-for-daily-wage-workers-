-- =============================================================================
-- DailyWork — Initial Database Schema
-- Migration: 20260615000000_init_schema.sql
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New Query)
-- =============================================================================

-- =============================================================================
-- TABLE: users
-- Extends auth.users with application-specific fields.
-- The DB trigger below automatically inserts a row here on auth signup.
-- =============================================================================
create table if not exists public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text,
  phone               text,
  role                text default 'worker' check (role in ('worker', 'employer', 'admin')),
  employer_type       text check (employer_type in ('household', 'contractor', 'small_business')),
  location_lat        numeric,
  location_lng        numeric,
  city                text,
  trust_score         numeric default 0,
  id_verified         boolean default false,
  must_change_password boolean default false,
  created_at          timestamptz default now()
);

-- =============================================================================
-- TABLE: worker_profiles
-- Extended profile for users with role = 'worker'.
-- Linked to users via user_id (one-to-one relationship).
-- =============================================================================
create table if not exists public.worker_profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid unique references public.users(id) on delete cascade,
  skills                  text[],
  experience_years        int default 0,
  daily_wage_expectation  numeric,
  availability            text default 'unavailable'
                            check (availability in ('today', 'tomorrow', 'unavailable')),
  profile_photo_url       text,
  id_photo_url            text,
  ai_inferred_skills      text[],
  reliability_score       numeric default 0,
  created_at              timestamptz default now()
);

-- =============================================================================
-- TABLE: jobs
-- Job postings created by employers.
-- =============================================================================
create table if not exists public.jobs (
  id                    uuid primary key default gen_random_uuid(),
  employer_id           uuid references public.users(id) on delete set null,
  title                 text not null,
  description           text,
  skill_required        text,
  location_lat          numeric,
  location_lng          numeric,
  city                  text,
  job_date              date,
  duration              text check (duration in ('half_day', 'full_day', 'multi_day')),
  workers_needed        int default 1,
  pay_offered           numeric,
  ai_suggested_wage_min numeric,
  ai_suggested_wage_max numeric,
  status                text default 'open'
                          check (status in ('open', 'filled', 'completed', 'cancelled')),
  fraud_score           numeric default 0,
  created_at            timestamptz default now()
);

-- =============================================================================
-- TABLE: applications
-- Worker applications to jobs (both manual and AI-matched).
-- =============================================================================
create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references public.jobs(id) on delete cascade,
  worker_id   uuid references public.users(id) on delete cascade,
  match_type  text check (match_type in ('ai_matched', 'manual_apply')),
  status      text default 'pending'
                check (status in ('pending', 'confirmed', 'declined', 'completed')),
  applied_at  timestamptz default now()
);

-- =============================================================================
-- TABLE: ratings
-- Post-job ratings submitted by both workers and employers.
-- Both parties rate each other after a job is completed.
-- =============================================================================
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid references public.jobs(id) on delete cascade,
  rater_id   uuid references public.users(id) on delete cascade,
  ratee_id   uuid references public.users(id) on delete cascade,
  score      int check (score between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- Prevent duplicate ratings: one rating per rater per job
create unique index if not exists ratings_unique_rater_job
  on public.ratings (job_id, rater_id);

-- =============================================================================
-- TRIGGER: on_auth_user_created
-- Automatically inserts a row in public.users when a new Supabase auth user
-- registers. Reads 'name', 'phone', and 'role' from raw_user_meta_data
-- (passed via supabase.auth.signUp options.data).
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'worker')
  );
  return new;
end;
$$;

-- Drop if exists so the migration is idempotent
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables, then define policies.
-- =============================================================================

alter table public.users          enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.jobs           enable row level security;
alter table public.applications   enable row level security;
alter table public.ratings        enable row level security;

-- ─── Helpers ────────────────────────────────────────────────────────────────
-- Helper function: returns the role of the currently logged-in user.
create or replace function public.my_role()
returns text
language sql stable
security definer set search_path = ''
as $$
  select role from public.users where id = auth.uid();
$$;

-- =============================================================================
-- POLICIES: users table
-- =============================================================================

-- 1. Users can read their own row
create policy "users_select_own"
  on public.users for select
  using (id = auth.uid());

-- 2. Admin can read all users
create policy "users_select_admin"
  on public.users for select
  using (public.my_role() = 'admin');

-- 3. Users can update only their own row
create policy "users_update_own"
  on public.users for update
  using (id = auth.uid());

-- =============================================================================
-- POLICIES: worker_profiles table
-- =============================================================================

-- 1. Workers can read and update only their own profile
create policy "worker_profiles_select_own"
  on public.worker_profiles for select
  using (user_id = auth.uid());

create policy "worker_profiles_insert_own"
  on public.worker_profiles for insert
  with check (user_id = auth.uid());

create policy "worker_profiles_update_own"
  on public.worker_profiles for update
  using (user_id = auth.uid());

-- 2. Employers can read all worker profiles (for hiring)
create policy "worker_profiles_select_employers"
  on public.worker_profiles for select
  using (public.my_role() in ('employer', 'admin'));

-- =============================================================================
-- POLICIES: jobs table
-- =============================================================================

-- 1. Anyone (including anonymous) can read open jobs
create policy "jobs_select_open"
  on public.jobs for select
  using (status = 'open' or employer_id = auth.uid() or public.my_role() = 'admin');

-- 2. Only employers can insert jobs
create policy "jobs_insert_employer"
  on public.jobs for insert
  with check (public.my_role() = 'employer' and employer_id = auth.uid());

-- 3. Only the employer who created it (or admin) can update/delete
create policy "jobs_update_own"
  on public.jobs for update
  using (employer_id = auth.uid() or public.my_role() = 'admin');

create policy "jobs_delete_own"
  on public.jobs for delete
  using (employer_id = auth.uid() or public.my_role() = 'admin');

-- =============================================================================
-- POLICIES: applications table
-- =============================================================================

-- 1. Workers see their own applications
create policy "applications_select_worker"
  on public.applications for select
  using (worker_id = auth.uid());

-- 2. Employers see applications for their jobs
create policy "applications_select_employer"
  on public.applications for select
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
  );

-- 3. Admin sees all
create policy "applications_select_admin"
  on public.applications for select
  using (public.my_role() = 'admin');

-- 4. Workers can apply (insert) to any open job
create policy "applications_insert_worker"
  on public.applications for insert
  with check (public.my_role() = 'worker' and worker_id = auth.uid());

-- 5. Employers can update application status (confirm/decline)
create policy "applications_update_employer"
  on public.applications for update
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

-- =============================================================================
-- POLICIES: ratings table
-- =============================================================================

-- 1. Anyone can read ratings (trust/transparency)
create policy "ratings_select_all"
  on public.ratings for select
  using (true);

-- 2. Authenticated users can insert a rating (only once per job, enforced by unique index)
create policy "ratings_insert_authenticated"
  on public.ratings for insert
  with check (auth.uid() is not null and rater_id = auth.uid());

-- No UPDATE or DELETE allowed for ratings (immutable trust system)

-- =============================================================================
-- SUPABASE STORAGE
-- Create the 'worker-documents' bucket for profile photos and ID uploads.
-- Run this separately if needed — or create via Supabase Dashboard > Storage.
-- =============================================================================

-- Note: Storage bucket creation cannot be done via SQL migration in Supabase.
-- Please create the bucket manually via:
--   Supabase Dashboard → Storage → New Bucket
--   Name: worker-documents
--   Public: true (so profile photos are publicly viewable)

-- =============================================================================
-- ADMIN SEED
-- After registering admin@dailywork.com via the Supabase Auth Dashboard,
-- run this to elevate the account to admin and trigger password change on login.
-- =============================================================================

-- Run this AFTER creating the admin user via Supabase Auth Dashboard:
-- Email: admin@dailywork.com, Password: ChangeMe123!
update public.users
set
  role = 'admin',
  must_change_password = true
where id = (
  select id from auth.users where email = 'admin@dailywork.com'
);
