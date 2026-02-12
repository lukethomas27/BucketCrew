import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Deliverable } from "@/types";
import { FileText, ArrowRight, Clock, Sparkles } from "lucide-react";

export default async function DeliverablesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-gray-500">No workspace found.</p>
      </div>
    );
  }

  const { data } = await supabase
    .from("deliverables")
    .select("*, workflow_runs(template_id)")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  const deliverables = (data ?? []) as (Deliverable & {
    workflow_runs?: { template_id: string } | null;
  })[];

  const TEMPLATE_LABELS: Record<string, { label: string; color: string }> = {
    "research-sprint": {
      label: "Research Sprint",
      color: "bg-blue-50 text-blue-700",
    },
    "growth-plan": {
      label: "Growth Plan",
      color: "bg-emerald-50 text-emerald-700",
    },
    "sop-builder": {
      label: "SOP Builder",
      color: "bg-purple-50 text-purple-700",
    },
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Deliverables</h1>
        <p className="mt-1 text-sm text-gray-500">
          All outputs from your TeamMate runs
        </p>
      </div>

      {deliverables.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Sparkles className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-gray-900">
            No deliverables yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Run a TeamMate to get your first deliverable.
          </p>
          <Link
            href="/dashboard/teammates"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Browse TeamMates
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        /* Deliverable grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((d) => {
            const templateId = d.workflow_runs?.template_id ?? "";
            const meta = TEMPLATE_LABELS[templateId] ?? {
              label: "Workflow",
              color: "bg-gray-100 text-gray-700",
            };

            return (
              <Link
                key={d.id}
                href={`/dashboard/deliverables/${d.id}`}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                  {d.title}
                </h3>
                <div className="mt-auto flex items-center gap-3 pt-4">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {formatDate(d.created_at)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
