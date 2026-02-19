import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  FolderOpen,
  FileText,
  Coins,
  Upload,
  Users,
  ArrowRight,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { BucketFile, Deliverable, Subscription } from "@/types";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's first workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            No workspace found
          </h2>
          <p className="mt-2 text-gray-500">
            Please contact support to set up your workspace.
          </p>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if not completed
  const wsSettings = (workspace.settings ?? {}) as Record<string, unknown>;
  if (!wsSettings.onboarding_completed) {
    redirect("/dashboard/onboarding");
  }

  // Fetch counts and data in parallel
  const [filesResult, deliverablesResult, subscriptionResult] =
    await Promise.all([
      supabase
        .from("files")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id),
      supabase
        .from("deliverables")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspace.id)
        .limit(1)
        .single(),
    ]);

  const filesCount = filesResult.count ?? 0;
  const deliverables = (deliverablesResult.data ?? []) as Deliverable[];
  const subscription = subscriptionResult.data as Subscription | null;
  const creditsRemaining = subscription
    ? subscription.credits_total - subscription.credits_used
    : 0;

  const stats = [
    {
      label: "Files in Bucket",
      value: filesCount,
      icon: FolderOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Deliverables",
      value: deliverables.length,
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Credits Remaining",
      value: creditsRemaining,
      icon: Coins,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="p-8">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back. Here is an overview of your workspace.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Deliverables - takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Deliverables
              </h2>
              {deliverables.length > 0 && (
                <Link
                  href="/dashboard/deliverables"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  View all
                </Link>
              )}
            </div>
            <div className="p-6">
              {deliverables.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">
                    Your workspace is empty
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by uploading files to your Business Bucket.
                  </p>
                  <Link
                    href="/dashboard/bucket"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliverables.map((d) => (
                    <Link
                      key={d.id}
                      href={`/dashboard/deliverables/${d.id}`}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {d.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {d.run_id ? "Workflow" : "Manual"}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatDate(d.created_at)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>
          <Link
            href="/dashboard/bucket"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
              <Upload className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Upload Files
              </p>
              <p className="text-xs text-gray-500">
                Add files to your Business Bucket
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/dashboard/teammates"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 transition-colors group-hover:bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Run TeamMate
              </p>
              <p className="text-xs text-gray-500">
                Start a new AI workflow
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
