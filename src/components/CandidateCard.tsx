import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ScoreBar } from "@/components/ScoreBar";
import { Star, StarOff, Mail, Phone, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { CandidateWithMatch } from "@/types";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CandidateCardProps {
  candidate: CandidateWithMatch;
  onToggleShortlist?: (id: string, shortlisted: boolean) => void;
  rank?: number;
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower === "not provided" || lower === "n/a" || lower === "na" || lower === "unknown") {
    return null;
  }

  return normalized;
}

export function CandidateCard({ candidate, onToggleShortlist, rank }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const m = candidate.match;
  const displayName = cleanText(candidate.name) || cleanText(candidate.resume_filename) || "Candidate";
  const displayEmail = cleanText(candidate.email);
  const displayPhone = cleanText(candidate.phone);
  const displayEducation = cleanText(candidate.education);
  const displaySkills = (candidate.skills ?? [])
    .map((skill) => cleanText(skill))
    .filter((skill): skill is string => Boolean(skill));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="shadow-card hover:shadow-elevated transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {rank && (
                <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-heading font-bold text-sm">#{rank}</span>
                </div>
              )}
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{displayName}</CardTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {displayEmail && (
                    <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{displayEmail}</span>
                  )}
                  {displayPhone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{displayPhone}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {m && <ScoreBadge score={m.overall_score} />}
              {m && onToggleShortlist && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleShortlist(m.id, !m.shortlisted)}
                  className={m.shortlisted ? "text-score-medium" : "text-muted-foreground"}
                >
                  {m.shortlisted ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Skills */}
          {displaySkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displaySkills.slice(0, 8).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
              {displaySkills.length > 8 && (
                <Badge variant="outline" className="text-xs">+{displaySkills.length - 8}</Badge>
              )}
            </div>
          )}

          {/* Quick info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {candidate.experience_years != null && <span>{candidate.experience_years} yrs exp</span>}
            {displayEducation && <span className="truncate">{displayEducation}</span>}
          </div>

          {/* Score bars */}
          {m && (
            <div className="grid grid-cols-3 gap-3">
              <ScoreBar label="Skills" score={m.skill_score ?? 0} />
              <ScoreBar label="Experience" score={m.experience_score ?? 0} />
              <ScoreBar label="Education" score={m.education_score ?? 0} />
            </div>
          )}

          {/* Expand button */}
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? "Show less" : "Show details"}
          </Button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-3"
              >
                {/* AI Summary */}
                {candidate.ai_summary && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">{candidate.ai_summary}</div>
                )}

                {/* Strengths */}
                {m?.strengths && m.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-score-high" /> Strengths
                    </p>
                    <ul className="text-xs space-y-0.5 pl-4">
                      {m.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Skill Gaps */}
                {m?.skill_gaps && m.skill_gaps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-score-medium" /> Skill Gaps
                    </p>
                    <ul className="text-xs space-y-0.5 pl-4">
                      {m.skill_gaps.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Missing */}
                {m?.missing_requirements && m.missing_requirements.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-score-low" /> Missing Requirements
                    </p>
                    <ul className="text-xs space-y-0.5 pl-4">
                      {m.missing_requirements.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Explanation */}
                {m?.explanation && (
                  <div className="text-xs text-muted-foreground italic border-l-2 border-primary/20 pl-3">
                    {m.explanation}
                  </div>
                )}

                {/* Interview Questions */}
                {m?.interview_questions && m.interview_questions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Suggested Interview Questions</p>
                    <ul className="text-xs space-y-1 pl-4 list-disc">
                      {m.interview_questions.map((question, i) => <li key={i}>{question}</li>)}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
