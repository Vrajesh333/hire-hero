import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { filename, content } = await req.json();
    if (!content) throw new Error("No content provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use AI to extract structured data from resume text
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
            content: `You are a resume parser. Extract structured information from resumes. Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Parse this resume and extract: name, email, phone, skills (array), education, experience_years (number), certifications (array), projects (text summary), work_experience (text summary), and a brief ai_summary.

Resume text:
${content.slice(0, 8000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_parsed_resume",
              description: "Save parsed resume data",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  skills: { type: "array", items: { type: "string" } },
                  education: { type: "string" },
                  experience_years: { type: "number" },
                  certifications: { type: "array", items: { type: "string" } },
                  projects: { type: "string" },
                  work_experience: { type: "string" },
                  ai_summary: { type: "string" },
                },
                required: ["name", "skills", "ai_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_parsed_resume" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return parsed data");

    const parsed = JSON.parse(toolCall.function.arguments);

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from("candidates").insert({
      name: parsed.name || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      skills: parsed.skills || [],
      education: parsed.education || null,
      experience_years: parsed.experience_years || null,
      certifications: parsed.certifications || [],
      projects: parsed.projects || null,
      work_experience: parsed.work_experience || null,
      ai_summary: parsed.ai_summary || null,
      resume_filename: filename,
      raw_text: content.slice(0, 10000),
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, candidate: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
