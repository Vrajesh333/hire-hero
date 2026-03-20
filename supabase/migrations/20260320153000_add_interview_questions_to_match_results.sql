ALTER TABLE public.match_results
ADD COLUMN IF NOT EXISTS interview_questions TEXT[] DEFAULT '{}'::TEXT[];
