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
        // Use upsert for profile to avoid race conditions
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name:
              user.user_metadata?.full_name || user.email?.split("@")[0],
          },
          { onConflict: "id" }
        );

        // Check if workspace already exists (signup page may have created it)
        const { data: existingWorkspaces } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1);

        if (!existingWorkspaces || existingWorkspaces.length === 0) {
          const { data: workspace } = await supabase
            .from("workspaces")
            .insert({
              name:
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "My Workspace",
              owner_id: user.id,
            })
            .select("id")
            .single();

          if (workspace) {
            // Check if subscription already exists before inserting
            const { data: existingSub } = await supabase
              .from("subscriptions")
              .select("id")
              .eq("workspace_id", workspace.id)
              .limit(1);

            if (!existingSub || existingSub.length === 0) {
              await supabase.from("subscriptions").insert({
                workspace_id: workspace.id,
                plan: "free",
                credits_total: 3,
                credits_used: 0,
              });
            }
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
