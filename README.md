# Hire Hero - TalentAI Resume Screening

Hire Hero is a full-stack AI-assisted recruitment application that helps teams upload resumes, extract candidate profiles, create job roles, run AI matching, and search candidates with natural language.
## Repository Structure

The repository is now organized into two top-level folders:

- frontend: React + Vite + TypeScript web app
- backend: Supabase resources (migrations + Edge Functions)

## Product Summary

Primary user journey:

1. Upload resumes
2. Parse resumes into candidate profiles
3. Create job roles
4. Run AI candidate matching
5. Review ranked candidates and shortlist
6. Use AI search with plain English queries

Primary personas:

- Recruiter: uploads resumes, creates jobs, matches and shortlists
- Hiring manager: reviews ranked profiles and match explanations

## Feature Overview

1. Dashboard
- Shows total candidates, active jobs, total jobs, average skills per candidate, and quick actions.

2. Resume Upload and AI Parsing
- Supports batch upload (PDF, DOCX, TXT).
- Parses resume text and saves structured candidate records.

3. Job Role Management
- Create role title, description, requirements, skills, education, and experience range.

4. AI Candidate Matching
- Scores candidates against a selected job with explanation and category scores.

5. Candidate Review
- Candidate cards with skills, contact info, score bars, explanation, strengths, and gaps.
- Shortlist toggle and CSV export.

6. AI Search
- Natural-language candidate search powered by Edge Function ranking.

## Technical Architecture

Frontend stack:

- React 18
- Vite 5
- TypeScript 5
- Tailwind CSS + shadcn/ui
- TanStack Query
- Framer Motion

Backend stack:

- Supabase Postgres
- Supabase Edge Functions (Deno)
- Supabase JS client
- Lovable AI Gateway for parse/match/search intelligence

Key backend tables:

- jobs
- candidates
- match_results

Edge Functions:

- parse-resume
- match-candidates
- ai-search

## Setup

## Prerequisites

- Node.js 18+
- npm
- Supabase project

## Frontend Setup

1. Move to frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create .env in frontend folder:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

4. Start development server:

```bash
npm run dev
```

5. Open http://localhost:8080

## Backend Setup (Supabase)

Migrations are in backend/supabase/migrations.

Apply these migrations in Supabase SQL Editor (in order):

1. backend/supabase/migrations/20260319161431_92736534-eed2-4108-a0c1-fe6fc846a8db.sql
2. backend/supabase/migrations/20260320121500_create_resumes_storage_bucket.sql

Set Edge Function secrets:

- LOVABLE_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Deploy functions from backend/supabase/functions:

- parse-resume
- match-candidates
- ai-search

## Useful Commands

Run from frontend folder:

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

## Current Constraints

- Security is prototype-oriented (open policies, verify_jwt disabled).
- AI parsing, matching, and search depend on external AI service availability and credits.
- TypeScript database types are partially relaxed in some API areas.

## Demo Flow

1. Upload sample resumes
2. Create a job role
3. Run AI match for that role
4. Inspect ranked candidates and shortlist
5. Run AI search query and review ranked results
