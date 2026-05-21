import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SUPABASE_SERVICE_ROLE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const limit = Math.max(1, Math.min(200, Number(body.limit) || 50));
      const offset = Math.max(0, Number(body.offset) || 0);
      const toolType: string | undefined = typeof body.tool_type === "string" ? body.tool_type : undefined;
      let q = supabase
        .from("admin_library")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (toolType) q = q.eq("tool_type", toolType);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ items: data || [], limit, offset, hasMore: (data?.length || 0) === limit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const { tool_type, title, input_data, output_data, file_url, created_at } = body;
      if (!tool_type || !title) {
        return new Response(JSON.stringify({ error: "tool_type and title required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const insertRow: Record<string, unknown> = {
        tool_type,
        title,
        input_data: input_data || {},
        output_data: output_data || {},
        file_url: file_url || null,
      };
      if (created_at && typeof created_at === "string" && !isNaN(Date.parse(created_at))) {
        insertRow.created_at = created_at;
      }
      const { data, error } = await supabase
        .from("admin_library")
        .insert(insertRow)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { id, output_data, created_at, title } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const updateRow: Record<string, unknown> = {};
      if (output_data !== undefined) updateRow.output_data = output_data;
      if (typeof title === "string" && title.length) updateRow.title = title;
      if (created_at && typeof created_at === "string" && !isNaN(Date.parse(created_at))) {
        updateRow.created_at = created_at;
      }
      if (Object.keys(updateRow).length === 0) {
        return new Response(JSON.stringify({ error: "nothing to update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("admin_library")
        .update(updateRow)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("admin_library").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-library error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
