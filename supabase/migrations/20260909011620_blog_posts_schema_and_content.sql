-- Blog posts: real admin-managed content, replacing the hand-maintained
-- BLOG_POSTS array in apps/web/lib/blog.ts (see that file's own doc comment
-- for the "swap it out here" note this migration is the seam for).
--
-- New posture (first of its kind in this schema): a table that is
-- genuinely PUBLIC-readable, not owner-scoped and not service-role-only.
-- Every other content table in this app is either "owner reads/writes their
-- own rows" (people, notes, ...) or "no client policy at all, service-role
-- only" (admin_users, quick_share_snapshots, ...). Blog posts are marketing
-- content with no owner and no privacy boundary — the public /blog and
-- /[slug] routes must be able to read published rows with the plain anon
-- key, the same way any other public page reads. Drafts are the one thing
-- that must stay invisible to a client read: the RLS policy below allows
-- SELECT only where status = 'published', so an unpublished draft (or a
-- guessed/leaked slug) never leaks through the public site regardless of
-- what the application code does or forgets to filter — the same
-- defense-in-depth reasoning admin_users/support_requests use for the
-- opposite case (no client access at all).
--
-- All writes (insert/update/delete) are service-role only, behind
-- requireAdminApi() (apps/web/lib/require-admin.ts) — mirrors every other
-- admin-mutated table (profiles.comped via lib/admin/comp.ts, etc.). There
-- is deliberately no owner-insert policy the way support_requests has one:
-- posts have no concept of an "owner" who authored them client-side: only
-- an admin (via the service-role client) creates or edits a post.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  dek text not null default '',
  category text not null default 'guides' check (category in ('guides', 'debunked')),
  -- Markdown body (react-markdown + remark-gfm on the read side, matching
  -- the deps already present in apps/web/package.json before this
  -- migration existed) — lowest-friction match for a plain-textarea admin
  -- editor (Part B) that also needs to support inline images via plain
  -- markdown image syntax, without pulling in a rich-text/WYSIWYG dependency
  -- that doesn't already exist in this repo.
  body text not null default '',
  hero_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Computed at save time from word count (apps/web/lib/blog.ts
  -- computeReadTimeMinutes), never derived at request time — same "static
  -- estimate, not live computation" choice the old BLOG_POSTS array already
  -- documented for itself.
  read_time_minutes int not null default 1,
  byline text not null default 'The Galaxia Team',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.posts is
  'Admin-managed blog content (replaces the old hand-maintained BLOG_POSTS array in apps/web/lib/blog.ts). Publicly SELECT-able by anon/authenticated, but ONLY rows where status = ''published'' — the RLS policy below is what actually keeps a draft private, not application-level filtering. All writes are service-role only, behind requireAdminApi() (apps/web/lib/admin/posts.ts) — there is no owner concept here, only an admin.';

create unique index if not exists posts_slug_idx on public.posts (slug);
create index if not exists posts_status_published_at_idx on public.posts (status, published_at desc);

alter table public.posts enable row level security;

-- Belt-and-suspenders, same posture as admin_role_foundation's admin_users
-- and admin_safe_actions' support_requests: revoke every table privilege
-- from anon/authenticated first, then grant back only what the policy below
-- is meant to allow (select). No insert/update/delete grant exists for
-- either role, so those commands are permission-denied even if a policy
-- were ever added later without also reviewing the grant.
revoke select, insert, update, delete on table public.posts from anon, authenticated;
grant select on table public.posts to anon, authenticated;

create policy "posts public read published"
on public.posts for select
to anon, authenticated
using (status = 'published');

