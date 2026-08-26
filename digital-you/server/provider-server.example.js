/*!
 * Digital You provider server — reference implementation.
 *
 * This is where the real AI provider API key lives. adapters/provider-adapter.example.js
 * (browser side) POSTs to this server; this server holds ANTHROPIC_API_KEY and talks to
 * Claude. The key never reaches the browser.
 *
 * Run it:
 *   npm install @anthropic-ai/sdk zod
 *   ANTHROPIC_API_KEY=sk-ant-... node --experimental-vm-modules server/provider-server.example.js
 *   (ESM: either rename to provider-server.example.mjs, or add "type": "module" to package.json)
 *
 * Then in the browser:
 *   window.DigitalYouProviderAdapter = createRemoteProviderAdapter({
 *     baseUrl: "http://localhost:8787", name: "Aetheris Backend"
 *   });
 *
 * Endpoints: POST /chat, /decompose-goal, /evaluate-decision, /test-voice — the exact shape
 * adapters/provider-adapter.example.js expects.
 */
import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const PORT = process.env.PORT || 8787;
const MODEL = "claude-opus-5";

// Reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the server's own environment.
const client = new Anthropic();

const DecompositionSchema = z.object({
  tasks: z.array(z.object({ title: z.string(), description: z.string() })).min(3).max(8)
});

const EvaluationSchema = z.object({
  recommendation: z.string(),
  confidence: z.number().min(0).max(1),
  reasoningTrace: z.array(z.object({ type: z.string(), label: z.string(), score: z.number() }))
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    var chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch (e) { reject(new Error("Invalid JSON body: " + e.message)); }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const routes = {
  "POST /chat": async (body) => {
    var messages = Array.isArray(body.messages) ? body.messages : [];
    var response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: "You are Digital You, an authorized digital extension of a real person. Be direct, concise, and honest about uncertainty.",
      messages: messages
    });
    var textBlock = response.content.find((b) => b.type === "text");
    return { reply: textBlock ? textBlock.text : "" };
  },

  "POST /decompose-goal": async (body) => {
    var goal = body.goal || {};
    var context = body.context || {};
    var core = context.core || {};
    var response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: "Break the outcome into 3-6 concrete tasks a specialized Digital You could execute or hand off. Respect the identity's stated standards and boundaries. Do not pad with filler tasks.",
      messages: [{
        role: "user",
        content: "Outcome: " + goal.outcome +
          "\nIdentity mission: " + (core.mission || "") +
          "\nStandards: " + JSON.stringify(core.standards || []) +
          "\nBoundaries: " + JSON.stringify(core.boundaries || [])
      }],
      output_config: { format: zodOutputFormat(DecompositionSchema) }
    });
    if (!response.parsed_output) throw new Error("Model did not return valid structured output for decompose-goal");
    return { tasks: response.parsed_output.tasks };
  },

  "POST /evaluate-decision": async (body) => {
    var problem = body.problem || "";
    var context = body.context || {};
    var response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: "You are evaluating a real decision on behalf of the identity described in the supplied context. Ground the recommendation in the given memory and decision rules — do not invent facts not present in context. Return a calibrated confidence (0-1), not a maximal one.",
      messages: [{
        role: "user",
        content: JSON.stringify({
          problem: problem,
          mission: context.core && context.core.mission,
          boundaries: context.core && context.core.boundaries,
          memory: context.memory || [],
          thoughtRules: context.thoughtRules || []
        })
      }],
      output_config: { format: zodOutputFormat(EvaluationSchema) }
    });
    if (!response.parsed_output) throw new Error("Model did not return valid structured output for evaluate-decision");
    return response.parsed_output;
  },

  "POST /test-voice": async () => {
    // Voice/avatar generation is a separate provider (ElevenLabs, HeyGen, etc.) from the
    // reasoning model above — wire that provider's real call here. This reference only
    // reports honestly on whether a key is configured, rather than faking a connection.
    var configured = !!process.env.VOICE_PROVIDER_API_KEY;
    return {
      connected: configured,
      message: configured
        ? "Voice provider key present on the server — wire the actual provider call in this handler."
        : "No VOICE_PROVIDER_API_KEY set on this server. This endpoint is reachable but no voice/avatar provider is configured yet."
    };
  }
};

const server = http.createServer(function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // tighten to your real origin in production
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  var key = req.method + " " + (req.url || "").split("?")[0];
  var handler = routes[key];
  if (!handler) { send(res, 404, { error: "Not found: " + key }); return; }

  readJson(req)
    .then(handler)
    .then((result) => send(res, 200, result))
    .catch((err) => send(res, 500, { error: err.message }));
});

server.listen(PORT, function () {
  console.log("Digital You provider server listening on :" + PORT);
  console.log("Endpoints: POST /chat, /decompose-goal, /evaluate-decision, /test-voice");
});
