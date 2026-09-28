create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.college_group_key(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(pg_catalog.lower(pg_catalog.btrim(coalesce(name, ''))), '\s+', ' ', 'g'),
    '^((college of|school of|the)\s+)+',
    ''
  );
$$;

revoke all on function private.college_group_key(text) from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  college text not null default '',
  major text not null default '',
  year text,
  bio text not null default '',
  college_key text not null default '',
  inbox_seen_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint profiles_year_check check (
    year is null
    or year in (
      'First year',
      'Second year',
      'Third year',
      'Fourth year or later',
      'Master''s',
      'PhD'
    )
  ),
  constraint profiles_full_name_len check (char_length(full_name) <= 120),
  constraint profiles_college_len check (char_length(college) <= 160),
  constraint profiles_major_len check (char_length(major) <= 160),
  constraint profiles_bio_len check (char_length(bio) <= 2000)
);

create table public.profile_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null
);

create table public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_name text not null,
  kind text not null,
  proficiency text not null,
  experience_notes text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint profile_skills_kind_check check (kind in ('offer', 'want')),
  constraint profile_skills_proficiency_check check (
    proficiency in ('beginner', 'intermediate', 'advanced')
  ),
  constraint profile_skills_name_not_blank check (char_length(pg_catalog.btrim(skill_name)) > 0),
  constraint profile_skills_name_len check (char_length(skill_name) <= 80),
  constraint profile_skills_notes_len check (
    experience_notes is null or char_length(experience_notes) <= 1000
  )
);

create unique index profile_skills_user_kind_name_key
  on public.profile_skills (user_id, kind, lower(pg_catalog.btrim(skill_name)));

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  post_type text not null,
  skill_name text not null,
  title text not null,
  description text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default pg_catalog.now(),
  constraint posts_type_check check (post_type in ('request', 'offer')),
  constraint posts_status_check check (status in ('open', 'closed')),
  constraint posts_title_len check (char_length(title) between 1 and 140),
  constraint posts_description_len check (char_length(description) <= 2000),
  constraint posts_skill_not_blank check (char_length(pg_catalog.btrim(skill_name)) > 0),
  constraint posts_skill_len check (char_length(skill_name) <= 80)
);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint interests_status_check check (status in ('pending', 'accepted', 'declined')),
  constraint interests_distinct_users check (from_user_id <> to_user_id),
  constraint interests_message_len check (message is null or char_length(message) <= 500)
);

create unique index interests_one_active_per_post
  on public.interests (from_user_id, post_id)
  where post_id is not null and status in ('pending', 'accepted');

create unique index interests_one_active_direct
  on public.interests (from_user_id, to_user_id)
  where post_id is null and status in ('pending', 'accepted');

create index profiles_college_key_idx on public.profiles (college_key);
create index profiles_created_at_idx on public.profiles (created_at desc);
create index profile_skills_user_id_idx on public.profile_skills (user_id);
create index profile_skills_skill_name_idx on public.profile_skills (skill_name);
create index posts_user_id_idx on public.posts (user_id);
create index posts_skill_name_idx on public.posts (skill_name);
create index posts_status_created_idx on public.posts (status, created_at desc);
create index interests_from_user_idx on public.interests (from_user_id);
create index interests_to_user_idx on public.interests (to_user_id);
create index interests_post_id_idx on public.interests (post_id);
create index interests_to_status_idx on public.interests (to_user_id, status);

create or replace function private.set_college_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.college_key := private.college_group_key(new.college);
  return new;
end;
$$;

create trigger profiles_set_college_key
before insert or update of college on public.profiles
for each row execute function private.set_college_key();

create or replace function private.copy_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_contacts (user_id, email)
  select new.id, u.email
  from auth.users as u
  where u.id = new.id
    and u.email is not null
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger profiles_copy_contact
after insert on public.profiles
for each row execute function private.copy_profile_contact();

create or replace function private.sync_contact_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profile_contacts
  set email = new.email
  where user_id = new.id
    and new.email is not null;
  return new;
end;
$$;

create trigger auth_users_sync_contact_email
after update of email on auth.users
for each row execute function private.sync_contact_email();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.touch_interest_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.updated_at := pg_catalog.now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create trigger interests_touch_updated_at
before update on public.interests
for each row execute function private.touch_interest_updated_at();

create or replace function private.lock_post_skill_and_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.skill_name is distinct from old.skill_name
     or new.post_type is distinct from old.post_type then
    if exists (
      select 1 from public.interests as i where i.post_id = old.id
    ) then
      raise exception 'Skill and post type stay locked after the first interest';
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_lock_skill_and_type
before update on public.posts
for each row execute function private.lock_post_skill_and_type();

