import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get job
    const { data: job, error: jobErr } = await supabase.from("jobs").select("*").eq("id", job_id).single();
    if (jobErr) throw jobErr;

    // Get all candidates
    const { data: candidates, error: candErr } = await supabase.from("candidates").select("*");
    if (candErr) throw candErr;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let matched = 0;
    let questionsGenerated = 0;
    // Process in batches of 3
    for (let i = 0; i < candidates.length; i += 3) {
      const batch = candidates.slice(i, i + 3);
      const promises = batch.map(async (candidate: any) => {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: "You are a recruitment expert. Score candidates against job requirements with contextual understanding, not just keyword matching.",
              },
              {
                role: "user",
                content: `Score this candidate against the job. Use deep contextual analysis.

JOB:
Title: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements || "None specified"}
Skills needed: ${(job.skills || []).join(", ")}
Experience: ${job.experience_min || 0}-${job.experience_max || "any"} years
Education: ${job.education || "Any"}

CANDIDATE:
Name: ${candidate.name}
Skills: ${(candidate.skills || []).join(", ")}
Experience: ${candidate.experience_years || "Unknown"} years
Education: ${candidate.education || "Unknown"}
Work: ${(candidate.work_experience || "").slice(0, 1500)}
Summary: ${candidate.ai_summary || ""}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "score_candidate",
                  description: "Score a candidate against a job",
                  parameters: {
                    type: "object",
                    properties: {
                      overall_score: { type: "number", description: "0-100 overall match" },
                      skill_score: { type: "number", description: "0-100 skill relevance" },
                      experience_score: { type: "number", description: "0-100 experience fit" },
                      education_score: { type: "number", description: "0-100 education fit" },
                      explanation: { type: "string", description: "Brief match explanation" },
                      strengths: { type: "array", items: { type: "string" }, description: "Key strengths" },
                      skill_gaps: { type: "array", items: { type: "string" }, description: "Missing skills" },
                      missing_requirements: { type: "array", items: { type: "string" }, description: "Unmet requirements" },
                      interview_questions: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 5,
                        maxItems: 8,
                        description: "Targeted interview questions tailored to this job and candidate",
                      },
                    },
                    required: ["overall_score", "skill_score", "experience_score", "education_score", "explanation", "strengths", "skill_gaps", "missing_requirements", "interview_questions"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "score_candidate" } },
          }),
        });

        if (!aiResponse.ok) {
          console.error("AI error for candidate", candidate.id, aiResponse.status);
          return;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) return;

        const scores = JSON.parse(toolCall.function.arguments);

        // Upsert match result
        await supabase.from("match_results").upsert({
          job_id,
          candidate_id: candidate.id,
          overall_score: scores.overall_score,
          skill_score: scores.skill_score,
          experience_score: scores.experience_score,
          education_score: scores.education_score,
          explanation: scores.explanation,
          strengths: scores.strengths,
          skill_gaps: scores.skill_gaps,
          missing_requirements: scores.missing_requirements,
          interview_questions: scores.interview_questions,
        }, { onConflict: "job_id,candidate_id" });

        if (Array.isArray(scores.interview_questions) && scores.interview_questions.length > 0) {
          questionsGenerated++;
        }
        matched++;
      });

      await Promise.all(promises);
      // Small delay between batches
      if (i + 3 < candidates.length) await new Promise((r) => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({ matched, questions_generated: questionsGenerated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-candidates error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
