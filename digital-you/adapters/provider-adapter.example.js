/*!
 * AI provider adapter — example wiring.
 *
 * The Essence Engine (essence-engine.js) never talks to an LLM provider directly and never
 * stores a provider API key in the browser. It calls whatever object is assigned to
 * `window.DigitalYouProviderAdapter` before mount(), using this shape:
 *
 *   {
 *     isRemote: true,                              // engine ignores non-remote adapters for
 *                                                    // decomposeGoal/evaluateDecision and falls
 *                                                    // back to its own local heuristic
 *     name: "My Backend",                           // shown in Settings / Proof reasons
 *     decomposeGoal(goal, context) -> Promise<Array<{title, description}>>,
 *     evaluateDecision(problem, context) -> Promise<{recommendation, confidence, reasoningTrace}|null>,
 *     testVoice() -> Promise<{connected, message}>
 *   }
 *
 * This file is a REFERENCE CLIENT. It proxies every call to your own backend
 * (see ../server/provider-server.example.js) — the real Anthropic/OpenAI/etc. key lives there,
 * never here. Include this file after essence-engine.js and before EssenceEngine.mount(), or
 * call EssenceEngine.setProviderAdapter(...) at any time to swap providers live.
 *
 *   <script src="essence-engine.js"></script>
 *   <script src="adapters/provider-adapter.example.js"></script>
 *   <script>
 *     window.DigitalYouProviderAdapter = createRemoteProviderAdapter({
 *       baseUrl: "https://your-server.example.com/api/digital-you",
 *       name: "Aetheris Backend"
 *     });
 *     EssenceEngine.mount(document.getElementById("app"));
 *   </script>
 */
(function (global) {
  "use strict";

  function createRemoteProviderAdapter(opts) {
    opts = opts || {};
    var baseUrl = (opts.baseUrl || "").replace(/\/$/, "");
    var name = opts.name || "Remote Provider";
    var fetchOpts = opts.fetchOptions || {}; // e.g. { headers: { Authorization: "Bearer <session token>" } }

    function post(path, body) {
      if (!baseUrl) return Promise.reject(new Error("No backend baseUrl configured for the provider adapter."));
      return fetch(baseUrl + path, Object.assign({
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, fetchOpts.headers || {}),
        body: JSON.stringify(body)
      }, fetchOpts)).then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw new Error("Backend " + res.status + ": " + t); });
        return res.json();
      });
    }

    return {
      isRemote: true,
      name: name,

      // messages: [{role:'user'|'assistant'|'system', content:string}]
      chat: function (messages, chatOpts) {
        return post("/chat", { messages: messages, options: chatOpts || {} });
      },

      // goal: { id, outcome, ownerInstanceId } ; context: { core, instance }
      decomposeGoal: function (goal, context) {
        return post("/decompose-goal", { goal: goal, context: context })
          .then(function (r) { return Array.isArray(r.tasks) ? r.tasks : null; });
      },

      // problem: string ; context: { core, instance, memory, thoughtRules }
      evaluateDecision: function (problem, context) {
        return post("/evaluate-decision", { problem: problem, context: context })
          .then(function (r) { return r || null; });
      },

      testVoice: function () {
        if (!baseUrl) {
          return Promise.resolve({ connected: false, message: "No backend baseUrl configured — set one in Voice & Identity, or pass baseUrl to createRemoteProviderAdapter()." });
        }
        return post("/test-voice", {})
          .then(function (r) { return { connected: !!r.connected, message: r.message || "" }; })
          .catch(function (e) { return { connected: false, message: "Backend unreachable: " + e.message }; });
      }
    };
  }

  global.createRemoteProviderAdapter = createRemoteProviderAdapter;
})(window);
