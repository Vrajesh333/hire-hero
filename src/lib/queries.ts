import { QueryClient, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, createJob, deleteJob, fetchCandidates, createCandidate, deleteCandidate, deleteCandidates, deleteAllCandidates, fetchMatchResults, toggleShortlist } from "./api";
import type { Job, Candidate } from "@/types";

export function useJobs() {
  return useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useCandidates() {
  return useQuery({ queryKey: ["candidates"], queryFn: fetchCandidates });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCandidate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });
}

export function useDeleteCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCandidates,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["candidates"] });
      await qc.invalidateQueries({ queryKey: ["match_results"] });
    },
  });
}

export function useDeleteAllCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAllCandidates,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["candidates"] });
      await qc.invalidateQueries({ queryKey: ["match_results"] });
    },
  });
}

export function useMatchResults(jobId: string | undefined) {
  return useQuery({
    queryKey: ["match_results", jobId],
    queryFn: () => fetchMatchResults(jobId!),
    enabled: !!jobId,
  });
}

export function useToggleShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, shortlisted }: { id: string; shortlisted: boolean }) =>
      toggleShortlist(id, shortlisted),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match_results"] }),
  });
}
