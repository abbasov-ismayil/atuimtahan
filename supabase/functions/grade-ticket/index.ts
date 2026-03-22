import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions, answers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!questions || !answers || questions.length !== answers.length) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = questions.map((q: string, i: number) => {
      const answer = answers[i]?.trim();
      return `Sual ${i + 1}: ${q}\nTələbənin cavabı: ${answer ? answer : "(BOŞ - cavab verilməyib)"}\n`;
    }).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sən universitet müəllimisən. Tələbənin yazılı imtahan cavablarını qiymətləndirirsən.
Hər sualı 0-10 bal arasında qiymətləndir. Boş cavablar 0 bal almalıdır.
Qiymətləndirmə meyarları:
- 0: Cavab verilməyib və ya tamamilə yanlış
- 1-3: Zəif, çox səthi və ya yarımçıq
- 4-6: Orta, əsas məqamları qismən əhatə edir
- 7-8: Yaxşı, əsas məqamları düzgün izah edir
- 9-10: Əla, tam və dəqiq cavab

CAVABINI MÜTLƏQ bu JSON formatında ver (heç bir əlavə mətn olmadan):
{"scores": [bal1, bal2, bal3, bal4, bal5], "feedback": ["rəy1", "rəy2", "rəy3", "rəy4", "rəy5"]}`
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "grade_answers",
              description: "Grade student answers and provide feedback",
              parameters: {
                type: "object",
                properties: {
                  scores: {
                    type: "array",
                    items: { type: "number" },
                    description: "Score for each answer (0-10)"
                  },
                  feedback: {
                    type: "array",
                    items: { type: "string" },
                    description: "Brief feedback for each answer in Azerbaijani"
                  }
                },
                required: ["scores", "feedback"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "grade_answers" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çox sayda sorğu göndərildi, bir az gözləyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI xidməti limitinə çatılıb." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    
    // Extract from tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content directly
    const content = aiResponse.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("grade-ticket error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
