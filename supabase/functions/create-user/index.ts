import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Delete user action
    if (body.action === "delete" && body.user_id) {
      // Delete profile first
      await supabaseAdmin.from("profiles").delete().eq("user_id", body.user_id);
      // Delete auth user
      const { error } = await supabaseAdmin.auth.admin.deleteUser(body.user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ message: "User deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user action
    const { username, password, display_name } = body;

    if (!username || !password || !display_name) {
      throw new Error("username, password, and display_name are required");
    }

    const email = `${username.toLowerCase()}@burgercommand.app`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      username: username.toLowerCase(),
      display_name,
    });

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ message: "User created" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
