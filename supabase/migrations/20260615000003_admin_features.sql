-- =============================================================================
-- Migration: 20260615000003_admin_features.sql
-- Add status column to users and allow admins to update users.
-- =============================================================================

alter table public.users
add column if not exists status text default 'active' check (status in ('active', 'suspended'));

-- Allow admins to update users (e.g. to toggle id_verified and status)
create policy "users_update_admin"
  on public.users for update
  using (public.my_role() = 'admin');
