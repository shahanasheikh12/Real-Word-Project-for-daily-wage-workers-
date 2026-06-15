-- =============================================================================
-- Phase 7: Notifications & In-App Chat
-- =============================================================================

-- =============================================================================
-- TABLE: notifications
-- =============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications for delete using (user_id = auth.uid());

-- =============================================================================
-- TABLE: messages
-- =============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.messages enable row level security;

-- Users can read messages if they are the worker or the employer for the application
create policy "messages_select_participants" on public.messages for select using (
  exists (
    select 1 from public.applications a
    join public.jobs j on a.job_id = j.id
    where a.id = messages.application_id
      and (a.worker_id = auth.uid() or j.employer_id = auth.uid())
  )
);

-- Users can insert messages if they are the worker or the employer for the application
create policy "messages_insert_participants" on public.messages for insert with check (
  exists (
    select 1 from public.applications a
    join public.jobs j on a.job_id = j.id
    where a.id = messages.application_id
      and (a.worker_id = auth.uid() or j.employer_id = auth.uid())
      and messages.sender_id = auth.uid()
  )
);

-- =============================================================================
-- REALTIME
-- =============================================================================
-- Enable realtime for notifications and messages
-- Ensure replication is enabled for these tables
alter table public.notifications replica identity full;
alter table public.messages replica identity full;

-- Supabase realtime requires adding tables to the supabase_realtime publication
begin;
  -- If publication exists, drop to re-create safely or just add table?
  -- Safer to just run:
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.messages;
commit;

-- =============================================================================
-- TRIGGERS: Auto-generate notifications
-- =============================================================================

-- 1. When application created: notify employer
create or replace function notify_employer_on_application() returns trigger as $$
declare
  emp_id uuid;
  j_title text;
begin
  select employer_id, title into emp_id, j_title from public.jobs where id = new.job_id;
  insert into public.notifications (user_id, title, message, link)
  values (emp_id, 'New Application', 'A worker applied to your ' || j_title || ' posting', '/jobs/' || new.job_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_application_created on public.applications;
create trigger on_application_created
  after insert on public.applications
  for each row execute function notify_employer_on_application();

-- 2. When application status changes (confirmed/declined): notify worker
create or replace function notify_worker_on_status_change() returns trigger as $$
declare
  j_title text;
begin
  if old.status is distinct from new.status then
    select title into j_title from public.jobs where id = new.job_id;
    if new.status in ('confirmed', 'declined') then
      insert into public.notifications (user_id, title, message, link)
      values (new.worker_id, 'Application ' || initcap(new.status), 'Your application for ' || j_title || ' was ' || new.status, '/jobs/' || new.job_id);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_application_status_changed on public.applications;
create trigger on_application_status_changed
  after update on public.applications
  for each row execute function notify_worker_on_status_change();

-- 3. When job status changes to completed: notify both to rate
create or replace function notify_users_on_job_completed() returns trigger as $$
begin
  if old.status is distinct from new.status and new.status = 'completed' then
    -- Notify employer
    insert into public.notifications (user_id, title, message, link)
    values (new.employer_id, 'Job Completed', 'Job ' || new.title || ' has been marked as completed — please rate your experience', '/jobs/' || new.id);
    
    -- Notify confirmed workers
    insert into public.notifications (user_id, title, message, link)
    select worker_id, 'Job Completed', 'Job ' || new.title || ' has been marked as completed — please rate your experience', '/jobs/' || new.id
    from public.applications where job_id = new.id and status = 'completed';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_job_status_completed on public.jobs;
create trigger on_job_status_completed
  after update on public.jobs
  for each row execute function notify_users_on_job_completed();
