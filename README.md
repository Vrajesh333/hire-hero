# Hire Hero - TalentAI Resume Screening

Hire Hero is a full-stack AI-assisted recruitment app for:
- uploading resumes,
- extracting candidate profiles,
- creating job roles,
- running AI matching,
- searching candidates with natural language,
- opening original resume files from candidate cards (when resume links are stored).

Documentation is split into two focused guides:

1. Technical guide for developers and maintainers: [TECHNICAL_README.md](TECHNICAL_README.md)
2. Feature guide for demos and product explanation: [FEATURE_README.md](FEATURE_README.md)

This README is intentionally limited to general usage and setup.

## Prerequisites

- Node.js 18+
- npm
- A Supabase project

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Set frontend environment variables in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

3. Start the app:

```bash
npm run dev
```

4. Open the app at `http://localhost:8080`

## Supabase Setup (Required)

Run these SQL migrations in Supabase SQL Editor:

1. [supabase/migrations/20260319161431_92736534-eed2-4108-a0c1-fe6fc846a8db.sql](supabase/migrations/20260319161431_92736534-eed2-4108-a0c1-fe6fc846a8db.sql)
2. [supabase/migrations/20260320121500_create_resumes_storage_bucket.sql](supabase/migrations/20260320121500_create_resumes_storage_bucket.sql)

The second migration is required for storing original resume files and enabling the Open Resume button.

Deploy Edge Functions:

- parse-resume
- match-candidates
- ai-search

Set required function secrets:

- LOVABLE_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Notes

- If the resume storage bucket is not created, uploads can still parse text but original file links will be missing.
- Older candidates uploaded before storage setup may not have Open Resume links until re-uploaded.

For implementation details, refer to [TECHNICAL_README.md](TECHNICAL_README.md).
