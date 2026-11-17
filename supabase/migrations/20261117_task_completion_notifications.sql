-- Retain the person who created each assignment so a completion can notify them.
alter table public.tasks
  add column if not exists assigned_by_email text not null default '',
  add column if not exists assigned_by_name text not null default '';

create index if not exists tasks_assigned_by_email_idx
  on public.tasks(assigned_by_email);
