import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CandidateCard } from "@/components/CandidateCard";
import { Search, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CandidateWithMatch } from "@/types";
import { motion } from "framer-motion";

const SUGGESTIONS = [
  "Find best frontend developers with React and 2+ years experience",
  "Top candidates for data science role with Python and ML",
  "Backend engineers with Node.js and AWS experience",
  "Full-stack developers with TypeScript skills",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CandidateWithMatch[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-search", {
        body: { query: q },
      });
      if (error) throw error;
      setResults(data?.candidates ?? []);
      if (!data?.candidates?.length) {
        toast.info("No matching candidates found. Try a different query or upload more resumes.");
      }
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AI Search
          </h2>
          <p className="text-muted-foreground">Search candidates using natural language queries.</p>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Find best frontend developers with React and 2+ years experience"
              rows={3}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSearch())}
            />
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="text-xs" onClick={() => { setQuery(s); handleSearch(s); }}>
                    {s.slice(0, 40)}...
                  </Button>
                ))}
              </div>
              <Button onClick={() => handleSearch()} disabled={searching} className="gradient-primary text-primary-foreground">
                {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{results.length} result(s)</p>
            {results.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <CandidateCard candidate={c} rank={i + 1} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
