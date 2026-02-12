# BucketCrew - Implementation Plan

## Phase 1: Foundation
- Next.js project setup with App Router
- Tailwind + shadcn/ui configuration
- Supabase project connection (auth, DB, storage)
- Database schema migration
- Auth flow (signup/login/logout)
- Layout shell (sidebar, nav)

## Phase 2: Core Data
- Workspace CRUD
- File upload to Supabase Storage
- File parsing (PDF, DOCX, CSV, TXT)
- RAG pipeline: chunking + embedding + storage
- File management UI (list, tags, delete, search)

## Phase 3: Workflows
- Workflow template system + JSON definitions
- Multi-agent orchestration engine
- Progress reporting (server → client polling)
- 3 workflow implementations:
  - Research Sprint
  - 90-Day Growth Plan
  - SOP Builder

## Phase 4: Deliverables
- Structured deliverable renderer
- Section-based viewer with TOC
- Interactive checklist
- Source citations
- PDF/DOCX export

## Phase 5: Polish
- Landing page
- Settings + billing UI
- Credit metering
- Error handling + edge cases
- Mobile responsive pass

## File Structure
```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Root layout
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard layout with sidebar
│   │   ├── dashboard/page.tsx            # Workspace overview
│   │   ├── dashboard/bucket/page.tsx     # Business Bucket
│   │   ├── dashboard/teammates/page.tsx  # TeamMates library
│   │   ├── dashboard/teammates/[id]/run/page.tsx
│   │   ├── dashboard/deliverables/page.tsx
│   │   ├── dashboard/deliverables/[id]/page.tsx
│   │   └── dashboard/settings/page.tsx
│   └── api/
│       ├── workspaces/
│       ├── files/
│       ├── workflows/
│       ├── runs/
│       └── billing/
├── components/
│   ├── ui/                               # shadcn components
│   ├── landing/                          # Landing page sections
│   ├── dashboard/                        # Dashboard components
│   ├── bucket/                           # File management
│   ├── teammates/                        # Workflow cards
│   ├── workflow/                         # Run workflow UI
│   └── deliverable/                      # Deliverable viewer
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser client
│   │   ├── server.ts                     # Server client
│   │   ├── middleware.ts                 # Auth middleware
│   │   └── database.types.ts            # Generated types
│   ├── rag/
│   │   ├── parser.ts                     # File text extraction
│   │   ├── chunker.ts                    # Text chunking
│   │   ├── embeddings.ts                 # Voyage AI embeddings
│   │   └── retriever.ts                 # Vector search
│   ├── orchestrator/
│   │   ├── engine.ts                     # Workflow execution engine
│   │   ├── agents.ts                     # Agent definitions
│   │   ├── context.ts                    # Shared context
│   │   └── progress.ts                  # Progress reporting
│   ├── ai/
│   │   ├── claude.ts                     # Claude API wrapper
│   │   └── prompts.ts                   # System prompts
│   ├── export/
│   │   ├── pdf.ts                        # PDF generation
│   │   └── docx.ts                      # DOCX generation
│   └── utils.ts                          # Shared utilities
├── hooks/
│   ├── use-workspace.ts
│   ├── use-files.ts
│   └── use-workflow-run.ts
├── types/
│   └── index.ts                          # App-wide types
└── data/
    └── workflow-templates.ts             # MVP workflow definitions
```
