-- Friends feed redesign: categories, polls, reposts, shares, wide game art, and a wider feed.
-- Applied to project sbunhrxwhraigwpidbxk on 2026-09-18.

begin;

-- 1. A post can carry one category chip.
alter table public.posts
  add column category text;
alter table public.posts
  add constraint posts_category_check
    check (category is null or category in ('trophies', 'questions', 'memes'));

-- 2. Wide art for the feed's game card. The game-artwork edge function fills it from IGDB.
alter table public.games
  add column artwork_url text;

-- 3. Polls. The poll question is the post body.
create table public.post_polls (
  post_id    uuid primary key references public.posts(id) on delete cascade,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.post_poll_options (
  id       uuid primary key default gen_random_uuid(),
  post_id  uuid not null references public.post_polls(post_id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  label    text not null check (length(btrim(label)) between 1 and 40),
  unique (post_id, position),
  -- Lets a vote reference (post_id, option_id), so a vote cannot point at another poll's option.
  unique (post_id, id)
);

create table public.post_poll_votes (
  post_id    uuid not null references public.post_polls(post_id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  option_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  foreign key (post_id, option_id) references public.post_poll_options(post_id, id) on delete cascade
);
create index post_poll_votes_option on public.post_poll_votes (option_id);
create index post_poll_votes_user on public.post_poll_votes (user_id);

-- 4. In-app reposts and out-of-app shares.
create table public.post_reposts (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_reposts_user on public.post_reposts (user_id, created_at desc);

create table public.post_shares (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index post_shares_post on public.post_shares (post_id);

-- 5. Row level security. A poll, a vote or a repost is visible when its post is visible:
--    the subquery on posts runs under the posts policies, which hide blocked authors.
alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;
alter table public.post_reposts enable row level security;
alter table public.post_shares enable row level security;

create policy "polls readable with their post" on public.post_polls
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_polls.post_id));
create policy "own polls insert" on public.post_polls
  for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_polls.post_id and p.author_id = (select auth.uid())));

create policy "poll options readable with their post" on public.post_poll_options
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_poll_options.post_id));
create policy "own poll options insert" on public.post_poll_options
  for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_poll_options.post_id and p.author_id = (select auth.uid())));

create policy "poll votes readable with their post" on public.post_poll_votes
  for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_poll_votes.post_id)
    and not private.shelf_blocked_between((select auth.uid()), post_poll_votes.user_id)
  );
create policy "own poll votes insert while open" on public.post_poll_votes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.post_polls pp where pp.post_id = post_poll_votes.post_id and pp.ends_at > now())
  );
create policy "own poll votes update while open" on public.post_poll_votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.post_polls pp where pp.post_id = post_poll_votes.post_id and pp.ends_at > now())
  );
create policy "own poll votes delete" on public.post_poll_votes
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "reposts readable with their post" on public.post_reposts
  for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_reposts.post_id)
    and not private.shelf_blocked_between((select auth.uid()), post_reposts.user_id)
  );
create policy "own reposts insert" on public.post_reposts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_reposts.post_id));
create policy "own reposts delete" on public.post_reposts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Share rows only feed a count. Nobody reads who shared.
create policy "share rows readable with their post" on public.post_shares
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_shares.post_id));
create policy "own shares insert" on public.post_shares
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_shares.post_id));

grant select, insert on public.post_polls, public.post_poll_options, public.post_shares to authenticated;
grant select, insert, update, delete on public.post_poll_votes to authenticated;
grant select, insert, delete on public.post_reposts to authenticated;

-- 6. One poll as JSON, from the caller's point of view.
--    voters: up to three faces per option. The caller first, then people the caller follows.
create function public.shelf_poll(p_post_id uuid)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select case when pp.post_id is null then null else jsonb_build_object(
    'ends_at', pp.ends_at,
    'total_votes', (select count(*) from post_poll_votes v where v.post_id = pp.post_id),
    'my_option_id', (select v.option_id from post_poll_votes v
                      where v.post_id = pp.post_id and v.user_id = (select auth.uid())),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id,
               'label', o.label,
               'votes', (select count(*) from post_poll_votes v where v.option_id = o.id),
               'voters', coalesce((
                 select jsonb_agg(jsonb_build_object('handle', x.handle, 'avatar_color', x.avatar_color))
                   from (
                     select pr.handle, pr.avatar_color
                       from post_poll_votes v
                       join profiles pr on pr.user_id = v.user_id
                      where v.option_id = o.id
                      order by (v.user_id = (select auth.uid())) desc,
                               exists (select 1 from follows f
                                        where f.follower_id = (select auth.uid())
                                          and f.followee_id = v.user_id) desc,
                               v.created_at desc
                      limit 3
                   ) x), '[]'::jsonb)
             ) order by o.position)
        from post_poll_options o
       where o.post_id = pp.post_id), '[]'::jsonb)
  ) end
    from (select p_post_id as id) q
    left join post_polls pp on pp.post_id = q.id;
$function$;

-- 7. The feed. Without p_handle: the caller's own posts, people they follow, posts those
--    people reposted, friends of friends, and popular posts from the last 14 days across the
--    platform. With p_handle: one author's posts, for a profile page.
--    SECURITY INVOKER: the posts policies hide blocked authors in both directions.
drop function if exists public.shelf_feed(integer, timestamptz, uuid, text);

