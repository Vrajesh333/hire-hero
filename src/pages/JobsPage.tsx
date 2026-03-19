import { AppLayout } from "@/components/AppLayout";
import { JobForm } from "@/components/JobForm";
import { useJobs, useDeleteJob } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const deleteJob = useDeleteJob();
  const [matchingJobId, setMatchingJobId] = useState<string | null>(null);
  const qc = useQueryClient();

  const runMatching = async (jobId: string) => {
    setMatchingJobId(jobId);
    try {
      const { data, error } = await supabase.functions.invoke("match-candidates", {
        body: { job_id: jobId },
      });
      if (error) throw error;
      toast.success(`Matching complete! ${data?.matched ?? 0} candidates scored.`);
      qc.invalidateQueries({ queryKey: ["match_results", jobId] });
    } catch (err: any) {
      toast.error(err.message || "Matching failed");
    } finally {
      setMatchingJobId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Job Roles</h2>
          <p className="text-muted-foreground">Create job descriptions and run AI matching against uploaded candidates.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <JobForm />

          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg">Existing Jobs</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <Card key={job.id} className="shadow-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{job.title}</CardTitle>
                        <Badge variant={job.status === "active" ? "default" : "secondary"} className="mt-1 text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runMatching(job.id)}
                          disabled={matchingJobId === job.id}
                        >
                          {matchingJobId === job.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                          Match
                        </Button>
                        <Link to={`/candidates?job=${job.id}`}>
                          <Button size="sm" variant="ghost">Results</Button>
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteJob.mutate(job.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No jobs yet. Create one to start matching!</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
