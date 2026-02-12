-- =============================================================================
-- BucketCrew Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Enable pgvector
create extension if not exists "vector" with schema "extensions";

-- ---------------------------------------------------------------------------
-- 1. profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. workspaces
-- ---------------------------------------------------------------------------
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table workspaces enable row level security;

create policy "Users access own workspaces" on workspaces
  for all using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. workspace_members (future multi-user)
-- ---------------------------------------------------------------------------
create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'owner' check (role in ('owner', 'member', 'viewer')),
  primary key (workspace_id, user_id)
);

alter table workspace_members enable row level security;

create policy "Workspace owners manage members" on workspace_members
  for all using (
    exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 4. files (Business Bucket)
-- ---------------------------------------------------------------------------
create table files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null,
  tags text[] default '{}',
  metadata jsonb default '{}',
  processing_status text default 'pending'
    check (processing_status in ('pending', 'processing', 'ready', 'error')),
  created_at timestamptz default now()
);

alter table files enable row level security;

create policy "Users access own workspace files" on files
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. file_chunks (RAG)
-- ---------------------------------------------------------------------------
create table file_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding vector(1024),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table file_chunks enable row level security;

create policy "Users access own workspace chunks" on file_chunks
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Vector similarity search index
create index file_chunks_embedding_idx
  on file_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ---------------------------------------------------------------------------
-- 6. workflow_templates
-- ---------------------------------------------------------------------------
create table workflow_templates (
  id text primary key,
  name text not null,
  description text,
  icon text,
  category text,
  config jsonb not null default '{}',
  credit_cost integer default 1,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Templates readable by all authenticated users
alter table workflow_templates enable row level security;

create policy "Authenticated users can view templates" on workflow_templates
  for select using (is_active = true);

-- ---------------------------------------------------------------------------
-- 7. workflow_runs
-- ---------------------------------------------------------------------------
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id),
  template_id text not null references workflow_templates(id),
  input jsonb not null default '{}',
  file_ids uuid[] default '{}',
  status text default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress jsonb default '[]',
  result jsonb,
  error text,
  credits_used integer default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table workflow_runs enable row level security;

create policy "Users access own workspace runs" on workflow_runs
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 8. deliverables
-- ---------------------------------------------------------------------------
create table deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid not null references workflow_runs(id) on delete cascade,
  title text not null,
  content jsonb not null default '{}',
  checklist jsonb default '[]',
  sources jsonb default '[]',
  created_at timestamptz default now()
);

alter table deliverables enable row level security;

create policy "Users access own workspace deliverables" on deliverables
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 9. credit_usage
-- ---------------------------------------------------------------------------
create table credit_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id),
  run_id uuid references workflow_runs(id),
  credits integer not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10,6),
  created_at timestamptz default now()
);

alter table credit_usage enable row level security;

create policy "Users access own workspace usage" on credit_usage
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 10. subscriptions
-- ---------------------------------------------------------------------------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  plan text default 'free' check (plan in ('free', 'pro', 'business')),
  credits_total integer default 3,
  credits_used integer default 0,
  period_start timestamptz default now(),
  period_end timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users access own workspace subscriptions" on subscriptions
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Vector similarity search function
-- ---------------------------------------------------------------------------
create or replace function match_chunks(
  query_embedding vector(1024),
  match_workspace_id uuid,
  match_file_ids uuid[] default null,
  match_count int default 20,
  match_threshold float default 0.3
) returns table (
  id uuid,
  file_id uuid,
  workspace_id uuid,
  chunk_index int,
  content text,
  token_count int,
  metadata jsonb,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    fc.id, fc.file_id, fc.workspace_id, fc.chunk_index,
    fc.content, fc.token_count, fc.metadata,
    (1 - (fc.embedding <=> query_embedding))::float as similarity
  from file_chunks fc
  where fc.workspace_id = match_workspace_id
    and (match_file_ids is null or fc.file_id = any(match_file_ids))
    and (1 - (fc.embedding <=> query_embedding)) > match_threshold
  order by fc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspaces_updated_at
  before update on workspaces
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: MVP Workflow Templates
-- ---------------------------------------------------------------------------
insert into workflow_templates (id, name, description, icon, category, config, credit_cost) values
(
  'research-sprint',
  'Research Sprint',
  'Deep-dive into your market landscape, competitors, and customer segments.',
  'Search',
  'Research',
  '{"steps": [], "form_fields": [], "output_schema": "findings"}'::jsonb,
  1
),
(
  'growth-plan',
  '90-Day Growth Plan',
  'Get a strategic, actionable growth plan with channels, offers, experiments, and KPIs.',
  'TrendingUp',
  'Strategy',
  '{"steps": [], "form_fields": [], "output_schema": "plan_30_60_90"}'::jsonb,
  1
),
(
  'sop-builder',
  'SOP Builder',
  'Turn your messy documents into clean, standardized operating procedures.',
  'ClipboardList',
  'Operations',
  '{"steps": [], "form_fields": [], "output_schema": "findings"}'::jsonb,
  1
);
