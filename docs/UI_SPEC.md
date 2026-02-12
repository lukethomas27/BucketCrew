# BucketCrew - Component-Level UI Spec

## Design System
- **Framework**: Next.js 14 App Router + Tailwind CSS + shadcn/ui
- **Theme**: Dark sidebar, light content area. Purple/indigo primary (#6366f1). Clean, premium.
- **Typography**: Inter for UI, system monospace for data
- **Icons**: Lucide React
- **Motion**: Framer Motion for page transitions and progress states

---

## A) Landing Page (`/`)

### Hero Section
- Headline: "Your business deserves a team. Not another chatbot."
- Sub: "Upload your files. Pick a goal. Get a polished deliverable in minutes."
- CTA: "Start Free" → `/signup`
- Hero visual: Animated illustration of files flowing into a bucket, teammates working, deliverable appearing

### How It Works (3 steps)
1. "Drop files into your Business Bucket" — upload icon
2. "Choose a TeamMate workflow" — team cards
3. "Get a polished deliverable" — document with checkmarks

### TeamMate Showcase
- 3 cards: Research Sprint, Growth Plan, SOP Builder
- Each: icon, title, description, sample output preview

### Pricing Section
- 3 tiers: Free / Pro ($29) / Business ($79)
- Feature comparison grid

### Footer
- Links, trust badges, "Built with Claude"

### States
- Default, scrolled (sticky nav), mobile responsive

---

## B) Auth (`/login`, `/signup`)

### Signup
- Email + password (Supabase Auth)
- OR Google OAuth
- Fields: Email, Password, Business Name (becomes first workspace)
- CTA: "Create Your Team"

### Login
- Email + password
- Google OAuth
- "Forgot password" link

### States
- Default, loading, error (inline validation), success → redirect to `/dashboard`

---

## C) Dashboard (`/dashboard`)

### Layout
- Sidebar: Logo, Workspaces list, Settings, Help
- Main: Workspace overview

### Workspace Overview
- Workspace name + edit
- Stats row: Files in bucket (count), Deliverables (count), Credits remaining
- Recent Deliverables list (card grid):
  - Each: Title, workflow type badge, date, status, "View" button
- Quick Actions: "Upload Files", "Run TeamMate"
- Empty state: "Your workspace is empty. Start by uploading files to your Business Bucket."

### States
- Loading skeleton, empty, populated, multi-workspace switcher

---

## D) Business Bucket (`/dashboard/bucket`)

### Upload Area
- Drag-and-drop zone (dashed border, icon, "Drop files here or click to browse")
- Supported formats badge: PDF, DOCX, CSV, TXT
- Upload progress bar per file
- Auto-tag suggestion after upload

### File List
- Table/grid view toggle
- Columns: Name, Type, Tags, Size, Uploaded date, Actions (preview, delete)
- Tag filter sidebar/chips
- Search bar: "Search your bucket..."
- Bulk actions: Tag, Delete

### Tags
- Preset: Sales, Ops, Finance, Marketing, Website
- Custom tags (user-created)
- Color-coded chips

### "What's in here?" Button
- Triggers a quick AI summary of bucket contents
- Shows: file count by type, topic clusters, suggested workflows

### States
- Empty bucket, uploading, upload error, populated, search results, tag filter active

---

## E) TeamMates Library (`/dashboard/teammates`)

### Layout
- Grid of workflow cards (3 for MVP)
- Each card:
  - Icon (unique per workflow)
  - Name: "Research Sprint" / "90-Day Growth Plan" / "SOP Builder"
  - Description (2 lines)
  - "What you'll get" preview list
  - Estimated credits: "1 credit"
  - CTA: "Run This Team"
  - Badge: "Popular" / "New"

### States
- Default, hover (card lift), locked (needs upgrade), coming soon (grayed + "Notify me")

---

## F) Run Workflow (`/dashboard/teammates/[id]/run`)

### Goal Form
- Workflow title + description at top
- Form fields (vary by workflow):
  - **Research Sprint**: Business description, Target market, Key competitors (optional), Focus areas (checkboxes)
  - **Growth Plan**: Current revenue range, Primary channel, Growth target, Constraints
  - **SOP Builder**: Which process to document, Select source files from bucket
- Common fields:
  - "Include web research?" toggle (default: on)
  - "Select files from bucket" — multi-select from bucket files
  - Optional constraints textarea: "Anything else your team should know?"
- CTA: "Run Team" (with credit cost)

### Running State (most important UX moment)
- Full-page progress view
- Team activity timeline:
  ```
  ✅ Planner — Analyzed your goal and bucket files (12s)
  🔄 Researcher — Scanning market data and competitors... (in progress)
  ⏳ Strategist — Waiting
  ⏳ Editor — Waiting
  ```
- Each agent: avatar/icon, name, status, duration
- High-level log entries (no prompts shown):
  - "Planner identified 3 key research areas"
  - "Researcher found 12 relevant data points from your bucket"
  - "Researcher completed web search for competitor pricing"
- Cancel button
- Estimated time remaining (rough)

### States
- Form default, form validation error, running (progress), completed → redirect to deliverable, error/failed

---

## G) Deliverable Viewer (`/dashboard/deliverables/[id]`)

### Layout
- Left sidebar: Table of contents (section links)
- Main content: Formatted document
- Top bar: Title, workflow badge, date, export buttons

### Sections (rendered as polished document)
1. **Executive Summary** — 3–5 bullet highlights
2. **Key Findings** — Numbered findings with citations `[Source: filename.pdf, p.3]`
3. **Recommendations** — Prioritized, numbered
4. **30/60/90 Plan** — Table or timeline view
5. **Risks & Assumptions** — Bulleted
6. **TODO Checklist** — Interactive checkboxes (state saved)
7. **Sources** — "What I used from your bucket" + web sources

### Export
- Buttons: "Export PDF", "Export DOCX", "Copy Markdown"
- Share link (read-only, optional)

### States
- Loading, rendered, export in progress, empty (error fallback)

---

## H) Settings (`/dashboard/settings`)

### Sections
- **Profile**: Name, email, password change
- **Workspace**: Rename, delete workspace (confirmation modal)
- **Billing**: Current plan, usage bar (credits used/total), upgrade CTA
- **Preferences**: Web research default toggle, data retention period (30/60/90 days/forever)
- **Data**: "Delete all my data" button (confirmation modal)

### States
- Default, saving, saved confirmation, delete confirmation modal
