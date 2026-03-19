# Technical README

## 1. System Overview

Hire Hero (TalentAI) is a full-stack AI-assisted resume screening system.

High-level architecture:
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- Client state/data: TanStack Query
- Backend: Supabase (Postgres + Edge Functions)
- AI orchestration: Lovable AI Gateway called from Supabase Edge Functions

Primary user workflow:
1. Upload resume files
2. Parse resumes into structured candidate records
3. Create job roles
4. Run candidate-job matching
5. Review ranked candidates and shortlist
6. Perform natural language AI candidate search

## 2. Tech Stack

Core runtime and UI:
- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- Radix UI + shadcn/ui components
- Framer Motion
- Lucide icons

Data and backend:
- @supabase/supabase-js v2
- Supabase Postgres
- Supabase Edge Functions (Deno)

State and async:
- @tanstack/react-query

Testing:
- Vitest + Testing Library
- Playwright config via lovable-agent-playwright-config

## 3. Project Structure

- src/main.tsx: React entry point
- src/App.tsx: global providers and route map
- src/pages/: route-level pages
- src/components/: reusable UI and feature components
- src/lib/api.ts: Supabase CRUD wrappers
- src/lib/queries.ts: React Query hooks and cache invalidation
- src/types/index.ts: domain interfaces (Job, Candidate, MatchResult)
- src/integrations/supabase/client.ts: Supabase browser client
- supabase/migrations/: database schema migration
- supabase/functions/: Edge Functions for AI parsing/matching/search

## 4. Frontend Architecture

### 4.1 Routing

Defined in src/App.tsx:
- / -> DashboardPage
- /upload -> UploadPage
- /jobs -> JobsPage
- /candidates -> CandidatesPage
- /search -> SearchPage
- * -> NotFound

### 4.2 Layout and Navigation

- AppLayout composes sidebar + top header + content area.
- AppSidebar defines main nav entries:
  - Dashboard
  - Upload Resumes
  - Job Roles
  - Candidates
  - AI Search

### 4.3 State and Data Flow

Pattern:
- UI components/pages call hooks from src/lib/queries.ts
- Hooks call async functions in src/lib/api.ts
- API layer talks to Supabase Postgres tables
- Query cache invalidation refreshes stale data after mutations

Examples:
- useCreateJob invalidates ["jobs"]
- useCreateCandidate invalidates ["candidates"]
- useToggleShortlist invalidates ["match_results"]

### 4.4 Styling and Design System

- Tailwind config extends tokens from CSS variables
- src/index.css defines semantic color tokens, gradients, typography, score colors
- Font families:
  - Heading: Space Grotesk
  - Body: DM Sans

## 5. Backend Architecture (Supabase)

## 5.1 Database Schema

Defined by migration:
- supabase/migrations/20260319161431_92736534-eed2-4108-a0c1-fe6fc846a8db.sql

Tables:
1. jobs
- title, description, requirements, skills[]
- experience range, education, status
- timestamps and update trigger

2. candidates
- core identity fields (name/email/phone)
- parsed profile fields (skills[], education, experience)
- extracted narrative fields (projects, work_experience, ai_summary)
- raw_text + resume_filename
- timestamps and update trigger

3. match_results
- links job_id and candidate_id
- scores: overall, skill, experience, education
- explainability fields: explanation, strengths[], skill_gaps[], missing_requirements[]
- shortlist flag
- unique(job_id, candidate_id)

## 5.2 Security Model

Current migration enables RLS but applies open policies:
- "Anyone can manage jobs"
- "Anyone can manage candidates"
- "Anyone can manage match results"

This is permissive and suitable for prototype/demo. For production, replace with authenticated role-based policies.

## 5.3 Edge Functions

Configured in supabase/config.toml:
- parse-resume
- match-candidates
- ai-search

All currently use verify_jwt = false.

### parse-resume

Input:
- filename
- content (resume text)

Behavior:
- calls Lovable AI gateway with function tool schema
- extracts structured profile
- inserts candidate row

Dependencies/env:
- LOVABLE_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

### match-candidates

Input:
- job_id

Behavior:
- fetches one job and all candidates
- batches candidate scoring in groups of 3
- calls AI with structured scoring tool
- upserts match_results on conflict (job_id, candidate_id)

Dependencies/env:
- LOVABLE_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

### ai-search

Input:
- query (natural language)

Behavior:
- fetches all candidates
- builds compact candidate summaries
- asks AI for ranked matches
- maps results into candidate objects with synthetic match block for UI rendering

Dependencies/env:
- LOVABLE_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## 6. Core User Flows in Code

1. Resume upload and parse:
- UI: src/components/ResumeUploader.tsx
- Calls function: parse-resume
- Refreshes candidates cache

2. Job creation:
- UI: src/components/JobForm.tsx
- Mutation: createJob
- Refreshes jobs cache

3. Candidate matching:
- Triggered from: src/pages/JobsPage.tsx (Match button)
- Calls function: match-candidates
- Refreshes job-specific match results cache

4. Candidate review and shortlist:
- UI: src/pages/CandidatesPage.tsx + src/components/CandidateCard.tsx
- Toggle shortlist -> updates match_results.shortlisted

5. AI free-text search:
- UI: src/pages/SearchPage.tsx
- Calls function: ai-search
- Renders returned ranked candidate cards

## 7. Environment Variables

Frontend (.env):
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Supabase Edge Function secrets:
- LOVABLE_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## 8. Local Development

Prerequisites:
- Node.js 18+
- npm
- Supabase project (remote or local)

Install and run frontend:
```bash
npm install
npm run dev
```

Build and preview:
```bash
npm run build
npm run preview
```

Lint and unit tests:
```bash
npm run lint
npm run test
```

Optional watch tests:
```bash
npm run test:watch
```

## 9. Supabase Notes

This repo contains migration and function code under supabase/.

Typical Supabase CLI workflow (if using local Supabase):
```bash
supabase start
supabase db reset
supabase functions serve parse-resume --no-verify-jwt
supabase functions serve match-candidates --no-verify-jwt
supabase functions serve ai-search --no-verify-jwt
```

Set required secrets before invoking functions.

## 10. Known Constraints and Risks

1. Prototype-grade auth/security:
- Open RLS policies and no JWT verification on functions.

2. Resume file parsing in browser:
- ResumeUploader currently reads files with file.text().
- This works for plain text, but native PDF/DOCX binary parsing is not implemented client-side.
- Supported extension labels exist in UI, but actual text extraction quality depends on file format/content.

3. Supabase typing:
- src/lib/api.ts uses any-cast for db client pending regenerated strict table types.

4. AI dependency and costs:
- Parse, matching, and search depend on external AI calls and API credits.
- Functions handle 429/402 cases but workflows are still AI-availability dependent.

## 11. Suggested Production Hardening

1. Add authentication and secure RLS policies.
2. Enable verify_jwt for Edge Functions and enforce role checks.
3. Implement robust PDF/DOCX text extraction pipeline.
4. Add retry/backoff and observability for AI calls.
5. Add integration tests for end-to-end flows (upload -> parse -> match -> shortlist).
6. Regenerate and enforce strict Supabase TypeScript types.
7. Add pagination and server-side filtering for large candidate datasets.