create or replace function private.lock_skill_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.kind is distinct from old.kind
     or pg_catalog.lower(pg_catalog.btrim(new.skill_name))
        is distinct from pg_catalog.lower(pg_catalog.btrim(old.skill_name)) then
    raise exception 'Change proficiency and notes, or remove the skill';
  end if;
  new.skill_name := old.skill_name;
  return new;
end;
$$;

create trigger profile_skills_lock_identity
before update on public.profile_skills
for each row execute function private.lock_skill_identity();

create or replace function private.require_filled_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  filled boolean;
begin
  select
    char_length(pg_catalog.btrim(coalesce(p.full_name, ''))) > 0
    and char_length(pg_catalog.btrim(coalesce(p.college, ''))) > 0
    and char_length(pg_catalog.btrim(coalesce(p.major, ''))) > 0
    and p.year is not null
    and char_length(pg_catalog.btrim(coalesce(p.bio, ''))) > 0
  into filled
  from public.profiles as p
  where p.id = new.user_id;

  if not coalesce(filled, false) then
    raise exception 'Fill in your name, college, major, year, and bio first';
  end if;
  return new;
end;
$$;

create trigger profile_skills_require_profile
before insert on public.profile_skills
for each row execute function private.require_filled_profile();

create trigger posts_require_profile
before insert on public.posts
for each row execute function private.require_filled_profile();

create or replace function private.delete_own_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You need to sign in first';
  end if;

  delete from public.interests
  where from_user_id = v_uid or to_user_id = v_uid;

  delete from public.profile_skills where user_id = v_uid;
  delete from public.posts where user_id = v_uid;
  delete from public.profile_contacts where user_id = v_uid;
  delete from public.profiles where id = v_uid;
end;
$$;

create or replace function public.delete_own_profile()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.delete_own_profile();
end;
$$;

