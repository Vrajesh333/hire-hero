// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) throw new Error("query required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all candidates
    const { data: candidates, error } = await supabase.from("candidates").select("*");
    if (error) throw error;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ candidates: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build candidate summaries for AI
    const summaries = candidates.map((c: any, i: number) =>
      `[${i}] ${c.name || "Unknown"} | Skills: ${(c.skills || []).join(", ")} | Exp: ${c.experience_years || "?"}y | Edu: ${c.education || "?"} | ${(c.ai_summary || "").slice(0, 200)}`
    ).join("\n");

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
            content: "You are a recruitment AI. Given a search query and candidate list, return the best matching candidates ranked by relevance. Use contextual understanding.",
          },
          {
            role: "user",
            content: `Search query: "${query}"

Candidates:
${summaries}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_search_results",
              description: "Return ranked search results",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Candidate index from the list" },
                        score: { type: "number", description: "0-100 relevance score" },
                        reason: { type: "string", description: "Why this candidate matches" },
                      },
                      required: ["index", "score", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_search_results" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ candidates: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { results } = JSON.parse(toolCall.function.arguments);

    // Map results to candidate data with match info
    const rankedCandidates = results
      .filter((r: any) => r.index >= 0 && r.index < candidates.length)
      .sort((a: any, b: any) => b.score - a.score)
      .map((r: any) => ({
        ...candidates[r.index],
        match: {
          id: `search-${r.index}`,
          overall_score: r.score,
          skill_score: r.score,
          experience_score: r.score,
          education_score: r.score,
          explanation: r.reason,
          strengths: [],
          skill_gaps: [],
          missing_requirements: [],
          shortlisted: false,
        },
      }));

    return new Response(JSON.stringify({ candidates: rankedCandidates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
