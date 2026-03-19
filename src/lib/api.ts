import { supabase } from "@/integrations/supabase/client";
import type { Job, Candidate, MatchResult } from "@/types";

// Use any-typed client to bypass strict table typing until types regenerate
const db = supabase as any;

export async function fetchJobs(): Promise<Job[]> {
  const { data, error } = await db.from("jobs").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createJob(job: Omit<Job, "id" | "created_at" | "updated_at">): Promise<Job> {
  const { data, error } = await db.from("jobs").insert(job).select().single();
  if (error) throw error;
  return data;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await db.from("jobs").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCandidates(): Promise<Candidate[]> {
  const { data, error } = await db.from("candidates").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCandidate(candidate: Partial<Candidate>): Promise<Candidate> {
  const { data, error } = await db.from("candidates").insert(candidate).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCandidate(id: string): Promise<void> {
  const { error } = await db.from("candidates").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMatchResults(jobId: string): Promise<MatchResult[]> {
  const { data, error } = await db.from("match_results").select("*").eq("job_id", jobId).order("overall_score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function toggleShortlist(id: string, shortlisted: boolean): Promise<void> {
  const { error } = await db.from("match_results").update({ shortlisted }).eq("id", id);
  if (error) throw error;
}
