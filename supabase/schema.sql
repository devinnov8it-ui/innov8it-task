-- Innov8IT Task Manager Supabase bootstrap.
-- Run this once in the Supabase SQL Editor as the project owner.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "users upload own avatars" on storage.objects;
drop policy if exists "users update own avatars" on storage.objects;
drop policy if exists "users delete own avatars" on storage.objects;
create policy "users upload own avatars" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "users update own avatars" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text))
with check (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));
create policy "users delete own avatars" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));
drop policy if exists "everyone read avatars" on storage.objects;
create policy "everyone read avatars" on storage.objects
for select to public
using (bucket_id = 'avatars');

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('OWNER', 'ADMIN', 'MEMBER');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_status' and typnamespace = 'public'::regnamespace) then
    create type public.project_status as enum ('PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status' and typnamespace = 'public'::regnamespace) then
    create type public.task_status as enum ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority' and typnamespace = 'public'::regnamespace) then
    create type public.task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  end if;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, email text not null unique, avatar text,
  role public.user_role not null default 'MEMBER',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(), name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, role public.user_role not null default 'MEMBER',
  created_at timestamptz not null default now(), unique (workspace_id, user_id)
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, description text, status public.project_status not null default 'PLANNING',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, description text, status public.task_status not null default 'TODO', priority public.task_priority not null default 'MEDIUM',
  due_date timestamptz, created_by_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.tasks drop constraint if exists tasks_created_by_id_fkey;
alter table public.tasks add constraint tasks_created_by_id_fkey foreign key (created_by_id) references public.users(id) on delete cascade;
create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_by_id uuid references public.users(id) on delete set null,
  status text not null default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')),
  progress integer not null default 0,
  created_at timestamptz not null default now(), unique (task_id, user_id)
);
alter table public.task_assignees add column if not exists assigned_by_id uuid references public.users(id) on delete set null;
alter table public.task_assignees add column if not exists status text not null default 'TODO';
alter table public.task_assignees add column if not exists progress integer not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'task_assignees_progress_check') then
    alter table public.task_assignees add constraint task_assignees_progress_check check (progress >= 0 and progress <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'task_assignees_status_check') then
    alter table public.task_assignees add constraint task_assignees_status_check check (status in ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'));
  end if;
end $$;
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, content text not null,
  mentions text[] not null default '{}', attachment_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.comments add column if not exists mentions text[] not null default '{}';
alter table public.comments add column if not exists attachment_url text;
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, emoji text not null,
  created_at timestamptz not null default now(), unique (comment_id, user_id, emoji)
);
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, action text not null, created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  title text not null, message text not null, is_read boolean not null default false, created_at timestamptz not null default now()
);

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists projects_workspace_status_idx on public.projects(workspace_id, status);
create index if not exists tasks_project_status_idx on public.tasks(project_id, status);
create index if not exists tasks_project_due_date_idx on public.tasks(project_id, due_date);
create index if not exists task_assignees_user_id_idx on public.task_assignees(user_id);
create index if not exists task_assignees_assigned_by_id_idx on public.task_assignees(assigned_by_id);
create index if not exists comments_task_created_at_idx on public.comments(task_id, created_at);
create index if not exists comment_reactions_comment_id_idx on public.comment_reactions(comment_id);
create index if not exists activity_logs_task_created_at_idx on public.activity_logs(task_id, created_at);
create index if not exists notifications_user_read_created_at_idx on public.notifications(user_id, is_read, created_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['tasks', 'task_assignees', 'comments', 'activity_logs', 'notifications', 'projects'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, email)
  values (new.id, new.raw_user_meta_data ->> 'name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces
    where id = target_workspace_id and owner_id = auth.uid()
  );
$$;
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;
create or replace function public.can_access_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.id = target_task_id
      and (public.is_workspace_owner(p.workspace_id) or public.is_workspace_member(p.workspace_id))
  );
$$;
create or replace function public.ensure_workspace_membership()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  select w.id, auth.uid(), 'MEMBER'::public.user_role
  from public.workspaces w
  where w.owner_id <> auth.uid()
  on conflict (workspace_id, user_id) do nothing;
end;
$$;
grant execute on function public.ensure_workspace_membership() to authenticated;

-- Backfill profiles for any accounts created before the auth trigger existed.
insert into public.users (id, name, email)
select
  id,
  raw_user_meta_data ->> 'name',
  email
