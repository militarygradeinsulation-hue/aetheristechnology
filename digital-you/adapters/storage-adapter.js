/*!
 * Storage adapter — example wiring.
 *
 * The Essence Engine persists its whole database (core, team, memory, thought rules, goals,
 * tasks, decisions, ideas, corrections, proof, connected snapshots) through whatever object is
 * assigned to `window.DigitalYouStorageAdapter` before mount():
 *
 *   { load(key) -> Promise<any|null>, save(key, value) -> Promise<boolean> }
 *
 * Without one, the engine falls back to its own built-in localStorage adapter — that's what
 * makes the standalone prototype work by just opening the HTML file. This example file shows
 * the two upgrade paths: a slightly hardened localStorage version, and a REST/Supabase-shaped
 * remote adapter that maps onto ../schema.sql.
 *
 *   <script src="essence-engine.js"></script>
 *   <script src="adapters/storage-adapter.js"></script>
 *   <script>
 *     window.DigitalYouStorageAdapter = createRemoteStorageAdapter({
 *       baseUrl: "https://your-server.example.com/api/digital-you",
 *       identityId: "the-signed-in-user's-digital-identity-id"
 *     });
 *     EssenceEngine.mount(document.getElementById("app"));
 *   </script>
 */
(function (global) {
  "use strict";

  // Same contract as the engine's built-in default — kept here as a named, swappable adapter
  // so a project can start local and move to LocalStorageAdapter -> RemoteStorageAdapter without
  // touching essence-engine.js.
  var LocalStorageAdapter = {
    name: "localStorage",
    load: function (key) {
      return new Promise(function (resolve) {
        try { var raw = localStorage.getItem(key); resolve(raw ? JSON.parse(raw) : null); }
        catch (e) { resolve(null); }
      });
    },
    save: function (key, value) {
      return new Promise(function (resolve) {
        try { localStorage.setItem(key, JSON.stringify(value)); resolve(true); }
        catch (e) { resolve(false); }
      });
    }
  };

  // A REST-shaped remote adapter. It stores the whole engine DB as one JSON document per
  // digital identity — the simplest thing that works. A production backend can instead read
  // through schema.sql's normalized tables and assemble/decompose this same JSON shape server
  // side, without the browser ever needing to change.
  function createRemoteStorageAdapter(opts) {
    opts = opts || {};
    var baseUrl = (opts.baseUrl || "").replace(/\/$/, "");
    var identityId = opts.identityId || "default";
    var fetchOpts = opts.fetchOptions || {};

    return {
      name: "Remote (" + baseUrl + ")",
      load: function () {
        return fetch(baseUrl + "/identities/" + encodeURIComponent(identityId), Object.assign({ method: "GET" }, fetchOpts))
          .then(function (res) { return res.ok ? res.json() : null; })
          .catch(function () { return null; });
      },
      save: function (_key, value) {
        return fetch(baseUrl + "/identities/" + encodeURIComponent(identityId), Object.assign({
          method: "PUT",
          headers: Object.assign({ "Content-Type": "application/json" }, fetchOpts.headers || {}),
          body: JSON.stringify(value)
        }, fetchOpts))
          .then(function (res) { return res.ok; })
          .catch(function () { return false; });
      }
    };
  }

  // Direct-to-Supabase example (requires the supabase-js client to already be loaded as
  // `window.supabase` — see https://supabase.com/docs/reference/javascript). Table names match
  // ../schema.sql. This is the shape you'd use if the browser talks to Supabase directly under
  // Row Level Security, instead of going through your own REST server.
  function createSupabaseStorageAdapter(opts) {
    opts = opts || {};
    var client = opts.client || global.supabase;
    var identityId = opts.identityId;
    if (!client) throw new Error("createSupabaseStorageAdapter requires a Supabase client (opts.client or window.supabase).");

    return {
      name: "Supabase",
      load: function () {
        return client.from("digital_identities").select("*").eq("id", identityId).single()
          .then(function (r) { return r.data ? r.data.snapshot : null; });
      },
      save: function (_key, value) {
        return client.from("digital_identities")
          .upsert({ id: identityId, snapshot: value, updated_at: new Date().toISOString() })
          .then(function (r) { return !r.error; });
      }
    };
  }

  global.LocalStorageAdapter = LocalStorageAdapter;
  global.createRemoteStorageAdapter = createRemoteStorageAdapter;
  global.createSupabaseStorageAdapter = createSupabaseStorageAdapter;
})(window);