create function public.shelf_feed(
  p_limit     integer     default 20,
  p_before    timestamptz default null,
  p_before_id uuid        default null,
  p_handle    text        default null
)
returns table (
  id uuid, body text, link_url text, image_path text,
  created_at timestamptz, edited_at timestamptz,
  author_id uuid, handle text, display_name text, avatar_color text,
  category text,
  game_id uuid, game_title text, game_cover text, game_artwork text,
  game_year integer, game_genres text[], game_rating numeric, game_platforms text[],
  poll jsonb,
  like_count bigint, comment_count bigint, repost_count bigint, share_count bigint,
  liked_by_me boolean, reposted_by_me boolean,
  reposted_by_handle text, reposted_by_name text,
  reason text
)
language sql
stable
set search_path to 'public'
as $function$
  with me as (
    select (select auth.uid()) as uid
  ),
  following as (
    select f.followee_id as uid from follows f, me where f.follower_id = me.uid
  ),
  network as (
    select distinct f2.followee_id as uid
      from follows f1
      join follows f2 on f2.follower_id = f1.followee_id
      cross join me
     where f1.follower_id = me.uid
       and f2.followee_id <> me.uid
  ),
  -- The latest repost of each post by someone the caller follows.
  reposts as (
    select distinct on (r.post_id) r.post_id, r.user_id
      from post_reposts r
      join following fo on fo.uid = r.user_id
     order by r.post_id, r.created_at desc
  ),
  popular as (
    select p.id
      from posts p
     where p.created_at > now() - interval '14 days'
       and (select count(*) from post_likes l where l.post_id = p.id)
         + 2 * (select count(*) from post_comments c where c.post_id = p.id)
         + 2 * (select count(*) from post_reposts r where r.post_id = p.id) >= 6
  ),
  scoped as (
    select p.*,
           case
             when p_handle is not null then 'profile'
             when p.author_id = me.uid then 'self'
             when p.author_id in (select uid from following) then 'following'
             when rp.post_id is not null then 'repost'
             when p.author_id in (select uid from network) then 'network'
             else 'popular'
           end as reason,
           case when p.author_id not in (select uid from following) then rp.user_id end as reposter_id
      from posts p
      cross join me
      left join reposts rp on rp.post_id = p.id
     where case
             when p_handle is not null then
               p.author_id = (select pr.user_id from profiles pr where pr.handle = lower(p_handle))
             else p.author_id = me.uid
                  or p.author_id in (select uid from following)
                  or rp.post_id is not null
                  or p.author_id in (select uid from network)
                  or p.id in (select popular.id from popular)
           end
       and (p_before is null
            or (p.created_at, p.id) < (p_before, coalesce(p_before_id, p.id)))
     order by p.created_at desc, p.id desc
     limit least(greatest(p_limit, 1), 50)
  )
  select s.id, s.body, s.link_url, s.image_path, s.created_at, s.edited_at,
         s.author_id, pr.handle, pr.display_name, pr.avatar_color,
         s.category,
         g.id, g.title, g.cover_url, g.artwork_url,
         extract(year from g.release_date)::integer,
         g.genres,
         case when g.critic_score is null then null else round(g.critic_score / 20.0, 1) end,
         (select array_agg(distinct pl.family)
            from game_platforms gp join platforms pl on pl.id = gp.platform_id
           where gp.game_id = g.id and pl.family is not null),
         shelf_poll(s.id),
         (select count(*) from post_likes l where l.post_id = s.id),
         (select count(*) from post_comments c where c.post_id = s.id),
         (select count(*) from post_reposts r where r.post_id = s.id),
         (select count(*) from post_shares sh where sh.post_id = s.id),
         exists (select 1 from post_likes l where l.post_id = s.id and l.user_id = (select auth.uid())),
         exists (select 1 from post_reposts r where r.post_id = s.id and r.user_id = (select auth.uid())),
         rpr.handle, rpr.display_name,
         s.reason
    from scoped s
    join profiles pr on pr.user_id = s.author_id
    left join games g on g.id = s.game_id
    left join profiles rpr on rpr.user_id = s.reposter_id
   order by s.created_at desc, s.id desc;
$function$;

-- 8. Create a post, and its poll, in one transaction.
create function public.shelf_create_post(
  p_body         text,
  p_category     text    default null,
  p_game_id      uuid    default null,
  p_image_path   text    default null,
  p_link_url     text    default null,
  p_poll_options text[]  default null,
  p_poll_hours   integer default 24
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  new_id uuid;
  n integer := coalesce(array_length(p_poll_options, 1), 0);
begin
  if n = 1 or n > 4 then
    raise exception 'A poll needs 2 to 4 options' using errcode = '22023';
  end if;

  insert into posts (author_id, body, category, game_id, image_path, link_url)
  values ((select auth.uid()), btrim(p_body), p_category, p_game_id, p_image_path, p_link_url)
  returning id into new_id;

  if n > 0 then
    insert into post_polls (post_id, ends_at)
    values (new_id, now() + make_interval(hours => least(greatest(coalesce(p_poll_hours, 24), 1), 168)));
    insert into post_poll_options (post_id, position, label)
    select new_id, (o.ord - 1)::smallint, btrim(o.label)
      from unnest(p_poll_options) with ordinality as o(label, ord);
  end if;

  return new_id;
end;
$function$;

-- 9. Vote, or change a vote. Returns the poll as the feed shows it.
create function public.shelf_vote_poll(p_post_id uuid, p_option_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
begin
  insert into post_poll_votes (post_id, user_id, option_id)
  values (p_post_id, (select auth.uid()), p_option_id)
  on conflict (post_id, user_id) do update
    set option_id = excluded.option_id, created_at = now();
  return shelf_poll(p_post_id);
end;
$function$;

grant execute on function public.shelf_poll(uuid) to authenticated;
grant execute on function public.shelf_feed(integer, timestamptz, uuid, text) to authenticated;
grant execute on function public.shelf_create_post(text, text, uuid, text, text, text[], integer) to authenticated;
grant execute on function public.shelf_vote_poll(uuid, uuid) to authenticated;

commit;
