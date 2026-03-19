import { supabase } from "@/integrations/supabase/client";
import type { Job, Candidate, MatchResult } from "@/types";

// Jobs
export async function fetchJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Job[]) ?? [];
}

export async function createJob(job: Omit<Job, "id" | "created_at" | "updated_at">): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .insert(job as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Job;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw error;
}

// Candidates
export async function fetchCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Candidate[]) ?? [];
}

export async function createCandidate(candidate: Partial<Candidate>): Promise<Candidate> {
  const { data, error } = await supabase
    .from("candidates")
    .insert(candidate as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Candidate;
}

export async function deleteCandidate(id: string): Promise<void> {
  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) throw error;
}

// Match Results
export async function fetchMatchResults(jobId: string): Promise<MatchResult[]> {
  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("job_id", jobId)
    .order("overall_score", { ascending: false });
  if (error) throw error;
  return (data as unknown as MatchResult[]) ?? [];
}

export async function toggleShortlist(id: string, shortlisted: boolean): Promise<void> {
  const { error } = await supabase
    .from("match_results")
    .update({ shortlisted } as any)
    .eq("id", id);
  if (error) throw error;
}
