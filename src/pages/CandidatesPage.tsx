import { AppLayout } from "@/components/AppLayout";
import { useCandidates, useMatchResults, useToggleShortlist, useJobs } from "@/lib/queries";
import { CandidateCard } from "@/components/CandidateCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { CandidateWithMatch } from "@/types";

export default function CandidatesPage() {
  const [searchParams] = useSearchParams();
  const jobIdParam = searchParams.get("job") || "";
  const [selectedJob, setSelectedJob] = useState(jobIdParam);
  const [skillFilter, setSkillFilter] = useState("");
  const [minExp, setMinExp] = useState("");
  const [minScore, setMinScore] = useState("");
  const [shortlistedOnly, setShortlistedOnly] = useState(false);

  const { data: jobs } = useJobs();
  const { data: candidates } = useCandidates();
  const { data: matchResults } = useMatchResults(selectedJob || undefined);
  const toggleShortlist = useToggleShortlist();

  const merged = useMemo<CandidateWithMatch[]>(() => {
    if (!candidates) return [];
    return candidates.map((c) => ({
      ...c,
      match: matchResults?.find((m) => m.candidate_id === c.id),
    }));
  }, [candidates, matchResults]);

  const filtered = useMemo(() => {
    let list = [...merged];

    if (skillFilter.trim()) {
      const terms = skillFilter.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
      list = list.filter((c) =>
        terms.some((t) => c.skills?.some((s) => s.toLowerCase().includes(t)))
      );
    }

    if (minExp) {
      list = list.filter((c) => (c.experience_years ?? 0) >= parseInt(minExp));
    }

    if (minScore && selectedJob) {
      list = list.filter((c) => (c.match?.overall_score ?? 0) >= parseInt(minScore));
    }

    if (shortlistedOnly) {
      list = list.filter((c) => c.match?.shortlisted);
    }

    // Sort by match score if available
    if (selectedJob) {
      list.sort((a, b) => (b.match?.overall_score ?? 0) - (a.match?.overall_score ?? 0));
    }

    return list;
  }, [merged, skillFilter, minExp, minScore, shortlistedOnly, selectedJob]);

  const exportCSV = () => {
    const rows = [["Rank", "Name", "Email", "Skills", "Experience", "Score", "Shortlisted"]];
    filtered.forEach((c, i) => {
      rows.push([
        String(i + 1),
        c.name || "",
        c.email || "",
        c.skills?.join("; ") || "",
        String(c.experience_years ?? ""),
        String(c.match?.overall_score ?? ""),
        c.match?.shortlisted ? "Yes" : "No",
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Candidates</h2>
            <p className="text-muted-foreground">{filtered.length} candidate(s) found</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-48">
            <label className="text-xs text-muted-foreground mb-1 block">Job Role</label>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger><SelectValue placeholder="All candidates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All candidates</SelectItem>
                {jobs?.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <label className="text-xs text-muted-foreground mb-1 block">Filter by Skills</label>
            <Input placeholder="React, Python..." value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
          </div>
          <div className="w-32">
            <label className="text-xs text-muted-foreground mb-1 block">Min Experience</label>
            <Input type="number" placeholder="0" value={minExp} onChange={(e) => setMinExp(e.target.value)} />
          </div>
          {selectedJob && selectedJob !== "all" && (
            <div className="w-32">
              <label className="text-xs text-muted-foreground mb-1 block">Min Score %</label>
              <Input type="number" placeholder="0" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
            </div>
          )}
          <Button
            variant={shortlistedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShortlistedOnly(!shortlistedOnly)}
          >
            <Filter className="h-3 w-3 mr-1" /> Shortlisted
          </Button>
        </div>

        {/* Candidate List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c, i) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              rank={selectedJob && selectedJob !== "all" ? i + 1 : undefined}
              onToggleShortlist={
                selectedJob && selectedJob !== "all"
                  ? (id, val) => toggleShortlist.mutate({ id, shortlisted: val })
                  : undefined
              }
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-heading">No candidates found</p>
            <p className="text-sm mt-1">Upload resumes or adjust your filters.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
