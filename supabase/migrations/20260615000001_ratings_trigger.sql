-- =============================================================================
-- DailyWork — Ratings Trigger
-- Migration: 20260615000001_ratings_trigger.sql
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- 1. Create a function to recalculate the trust_score for a user
create or replace function public.recalculate_trust_score()
returns trigger
language plpgsql
security definer
as $$
declare
  avg_score numeric;
begin
  -- Calculate the new average score for the ratee
  select round(avg(score)::numeric, 1) into avg_score
  from public.ratings
  where ratee_id = new.ratee_id;

  -- Update the users table
  update public.users
  set trust_score = coalesce(avg_score, 0)
  where id = new.ratee_id;

  return new;
end;
$$;

-- 2. Attach the trigger to the ratings table
drop trigger if exists on_rating_inserted on public.ratings;
create trigger on_rating_inserted
  after insert on public.ratings
  for each row execute function public.recalculate_trust_score();