from auth.users
where email is not null
on conflict (id) do nothing;
drop trigger if exists set_users_updated_at on public.users;
drop trigger if exists set_workspaces_updated_at on public.workspaces;
drop trigger if exists set_projects_updated_at on public.projects;
drop trigger if exists set_tasks_updated_at on public.tasks;
drop trigger if exists set_comments_updated_at on public.comments;
drop trigger if exists on_auth_user_created on auth.users;
create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_comments_updated_at before update on public.comments for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users read own profile" on public.users;
drop policy if exists "members read workspace profiles" on public.users;
drop policy if exists "users update own profile" on public.users;
drop policy if exists "members read workspaces" on public.workspaces;
drop policy if exists "users create workspaces" on public.workspaces;
drop policy if exists "owners manage workspaces" on public.workspaces;
drop policy if exists "owners delete workspaces" on public.workspaces;
drop policy if exists "members read membership" on public.workspace_members;
drop policy if exists "owners manage membership" on public.workspace_members;
drop policy if exists "members read projects" on public.projects;
drop policy if exists "owners manage projects" on public.projects;
drop policy if exists "members read tasks" on public.tasks;
drop policy if exists "members update tasks" on public.tasks;
drop policy if exists "owners manage tasks" on public.tasks;
drop policy if exists "users manage notifications" on public.notifications;
drop policy if exists "users read own task assignments" on public.task_assignees;
drop policy if exists "members read task assignments" on public.task_assignees;
drop policy if exists "task creators assign themselves" on public.task_assignees;
drop policy if exists "task creators assign workspace members" on public.task_assignees;
drop policy if exists "members read comments" on public.comments;
drop policy if exists "members create comments" on public.comments;
drop policy if exists "authors update comments" on public.comments;
drop policy if exists "authors delete comments" on public.comments;
drop policy if exists "members read comment reactions" on public.comment_reactions;
drop policy if exists "users manage own comment reactions" on public.comment_reactions;
drop policy if exists "members read activity" on public.activity_logs;
drop policy if exists "members create activity" on public.activity_logs;

create policy "users read own profile" on public.users for select to authenticated using (id = auth.uid());
create policy "members read workspace profiles" on public.users for select to authenticated using (
  exists (
    select 1
    from public.workspace_members viewer
    join public.workspace_members target on target.workspace_id = viewer.workspace_id
    where viewer.user_id = auth.uid()
      and target.user_id = users.id
  )
  or exists (
    select 1
    from public.workspaces w
    where w.owner_id = auth.uid()
      and (w.owner_id = users.id or exists (select 1 from public.workspace_members wm where wm.workspace_id = w.id and wm.user_id = users.id))
  )
);
create policy "users update own profile" on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "members read workspaces" on public.workspaces for select to authenticated using (owner_id = auth.uid() or public.is_workspace_member(id));
create policy "users create workspaces" on public.workspaces for insert to authenticated with check (owner_id = auth.uid());
create policy "owners manage workspaces" on public.workspaces for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete workspaces" on public.workspaces for delete to authenticated using (owner_id = auth.uid());
create policy "members read membership" on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id));
create policy "owners manage membership" on public.workspace_members for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "members read projects" on public.projects for select to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()) or exists (select 1 from public.workspaces w where w.id = projects.workspace_id and w.owner_id = auth.uid()));
create policy "owners manage projects" on public.projects for all to authenticated using (exists (select 1 from public.workspaces w where w.id = projects.workspace_id and w.owner_id = auth.uid())) with check (exists (select 1 from public.workspaces w where w.id = projects.workspace_id and w.owner_id = auth.uid()));
create policy "members read tasks" on public.tasks for select to authenticated using (exists (select 1 from public.projects p join public.workspace_members wm on wm.workspace_id = p.workspace_id where p.id = tasks.project_id and wm.user_id = auth.uid()) or exists (select 1 from public.projects p join public.workspaces w on w.id = p.workspace_id where p.id = tasks.project_id and w.owner_id = auth.uid()));
create policy "members update tasks" on public.tasks for update to authenticated using (public.can_access_task(id)) with check (public.can_access_task(id));
create policy "owners manage tasks" on public.tasks for all to authenticated using (exists (select 1 from public.projects p join public.workspaces w on w.id = p.workspace_id where p.id = tasks.project_id and w.owner_id = auth.uid())) with check (exists (select 1 from public.projects p join public.workspaces w on w.id = p.workspace_id where p.id = tasks.project_id and w.owner_id = auth.uid()));
create policy "users manage notifications" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members read task assignments" on public.task_assignees for select to authenticated using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_task(t.id)
  )
);
create policy "task creators assign workspace members" on public.task_assignees for insert to authenticated with check (
  exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.id = task_id
      and t.created_by_id = auth.uid()
      and (
        user_id = auth.uid()
        or exists (select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = task_assignees.user_id)
        or exists (select 1 from public.workspaces w where w.id = p.workspace_id and w.owner_id = task_assignees.user_id)
      )
  )
);
create policy "members read comments" on public.comments for select to authenticated using (public.can_access_task(task_id));
create policy "members create comments" on public.comments for insert to authenticated with check (user_id = auth.uid() and public.can_access_task(task_id));
create policy "authors update comments" on public.comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "authors delete comments" on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "members read comment reactions" on public.comment_reactions for select to authenticated using (exists (select 1 from public.comments c where c.id = comment_id and public.can_access_task(c.task_id)));
create policy "users manage own comment reactions" on public.comment_reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.comments c where c.id = comment_id and public.can_access_task(c.task_id)));
create policy "members read activity" on public.activity_logs for select to authenticated using (public.can_access_task(task_id));
create policy "members create activity" on public.activity_logs for insert to authenticated with check (user_id = auth.uid() and public.can_access_task(task_id));
