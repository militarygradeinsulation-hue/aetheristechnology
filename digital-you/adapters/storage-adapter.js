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

    // The engine currently only ever persists one logical key (essence_engine_db_v1), but the
    // adapter contract is load(key)/save(key, value) — honor it by namespacing the resource
    // path per key, so a future second key doesn't silently co-mingle with this one.
    function resourceUrl(key) {
      return baseUrl + "/identities/" + encodeURIComponent(identityId) + "/" + encodeURIComponent(key);
    }

    return {
      name: "Remote (" + baseUrl + ")",
      load: function (key) {
        return fetch(resourceUrl(key), Object.assign({ method: "GET" }, fetchOpts))
          .then(function (res) { return res.ok ? res.json() : null; })
          .catch(function () { return null; });
      },
      save: function (key, value) {
        return fetch(resourceUrl(key), Object.assign({
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
  // `window.supabase` — see https://supabase.com/docs/reference/javascript). Stores the engine's
  // whole JSON document in digital_identities.snapshot (see ../schema.sql — that column is a
  // deliberate escape hatch for adapters like this one; the rest of the schema is normalized
  // for a backend that reads/writes the individual tables instead). This is the shape you'd use
  // if the browser talks to Supabase directly under Row Level Security, instead of going
  // through your own REST server.
  function createSupabaseStorageAdapter(opts) {
    opts = opts || {};
    var client = opts.client || global.supabase;
    var identityId = opts.identityId;
    if (!client) throw new Error("createSupabaseStorageAdapter requires a Supabase client (opts.client or window.supabase).");
    if (!identityId) throw new Error("createSupabaseStorageAdapter requires opts.identityId (the digital_identities row's UUID).");

    return {
      name: "Supabase",
      // snapshot is keyed by `key` so multiple logical documents can share one identity row.
      load: function (key) {
        return client.from("digital_identities").select("snapshot").eq("id", identityId).single()
          .then(function (r) {
            if (r.error) { console.error("[Supabase storage] load failed:", r.error.message); return null; }
            return r.data && r.data.snapshot ? (r.data.snapshot[key] || null) : null;
          });
      },
      save: function (key, value) {
        return client.from("digital_identities").select("snapshot").eq("id", identityId).single()
          .then(function (r) {
            var snapshot = (r.data && r.data.snapshot) || {};
            snapshot[key] = value;
            return client.from("digital_identities")
              .update({ snapshot: snapshot, updated_at: new Date().toISOString() })
              .eq("id", identityId);
          })
          .then(function (r) {
            if (r.error) { console.error("[Supabase storage] save failed:", r.error.message); return false; }
            return true;
          });
      }
    };
  }

  global.LocalStorageAdapter = LocalStorageAdapter;
  global.createRemoteStorageAdapter = createRemoteStorageAdapter;
  global.createSupabaseStorageAdapter = createSupabaseStorageAdapter;
})(window);
