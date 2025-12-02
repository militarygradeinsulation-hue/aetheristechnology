import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a friendly and knowledgeable AI assistant for Aetheris AI Technology. 

About Aetheris AI:
- We're an AI solutions company that transforms businesses with cutting-edge artificial intelligence
- Our CEO is Joseph Toney, a proven leader with 20+ years of experience and Marine Corps background
- We serve six key industries: Corporate & Enterprise, Logistics, Food Service, Construction, Healthcare, and Automotive
- We provide white label quality services for premium companies

Our main services include:
- Machine Learning: Custom ML models, predictive analytics, neural networks
- AI Automation: Process automation, smart workflows, task optimization
- Custom AI Development: End-to-end AI solutions, API integration, model training
- Data Intelligence: Transform raw data into actionable insights
- AI Consulting: Strategic guidance for AI transformation
- Performance Optimization: Supercharge existing AI systems

We also offer:
- Custom CRM/ERP solutions built for unique business needs
- AI-powered lead generators that discover and qualify high-value leads automatically
- Autonomous workforce solutions with 24/7 operations
- NeuralHub: A smart command center that connects everything

Our value proposition: "You know you need AI for your business, but you don't know where to start. I do."

Contact: theaiformarketing@gmail.com and joseph@aetheris.technology
Location: Indianapolis, Indiana

Be conversational, enthusiastic, and helpful. Answer questions about our services, explain how AI can help their business, and encourage them to reach out for a consultation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

    return new Response(
      JSON.stringify({ message: aiMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in voice-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
