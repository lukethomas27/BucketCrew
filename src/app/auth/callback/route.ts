import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id);

        if (!workspaces || workspaces.length === 0) {
          await supabase.from("profiles").upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
          });

          const { data: workspace } = await supabase
            .from("workspaces")
            .insert({
              name: user.user_metadata?.full_name || user.email?.split("@")[0] || "My Workspace",
              owner_id: user.id,
            })
            .select("id")
            .single();

          if (workspace) {
            await supabase.from("subscriptions").insert({
              workspace_id: workspace.id,
              plan: "free",
              credits_total: 3,
              credits_used: 0,
            });
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
