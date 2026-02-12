# BucketCrew

AI teammates for small business. Upload your files, pick a goal, get a polished deliverable.

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Auth & Database**: Supabase (Auth, Postgres, Storage)
- **LLM**: Claude (Anthropic API)
- **Embeddings**: Voyage AI (voyage-3)
- **RAG**: pgvector on Supabase

## Getting Started

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in your keys:
```bash
cp .env.local.example .env.local
```

3. Set up your Supabase project:
   - Create a new Supabase project
   - Run `supabase/schema.sql` in the SQL editor
   - Enable the `vector` extension
   - Create a storage bucket named `business-files`

4. Run the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Login & signup
│   ├── (dashboard)/      # Dashboard, bucket, teammates, deliverables, settings
│   └── api/              # API routes
├── components/ui/        # shadcn/ui components
├── data/                 # Workflow template definitions
├── lib/
│   ├── ai/               # Claude API wrapper + system prompts
│   ├── orchestrator/     # Multi-agent workflow engine
│   ├── rag/              # File parsing, chunking, embeddings, retrieval
│   └── supabase/         # Supabase client configuration
├── types/                # TypeScript types
docs/                     # PRD, UI spec, technical design
supabase/                 # Database schema SQL
```

## MVP Workflows

1. **Research Sprint** - Market landscape, competitors, customer segments
2. **90-Day Growth Plan** - Channels, offers, experiments, KPIs
3. **SOP Builder** - Turn docs into standardized procedures
