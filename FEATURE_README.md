# Feature README

## Product Summary

Hire Hero (TalentAI) helps recruiters and hiring teams process resumes faster with AI-assisted extraction, matching, and search.

It turns unstructured resumes into candidate profiles, compares candidates against job roles, and ranks people by relevance.

## Primary Personas

1. Recruiter
- Uploads resumes
- Creates roles
- Runs matching
- Reviews and shortlists candidates

2. Hiring Manager
- Reviews ranked results
- Understands why candidates were scored
- Uses search to find specific profiles quickly

## Feature Map

## 1. Dashboard

Purpose:
- Give a quick overview of pipeline health.

What it shows:
- Total candidates
- Active jobs
- Total jobs
- Average skills per candidate
- Quick action shortcuts
- Recent candidate list

Business value:
- Immediate status visibility and quick navigation to next action.

## 2. Resume Upload and AI Parsing

Purpose:
- Convert resume files into structured candidate records automatically.

User actions:
- Drag and drop files or browse files
- Upload multiple resumes in one batch

What happens behind the scenes:
- Frontend sends resume content to parse-resume Edge Function
- AI extracts fields like:
  - name, email, phone
  - skills
  - education
  - experience years
  - certifications
  - projects/work summary
  - AI summary
- Candidate record is saved in database

Business value:
- Removes manual resume data entry and speeds up profile creation.

## 3. Job Role Creation

Purpose:
- Define hiring requirements in a structured format.

User actions:
- Enter title and description
- Add requirements text
- Add required skills (comma-separated)
- Add education preference
- Add min/max experience

What happens behind the scenes:
- Form creates a job row in database
- Job is visible immediately in job list

Business value:
- Standardized role definitions improve matching quality and consistency.

## 4. AI Candidate Matching

Purpose:
- Score all candidates against a selected job role.

User actions:
- Click Match on a job

What happens behind the scenes:
- match-candidates function fetches job + all candidates
- AI generates:
  - overall score
  - skill score
  - experience score
  - education score
  - explanation
  - strengths
  - skill gaps
  - missing requirements
- Results are upserted and shown in candidates view

Business value:
- Reduces screening time and surfaces best-fit candidates quickly.

## 5. Candidate Review Experience

Purpose:
- Help recruiters evaluate candidates with both summary and depth.

What users can do:
- View candidate cards with contact info and top skills
- See score badges and score bars
- Expand details for AI explanation, strengths, skill gaps, and missing requirements
- Shortlist/unshortlist candidates
- Export filtered list to CSV

Business value:
- Combines fast triage with explainable AI scoring for better hiring decisions.

## 6. Candidate Filtering and Ranking

Purpose:
- Narrow candidate lists to relevant profiles.

Available filters:
- Job role
- Skills (comma-separated terms)
- Minimum experience
- Minimum match score (when job context is selected)
- Shortlisted-only toggle

Sorting behavior:
- With a selected job, candidates are sorted by match score descending.

Business value:
- Improves recruiter productivity when candidate volume is high.

## 7. Natural Language AI Search

Purpose:
- Let users search candidates using plain English intent.

Examples:
- "Find frontend developers with React and 2+ years"
- "Data science profiles with Python and ML"

What happens behind the scenes:
- ai-search function asks AI to rank candidates by relevance to query
- Returns ranked candidates with reasons
- UI displays ranked cards with explanation text

Business value:
- Enables fast discovery without strict Boolean filters or manual query syntax.

## 8. Navigation and Usability

Usability highlights:
- Persistent sidebar navigation
- Route-focused pages for each major workflow
- Toast notifications for success/failure feedback
- Animated card transitions for visual clarity

Business value:
- Lower learning curve and smoother recruiter workflow.

## End-to-End Feature Journey

Typical recruiter flow:
1. Upload resumes
2. Review newly created candidates
3. Create one or more job roles
4. Run AI matching for a job
5. Open candidates page with job context
6. Filter, inspect explanations, shortlist top profiles
7. Export CSV for sharing/reporting
8. Use AI Search for ad hoc hiring requests

## Current Limitations (Product Perspective)

1. Security/auth is prototype-oriented:
- Open table policies and no JWT validation on functions.

2. Resume extraction quality depends on file content format:
- UI supports PDF/DOCX/TXT selection, but extraction path currently relies on text content handling.

3. AI-dependent operations can fail due to rate limits or credits:
- Parse/match/search include basic error handling for these cases.

## Success Metrics You Can Track

1. Time-to-shortlist from resume upload
2. Percentage of roles matched within first attempt
3. Shortlist conversion rate by AI score band
4. Search-to-selection ratio for AI search queries
5. Recruiter actions per session (upload, match, shortlist, export)

## Demo Script (Quick)

1. Open dashboard and show pipeline counters.
2. Upload sample resumes and show auto-created candidates.
3. Create a role (for example, Frontend Developer).
4. Click Match and show ranked results.
5. Open a candidate card and explain strengths/gaps.
6. Shortlist top candidates.
7. Export CSV.
8. Run a natural language search and show ranked outcomes.