create or replace function public.express_interest(
  p_full_name text,
  p_college text,
  p_major text,
  p_year text,
  p_bio text,
  p_to_user_id uuid,
  p_post_id uuid,
  p_message text,
  p_skills jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_post public.posts%rowtype;
  v_skill jsonb;
  v_name text;
  v_kind text;
  v_prof text;
  v_notes text;
  v_interest_id uuid;
  v_required_kind text;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'You need to sign in first';
  end if;

  if p_to_user_id is null or p_to_user_id = v_uid then
    raise exception 'You cannot express interest in yourself';
  end if;

  if p_post_id is not null then
    select * into v_post from public.posts where id = p_post_id;
    if not found then
      raise exception 'That post is no longer available';
    end if;
    if v_post.user_id = v_uid then
      raise exception 'You cannot express interest in your own post';
    end if;
    if v_post.status <> 'open' then
      raise exception 'This post is closed';
    end if;
    if v_post.user_id <> p_to_user_id then
      raise exception 'That interest does not match the post';
    end if;
    v_required_kind := case when v_post.post_type = 'request' then 'offer' else 'want' end;
  end if;

  insert into public.profiles as pr (id, full_name, college, major, year, bio)
  values (
    v_uid,
    pg_catalog.btrim(coalesce(p_full_name, '')),
    pg_catalog.btrim(coalesce(p_college, '')),
    pg_catalog.btrim(coalesce(p_major, '')),
    nullif(pg_catalog.btrim(coalesce(p_year, '')), ''),
    pg_catalog.btrim(coalesce(p_bio, ''))
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    college = excluded.college,
    major = excluded.major,
    year = excluded.year,
    bio = excluded.bio;

  if p_skills is not null then
    for v_skill in select value from jsonb_array_elements(p_skills)
    loop
      v_count := v_count + 1;
      if v_count > 8 then
        raise exception 'You can add at most 8 skills with one interest';
      end if;

      v_name := pg_catalog.btrim(coalesce(v_skill->>'skill_name', ''));
      v_kind := v_skill->>'kind';
      v_prof := v_skill->>'proficiency';
      v_notes := nullif(pg_catalog.btrim(coalesce(v_skill->>'experience_notes', '')), '');

      if p_post_id is not null and v_kind = v_required_kind then
        v_name := v_post.skill_name;
      end if;

      if v_name = ''
         or v_kind not in ('offer', 'want')
         or v_prof not in ('beginner', 'intermediate', 'advanced') then
        raise exception 'Each new skill needs a name and a proficiency';
      end if;

      if not exists (
        select 1
        from public.profile_skills as s
        where s.user_id = v_uid
          and s.kind = v_kind
          and pg_catalog.lower(pg_catalog.btrim(s.skill_name)) = pg_catalog.lower(pg_catalog.btrim(v_name))
      ) then
        insert into public.profile_skills (user_id, skill_name, kind, proficiency, experience_notes)
        values (v_uid, v_name, v_kind, v_prof, v_notes);
      end if;
    end loop;
  end if;

  if p_post_id is not null and not exists (
    select 1
    from public.profile_skills as s
    where s.user_id = v_uid
      and s.kind = v_required_kind
      and pg_catalog.lower(pg_catalog.btrim(s.skill_name)) = pg_catalog.lower(pg_catalog.btrim(v_post.skill_name))
  ) then
    raise exception 'Add your proficiency for this skill before expressing interest';
  end if;

  insert into public.interests (from_user_id, to_user_id, post_id, message)
  values (
    v_uid,
    p_to_user_id,
    p_post_id,
    nullif(pg_catalog.btrim(coalesce(p_message, '')), '')
  )
  returning id into v_interest_id;

  return v_interest_id;
end;
$$;

create or replace function public.list_discover_posts(
  p_college_key text,
  p_post_type text
)
returns table (
  id uuid,
  user_id uuid,
  post_type text,
  skill_name text,
  title text,
  description text,
  status text,
  created_at timestamptz,
  full_name text,
  college text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.user_id,
    p.post_type,
    p.skill_name,
    p.title,
    p.description,
    p.status,
    p.created_at,
    pr.full_name,
    pr.college
  from public.posts as p
  join public.profiles as pr on pr.id = p.user_id
  where p.status = 'open'
    and (
      p_post_type is null
      or p_post_type = ''
      or p_post_type = 'all'
      or p.post_type = p_post_type
    )
    and (
      p_college_key is null
      or p_college_key = ''
      or pr.college_key = p_college_key
    )
  order by p.created_at desc;
$$;

alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.profile_skills enable row level security;
alter table public.posts enable row level security;
alter table public.interests enable row level security;

revoke all on public.profiles, public.profile_contacts, public.profile_skills, public.posts, public.interests
  from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.profile_contacts to authenticated;
grant select, insert, update, delete on public.profile_skills to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.interests to authenticated;
grant update (status) on public.interests to authenticated;

revoke all on function public.delete_own_profile() from public, anon;
revoke all on function public.express_interest(text, text, text, text, text, uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.list_discover_posts(text, text) from public, anon;
grant execute on function public.delete_own_profile() to authenticated;
grant execute on function public.express_interest(text, text, text, text, text, uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.list_discover_posts(text, text) to authenticated;
grant execute on function private.delete_own_profile() to authenticated;

revoke all on function private.set_college_key() from public, anon, authenticated;
revoke all on function private.copy_profile_contact() from public, anon, authenticated;
revoke all on function private.sync_contact_email() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.touch_interest_updated_at() from public, anon, authenticated;
revoke all on function private.lock_post_skill_and_type() from public, anon, authenticated;
revoke all on function private.lock_skill_identity() from public, anon, authenticated;
revoke all on function private.require_filled_profile() from public, anon, authenticated;

create policy profiles_select on public.profiles
for select to authenticated
using (true);

create policy profiles_insert on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

create policy profiles_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy contacts_select on public.profile_contacts
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.interests as i
    where i.status = 'accepted'
      and (
        (i.from_user_id = (select auth.uid()) and i.to_user_id = profile_contacts.user_id)
        or (i.to_user_id = (select auth.uid()) and i.from_user_id = profile_contacts.user_id)
      )
  )
);

create policy skills_select on public.profile_skills
for select to authenticated
using (true);

create policy skills_insert on public.profile_skills
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy skills_update on public.profile_skills
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy skills_delete on public.profile_skills
for delete to authenticated
using (user_id = (select auth.uid()));

create policy posts_select on public.posts
for select to authenticated
using (status = 'open' or user_id = (select auth.uid()));

create policy posts_insert on public.posts
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy posts_update on public.posts
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy posts_delete on public.posts
for delete to authenticated
using (user_id = (select auth.uid()));

create policy interests_select on public.interests
for select to authenticated
using (
  from_user_id = (select auth.uid())
  or to_user_id = (select auth.uid())
);

create policy interests_insert on public.interests
for insert to authenticated
with check (
  from_user_id = (select auth.uid())
  and from_user_id <> to_user_id
  and (
    post_id is null
    or exists (
      select 1
      from public.posts as p
      where p.id = post_id
        and p.user_id = to_user_id
        and p.user_id <> (select auth.uid())
        and p.status = 'open'
    )
  )
);

create policy interests_update on public.interests
for update to authenticated
using (
  status = 'pending'
  and to_user_id = (select auth.uid())
)
with check (
  status in ('accepted', 'declined')
  and to_user_id = (select auth.uid())
);

create policy interests_delete on public.interests
for delete to authenticated
using (
  from_user_id = (select auth.uid())
  and status = 'pending'
);
