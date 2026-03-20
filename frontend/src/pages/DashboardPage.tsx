import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobs, useCandidates } from "@/lib/queries";
import { Users, Briefcase, TrendingUp, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { data: jobs } = useJobs();
  const { data: candidates } = useCandidates();

  const stats = [
    { label: "Total Candidates", value: candidates?.length ?? 0, icon: Users, color: "text-primary" },
    { label: "Active Jobs", value: jobs?.filter((j) => j.status === "active").length ?? 0, icon: Briefcase, color: "text-accent" },
    { label: "Total Jobs", value: jobs?.length ?? 0, icon: FileText, color: "text-muted-foreground" },
    { label: "Avg Skills/Candidate", value: candidates?.length ? Math.round(candidates.reduce((a, c) => a + (c.skills?.length ?? 0), 0) / candidates.length) : 0, icon: TrendingUp, color: "text-score-high" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your recruitment pipeline</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="shadow-card">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-heading font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/upload"><Button variant="outline" className="w-full justify-start">📄 Upload Resumes</Button></Link>
              <Link to="/jobs"><Button variant="outline" className="w-full justify-start">💼 Create Job Role</Button></Link>
              <Link to="/search"><Button variant="outline" className="w-full justify-start">🔍 AI Search</Button></Link>
              <Link to="/candidates"><Button variant="outline" className="w-full justify-start">👥 View Candidates</Button></Link>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Recent Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              {candidates && candidates.length > 0 ? (
                <div className="space-y-2">
                  {candidates.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{c.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{c.skills?.slice(0, 3).join(", ")}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.experience_years ? `${c.experience_years}y` : "—"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No candidates yet. Upload some resumes to get started!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
