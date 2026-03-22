import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Sən Azərbaycan Texnologiya Universitetinin (ATU) imtahan hazırlıq köməkçisisən. 
Tələbəyə verilən sualı geniş izah et. İzah aşağıdakı strukturda olmalıdır:

**Giriş:** Mövzunun qısa təqdimatı (2-3 cümlə)

**Əsas İzah:** Mövzunun dərin təhlili, əsas anlayışlar, tarixçə və praktiki tətbiqlər (əsas hissə, ən azı 3-4 abzas)

**Nəticə:** Yekun olaraq mövzunun əhəmiyyəti (1-2 cümlə)

Cavab akademik üslubda, Azərbaycan dilində olmalıdır və təxminən bir A4 vərəqi həcmində olmalıdır.`
          },
          {
            role: "user",
            content: `Bu sualı geniş izah et: "${question}"`
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çox sayda sorğu göndərildi, bir az gözləyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI xidmətinin limiti bitib." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI xətası baş verdi." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "İzah hazırlana bilmədi.";

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-explain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinməyən xəta" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
