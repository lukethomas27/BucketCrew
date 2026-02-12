# BucketCrew - Technical Design

## Stack
| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js 14 (App Router) | SSR, RSC, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, premium |
| Auth | Supabase Auth | Email/password + OAuth, row-level security |
| Database | Supabase Postgres + pgvector | Single platform, built-in vector support |
| Storage | Supabase Storage | S3-compatible, integrates with RLS |
| LLM | Claude (Anthropic API) | Best reasoning, long context |
| Embeddings | Voyage AI (voyage-3) | Best for retrieval, Anthropic-recommended |
| File parsing | pdf-parse, mammoth (docx), csv-parse | Server-side file processing |
| PDF export | @react-pdf/renderer | Client-side PDF generation |
| Deployment | Vercel | Zero-config Next.js hosting |

## Database Schema

```sql
-- Users (managed by Supabase Auth, extended with profiles)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Workspaces
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workspace members (future multi-user support)
create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'owner' check (role in ('owner', 'member', 'viewer')),
  primary key (workspace_id, user_id)
);

-- Files (Business Bucket)
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

-- File chunks (for RAG)
create table file_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding vector(1024),  -- voyage-3 dimension
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Vector similarity search index
create index on file_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Workflow templates
create table workflow_templates (
  id text primary key,  -- 'research-sprint', 'growth-plan', 'sop-builder'
  name text not null,
  description text,
  icon text,
  category text,
  config jsonb not null,  -- steps, agent roles, prompts, output schema
  credit_cost integer default 1,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Workflow runs
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id),
  template_id text not null references workflow_templates(id),
  input jsonb not null,          -- user's goal form data
  file_ids uuid[] default '{}',  -- selected bucket files
  status text default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress jsonb default '[]',   -- agent activity log
  result jsonb,                  -- structured deliverable
  error text,
  credits_used integer default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Deliverables (rendered output)
create table deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid not null references workflow_runs(id) on delete cascade,
  title text not null,
  content jsonb not null,   -- structured sections
  checklist jsonb default '[]',
  sources jsonb default '[]',
  created_at timestamptz default now()
);

-- Credit usage tracking
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

-- Billing / plans
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

-- Row Level Security policies
alter table workspaces enable row level security;
alter table files enable row level security;
alter table file_chunks enable row level security;
alter table workflow_runs enable row level security;
alter table deliverables enable row level security;

-- Example RLS: users can only access their workspace data
create policy "Users access own workspaces" on workspaces
  for all using (owner_id = auth.uid());

create policy "Users access own workspace files" on files
  for all using (workspace_id in (
    select id from workspaces where owner_id = auth.uid()
  ));
```

## Storage Structure
```
bucket: business-files
├── {workspace_id}/
│   ├── {file_id}/{original_name}
```

## RAG Pipeline

### Ingestion (on file upload)
1. **Upload** → Supabase Storage
2. **Parse** → Extract text:
   - PDF: pdf-parse
   - DOCX: mammoth
   - CSV: csv-parse → markdown table
   - TXT: raw text
3. **Chunk** → Split into ~500 token chunks with 50 token overlap
   - Strategy: paragraph-aware splitting (respect headers, paragraphs)
   - Store chunk metadata: file_id, chunk_index, page number (if PDF)
4. **Embed** → Voyage AI `voyage-3` (1024 dimensions)
5. **Store** → Supabase pgvector `file_chunks` table

### Retrieval (during workflow run)
1. **Query embedding** → Embed the agent's query with Voyage AI
2. **Vector search** → Cosine similarity on `file_chunks` (top-k=20)
3. **Filter** → By workspace_id + optional file_ids (user-selected)
4. **Re-rank** → Simple relevance scoring (future: Cohere reranker)
5. **Return** → Chunks with source attribution (file name, chunk index)

## Multi-Agent Orchestration

### Architecture
Simple sequential pipeline with a shared context object. No framework — just functions.

```
Planner → [Specialist Agents in parallel] → Synthesizer → Editor
```

### Shared Context Object
```typescript
interface WorkflowContext {
  runId: string;
  workspaceId: string;
  template: WorkflowTemplate;
  userInput: Record<string, any>;
  bucketContext: RetrievedChunk[];   // RAG results
  webResearchEnabled: boolean;
  agentOutputs: Record<string, any>; // each agent writes here
  progress: ProgressEntry[];         // UI activity log
  finalDeliverable?: Deliverable;
}
```

### Agent Roles

**Planner**
- Input: User goal + bucket file summaries
- Output: Research plan, key questions, task assignments
- Model: Claude Sonnet (fast, cheap)

**Researcher** (1–3 instances in parallel)
- Input: Assigned questions from planner + bucket chunks
- RAG: Queries bucket for relevant context
- Optional: Web research via tool use
- Output: Findings with citations
- Model: Claude Sonnet

**Strategist**
- Input: All research findings + user constraints
- Output: Recommendations, plans, priorities
- Model: Claude Sonnet

**Editor**
- Input: All agent outputs
- Output: Polished deliverable in structured format
- Model: Claude Sonnet (or Opus for premium)

### Progress Reporting
Each agent emits progress events:
```typescript
interface ProgressEntry {
  agent: string;        // "Planner", "Researcher", etc.
  status: 'running' | 'completed' | 'error';
  message: string;      // "Analyzing your business files..."
  timestamp: string;
  duration_ms?: number;
}
```

Stored in `workflow_runs.progress` (jsonb), polled by client every 2s.

## API Routes

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/workspaces
POST   /api/workspaces
PATCH  /api/workspaces/[id]
DELETE /api/workspaces/[id]

GET    /api/workspaces/[id]/files
POST   /api/workspaces/[id]/files/upload
DELETE /api/workspaces/[id]/files/[fileId]
PATCH  /api/workspaces/[id]/files/[fileId]  (tags)
POST   /api/workspaces/[id]/files/summarize  ("what's in here?")

GET    /api/workflows/templates
GET    /api/workflows/templates/[id]

POST   /api/workspaces/[id]/runs           (start workflow)
GET    /api/workspaces/[id]/runs/[runId]   (status + progress)
POST   /api/workspaces/[id]/runs/[runId]/cancel

GET    /api/workspaces/[id]/deliverables
GET    /api/workspaces/[id]/deliverables/[id]
PATCH  /api/workspaces/[id]/deliverables/[id]  (checklist updates)
GET    /api/workspaces/[id]/deliverables/[id]/export?format=pdf

GET    /api/workspaces/[id]/usage
GET    /api/billing/plans
POST   /api/billing/subscribe
```

## Metering

### Credit Calculation
```
1 credit = 1 workflow run (regardless of internal token usage)
Internal tracking: sum all model calls per run
  - Input tokens, output tokens, model used
  - Estimated USD cost (for our internal P&L)
```

### User-Facing
- Dashboard shows: "5 of 50 credits used this month"
- Progress bar
- Upgrade CTA when < 3 credits remaining

## Security
- Supabase RLS on all tables — workspace isolation
- File uploads: validate MIME type server-side, max 50MB
- API routes: verify auth + workspace membership
- No raw LLM prompts exposed to client
- Deliverable content sanitized before rendering
