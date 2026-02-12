# BucketCrew - Product Requirements Document

## One-liner
BucketCrew lets small business owners upload their files and run AI "teammates" to produce real business deliverables — no prompts, no AI jargon, just outcomes.

## Problem
Small business owners need strategic work (market research, growth plans, SOPs) but can't afford consultants ($5K–$50K) and don't have time to learn AI tools. ChatGPT feels like talking to a stranger. They want a team, not a chatbot.

## Solution
A workspace where you:
1. Drop your business files into a "Business Bucket"
2. Pick a goal from a library of "TeamMates" (pre-built multi-agent workflows)
3. Get a polished, structured deliverable — like hiring a consulting team for $20/mo

## Core Loop
```
Upload files → Tag them → Pick a TeamMate → Watch your team work → Get a deliverable → Export & act
```

## MVP Scope (v0.1)

### Users
- Non-technical small business owners (1–50 employees)
- Solopreneurs, freelancers, agency owners

### Workflows (ship 3)
1. **Research Sprint** — Market landscape, competitors, customer segments
2. **90-Day Growth Plan** — Channels, offers, experiments, KPIs
3. **SOP Builder** — Turn messy docs into standardized procedures

### File Support
- PDF, DOCX, CSV, TXT
- Max 50MB per file, 500MB per workspace
- Tags: Sales, Ops, Finance, Marketing, Website, Custom

### Deliverable Format
Every output includes:
- Executive Summary
- Key Findings (with citations to bucket docs)
- Recommendations
- 30/60/90 Day Plan (where applicable)
- Risks & Assumptions
- TODO Checklist
- "What I used from your bucket" — transparency section
- Export: PDF, DOCX, Markdown

### Metering
- Users see "credits" not tokens
- 1 credit ≈ 1 workflow run
- Free tier: 3 credits/month
- Pro: 50 credits/month ($29/mo)
- Business: 200 credits/month ($79/mo)

## Out of Scope (v0.1)
- Real-time collaboration
- Custom workflow builder
- API access
- Integrations (Slack, Notion, etc.)
- Mobile app

## Success Metrics
- Activation: User uploads ≥1 file AND runs ≥1 workflow within 7 days
- Retention: User runs ≥2 workflows in month 2
- NPS > 40
- Time to first deliverable < 10 minutes
