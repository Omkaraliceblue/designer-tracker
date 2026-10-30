-- Designer Tracker – Supabase (PostgreSQL) schema
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run

create extension if not exists "pgcrypto";

-- ========== PROFILES (one per login user) ==========
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  mobile      text,
  email       text not null,
  job_role    text,
  team_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- auto-create a profile when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== DESIGNERS ==========
create table public.designers (
  id          bigint generated always as identity primary key,
  name        text not null,
  job_role    text not null check (job_role in
              ('Joiner Product Designer','Associate Product Designer','Product Designer','Senior Product Designer')),
  email       text not null unique,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ========== TASKS ==========
create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  designer_id    bigint not null references public.designers(id),
  name           text not null,
  description    text,
  status         text not null default 'Pending'
                 check (status in ('Pending','In progress','In review','Completed')),
  priority       text not null default 'Medium' check (priority in ('Low','Medium','High')),
  start_date     date not null default current_date,
  due_date       date not null,
  attachment_url text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.tasks (owner_id, status);
create index on public.tasks (designer_id);

-- ========== CHATS ==========
create table public.chats (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  type        text not null check (type in ('individual','group')),
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
-- designers taking part in a chat (1 for individual, many for group)
create table public.chat_members (
  chat_id      uuid references public.chats(id) on delete cascade,
  designer_id  bigint references public.designers(id) on delete cascade,
  primary key (chat_id, designer_id)
);
create table public.messages (
  id                  bigint generated always as identity primary key,
  chat_id             uuid not null references public.chats(id) on delete cascade,
  sender_id           uuid references public.profiles(id),      -- set when the dashboard user sends
  sender_designer_id  bigint references public.designers(id),   -- set when a designer sends
  body                text not null check (length(body) between 1 and 4000),
  created_at          timestamptz not null default now(),
  check ((sender_id is null) <> (sender_designer_id is null))
);
create index on public.messages (chat_id, created_at);
-- per-user unread tracking
create table public.chat_reads (
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade default auth.uid(),
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- ========== NOTIFICATIONS (bell icon) ==========
create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  chat_id    uuid references public.chats(id) on delete set null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== USER SETTINGS ==========
create table public.user_settings (
  user_id       uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  dark_mode     boolean not null default false,
  email_notify  boolean not null default true,
  sound_alerts  boolean not null default false
);

-- ========== updated_at trigger ==========
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_profiles_upd before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_tasks_upd    before update on public.tasks    for each row execute function public.touch_updated_at();

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles       enable row level security;
alter table public.designers      enable row level security;
alter table public.tasks          enable row level security;
alter table public.chats          enable row level security;
alter table public.chat_members   enable row level security;
alter table public.messages       enable row level security;
alter table public.chat_reads     enable row level security;
alter table public.notifications  enable row level security;
alter table public.user_settings  enable row level security;

create policy "own profile"      on public.profiles      for all    to authenticated using (id = auth.uid())      with check (id = auth.uid());
create policy "read designers"   on public.designers     for select to authenticated using (true);
create policy "own tasks"        on public.tasks         for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own chats"        on public.chats         for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own chat members" on public.chat_members  for all    to authenticated
  using (exists (select 1 from public.chats c where c.id = chat_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.chats c where c.id = chat_id and c.owner_id = auth.uid()));
create policy "own messages"     on public.messages      for all    to authenticated
  using (exists (select 1 from public.chats c where c.id = chat_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.chats c where c.id = chat_id and c.owner_id = auth.uid()));
create policy "own reads"        on public.chat_reads    for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifs"       on public.notifications for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own settings"     on public.user_settings for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========== STORAGE (avatars + task attachments) ==========
insert into storage.buckets (id, name, public) values ('avatars','avatars',true), ('attachments','attachments',false)
  on conflict do nothing;
create policy "avatars public read"  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars own upload"   on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own update"   on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attach own all"       on storage.objects for all to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ========== REALTIME for live chat ==========
alter publication supabase_realtime add table public.messages;

-- ========== SEED: designers ==========
insert into public.designers (name, job_role, email, avatar_url) values
 ('Omar Mehri','Senior Product Designer','omar.mehri@aliceblue.com','https://i.pravatar.cc/300?img=12'),
 ('Layla Samuel','Product Designer','layla.samuel@aliceblue.com','https://i.pravatar.cc/300?img=47'),
 ('Draper Timothy','Senior Product Designer','draper.timothy@aliceblue.com','https://i.pravatar.cc/300?img=15'),
 ('Mariam Shah','Associate Product Designer','mariam.shah@aliceblue.com','https://i.pravatar.cc/300?img=44'),
 ('Arjun Rao','Joiner Product Designer','arjun.rao@aliceblue.com','https://i.pravatar.cc/300?img=33'),
 ('Priya Nair','Product Designer','priya.nair@aliceblue.com','https://i.pravatar.cc/300?img=49'),
 ('Karthik S','Associate Product Designer','karthik.s@aliceblue.com','https://i.pravatar.cc/300?img=53'),
 ('Sana Iqbal','Joiner Product Designer','sana.iqbal@aliceblue.com','https://i.pravatar.cc/300?img=45');
