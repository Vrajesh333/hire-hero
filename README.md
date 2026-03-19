# Hire Hero - TalentAI Resume Screening

This repository contains a full-stack AI-assisted recruitment application for:
- uploading resumes,
- extracting candidate profiles,
- creating job roles,
- running AI matching,
- and searching candidates with natural language.

Documentation is split into two focused guides:

1. Technical guide for developers and maintainers: [TECHNICAL_README.md](TECHNICAL_README.md)
2. Feature guide for demos and product explanation: [FEATURE_README.md](FEATURE_README.md)

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

3. Start development server:

```bash
npm run dev
```

4. Open the app at `http://localhost:8080`

For full backend and Supabase setup, see [TECHNICAL_README.md](TECHNICAL_README.md).
