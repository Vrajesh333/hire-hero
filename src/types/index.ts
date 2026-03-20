export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  skills: string[] | null;
  experience_min: number | null;
  experience_max: number | null;
  education: string | null;
  status: 'active' | 'closed' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[] | null;
  education: string | null;
  experience_years: number | null;
  certifications: string[] | null;
  projects: string | null;
  work_experience: string | null;
  resume_url: string | null;
  resume_filename: string | null;
  raw_text: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  id: string;
  job_id: string;
  candidate_id: string;
  overall_score: number;
  skill_score: number | null;
  experience_score: number | null;
  education_score: number | null;
  explanation: string | null;
  strengths: string[] | null;
  skill_gaps: string[] | null;
  missing_requirements: string[] | null;
  interview_questions: string[] | null;
  shortlisted: boolean;
  created_at: string;
}

export interface CandidateWithMatch extends Candidate {
  match?: MatchResult;
}