-- Image storage for hero + inline post images (Part A/B). Public bucket:
-- Supabase serves public-bucket objects via an unauthenticated
-- /storage/v1/object/public/... URL that bypasses RLS entirely, so reads
-- need no storage.objects policy at all here. Writes are service-role only
-- (apps/web/app/api/admin/posts/images/route.ts, behind requireAdminApi()) —
-- service_role already bypasses RLS, so no insert policy is added either.
-- Same "no client policy = no client access" posture as every other
-- admin-write path in this schema, just expressed through the public-bucket
-- read mechanism instead of a SELECT policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  8388608, -- 8 MiB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Migrate the existing synastry post (previously hand-authored JSX at
-- apps/web/app/synastry-chart-meaning/page.tsx, and a static BLOG_POSTS
-- entry) into this table, so it becomes editable through the new admin the
-- same way any future post is. hero_image_url is deliberately left NULL —
-- Part C renders gracefully with no hero image, and assigning one is a
-- real content task for Carmen through the new admin, not something to
-- fabricate a placeholder for here.
insert into public.posts (slug, title, dek, category, body, status, read_time_minutes, byline, published_at)
values (
  'synastry-chart-meaning',
  'What a Synastry Chart Actually Tells You About Your Relationship',
  'Not a compatibility score. A synastry chart maps where two people flow easily and where they reliably catch — and what to do about each.',
  'guides',
  $POST_BODY$Most writing about synastry is aimed at someone standing at the beginning of something, trying to decide whether to walk in. Score out of ten. Green flags, red flags, verdict.

That is almost never who is reading.

The person searching this is usually eight months or eleven years into something. They are not leaving. They want to know why the same argument keeps arriving in different clothes, and whether there is anything to be done about it.

For that person, "are we compatible" is the wrong question. It has already been answered, by years of evidence. Here is the better one.

## What a synastry chart is, in two minutes

Two real birth charts, overlaid.

A birth chart is a map of where the planets actually were at the moment someone was born — computed from astronomical data, not generated or guessed. A synastry chart puts two of those maps on top of each other and looks at the angles between them. Your Moon sits at a certain degree. Their Mars sits at another. The angle between those two points is called an aspect, and some angles are smooth and some are abrasive.

That is the whole mechanism. Two maps, and the geometry between them.

It is worth being blunt about what this is not. It is not prediction — nothing here forecasts events, and any page that tells you a chart can is selling something. It is not a verdict on whether the relationship is good. And it is not a personality test that excuses anyone's behavior. It is a description of a pattern. What you do with the pattern is entirely yours.

## The only distinction that matters: flows and catches

Strip away the vocabulary and a synastry chart tells you two things.

Some things between you and this person are structurally easy. Effortless in a way neither of you had to build. You talk about a hard subject and it just goes fine. You have a rhythm for making decisions together that other couples apparently have to negotiate.

And some things are structurally effortful. Not broken — effortful. There is a place where you two reliably catch, and you have probably been catching there since the first year.

Both are permanent. Neither is a problem.

This is the reframe that changes how the whole chart reads. Most people arrive at synastry assuming the difficult aspects are the diagnosis and the easy ones are the filler. It is backwards, and it costs people years.

![Galaxia's flows and catches card showing a relational dynamic with Nurture it and Ease it guidance](/synastry-flows-catches.png)

## Why the easy parts are the dangerous ones

Here is the counterintuitive part, and if you take one thing from this page, take this.

Nobody notices ease.

Friction is legible. It announces itself, it interrupts your week, it makes you want to look up a synastry chart. Ease does nothing. It just quietly holds a great deal of weight for a very long time without ever asking for attention.

Which means that in almost every long relationship there is something genuinely rare happening between two people that neither of them has ever said out loud. Not because they do not feel it. Because it never came up. It never had to.

The language Galaxia uses for these is a nurture line, and it says the thing plainly:

> **Nurture it:** Don't let this ease go unspoken between you — say the affection out loud even when it feels obvious — warmth this easy is exactly what gets taken for granted.

That is the risk. Not that the ease disappears. That it goes unnamed for so long it stops registering as a gift and starts registering as a baseline — and a baseline is something you only notice when it is gone.

So: read the easy aspects first. Before you look at a single hard one. Find out what has been carrying you, and then go say it to the person.

## Reading the catches without building a case

Now the hard aspects — and the reason the reading order matters so much.

If you pull a synastry chart while annoyed, and you read the difficult aspects first, you will find them. They will be accurate. And they will confirm exactly the hypothesis you walked in holding. A chart read in that order cannot tell you anything you did not already believe; it can only give your existing case a better vocabulary.

Read after the easy aspects, the same placement reads differently. Not as a sentence handed down, but as one specific place where effort is required, inside a structure that is otherwise holding fine.

There is also a distinction worth making between two kinds of friction, because they call for opposite responses.

**Friction you are managing forever** repeats identically. Same fight, same words, same ending, every time. That is not structural. That is a conversation neither of you has had yet, wearing a costume. It is fixable, and the fix is usually saying the tender thing before it hardens into scorekeeping — naming what you actually need, early, while it is still a request rather than a grievance.

**Structural friction** changes shape. You are arguing about the dishes, then about the calendar, then about a text message, and it is obviously the same nerve every time. That one you do not fix. You name it. Out loud, to each other, ideally before you are in it: *we are doing the thing again.*

The difference between a couple that manages a hard aspect well and one that does not is almost never the aspect. It is whether they have a shared name for it.

## What a chart cannot tell you

This section is here because no competing page has it, and because it is true.

A synastry chart cannot tell you whether to stay. It describes a pattern; it does not weigh a life. Two people with a difficult chart and the will to name things out loud will do better than two people with a smooth chart and nothing to say to each other.

It cannot tell you who is at fault. Aspects are mutual. There is no configuration in which the chart takes a side.

It cannot substitute for the conversation. This is the big one. A chart can hand you unusually precise language for something you have felt for years and never been able to phrase. That is genuinely valuable — most stuck arguments are stuck on vocabulary. But the language is only useful once it leaves the page and gets said to the person it is about.

And it cannot forecast. Nothing in a chart tells you what will happen next month. Anything that claims otherwise is not reading astronomy.

![Galaxia's dynamic table showing six relational dimensions between two people](/synastry-dynamic-table.png)

## Reading yours

You need two birth dates. Birth times, as exact as you can get them, unlock the deepest layer — houses, rising signs, the precise Moon — but you do not need them to start. The signs, the aspect readings, and the generational layer all work from a date alone, sometimes from just a year.

That last part matters more than it sounds. It means the people you have the least information about — a grandparent, a parent who is gone, an old friend — still have a place in the reading.

Galaxia does this for the people already in your life rather than for strangers: your partner, your kids, your parents, your siblings, the friends who became family. Every chart is computed from real astronomical data, and every interpretation is written and curated rather than generated, which is why it will tell you what it does not know instead of guessing.

Compare any two people, see where you flow and where you catch, and get a specific thing to do about each.$POST_BODY$,
  'published',
  6,
  'The Galaxia Team',
  '2026-09-08T00:00:00Z'
)
on conflict (slug) do nothing;
