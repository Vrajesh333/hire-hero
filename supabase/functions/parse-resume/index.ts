import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const message = anyErr.message;
    if (typeof message === "string" && message.trim()) return message;

    const details = anyErr.details;
    const hint = anyErr.hint;
    const code = anyErr.code;

    const parts = [details, hint, code]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    if (parts.length > 0) return parts.join(" | ");

    try {
      const serialized = JSON.stringify(err);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Ignore JSON serialization errors and fall through to fallback.
    }
  }

  return "Unknown error";
}

function safeJsonParse(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function extractFirstJsonObject(value: string): Record<string, unknown> | null {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const candidate = value.slice(firstBrace, lastBrace + 1);
  return safeJsonParse(candidate);
}

function extractParsedResume(aiData: any): Record<string, unknown> {
  const toolArgs = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof toolArgs === "string") {
    const parsed = safeJsonParse(toolArgs) || extractFirstJsonObject(toolArgs);
    if (parsed) return parsed;
  }

  const content = aiData?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const parsed = safeJsonParse(content) || extractFirstJsonObject(content);
    if (parsed) return parsed;
  }

  throw new Error("AI did not return parseable resume data");
}

function normalizeParsedResume(parsed: Record<string, unknown>) {
  const getString = (key: string): string | null => {
    const value = parsed[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };

  const getStringArray = (key: string): string[] => {
    const value = parsed[key];
    if (!Array.isArray(value)) return [];
    return value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const getNumber = (key: string): number | null => {
    const value = parsed[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  return {
    name: getString("name"),
    email: getString("email"),
    phone: getString("phone"),
    skills: getStringArray("skills"),
    education: getString("education"),
    experience_years: getNumber("experience_years"),
    certifications: getStringArray("certifications"),
    projects: getString("projects"),
    work_experience: getString("work_experience"),
    ai_summary: getString("ai_summary"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { filename, content, resume_url } = await req.json();
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
    const parsedRaw = extractParsedResume(aiData);
    const parsed = normalizeParsedResume(parsedRaw);

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
      resume_url: resume_url || null,
      raw_text: content.slice(0, 10000),
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, candidate: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(JSON.stringify({ error: toErrorMessage(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
