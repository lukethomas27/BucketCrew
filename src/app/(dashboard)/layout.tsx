import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Workspace } from "@/types";
import {
  Users,
  LayoutDashboard,
  FolderOpen,
  FileText,
  Settings,
} from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Business Bucket", href: "/dashboard/bucket", icon: "FolderOpen" },
  { label: "TeamMates", href: "/dashboard/teammates", icon: "Users" },
  { label: "Deliverables", href: "/dashboard/deliverables", icon: "FileText" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const currentWorkspace = workspaces?.[0] ?? null;
  const userProfile = profile as Profile | null;

  const initials = userProfile?.full_name
    ? userProfile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? "BC";

  const displayName =
    userProfile?.full_name ?? user.email ?? "BucketCrew User";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-gray-900 text-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">BucketCrew</span>
        </div>

        {/* Workspace selector */}
        {currentWorkspace && (
          <div className="mx-4 mb-4 rounded-lg bg-gray-800/60 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              Workspace
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-gray-100">
              {currentWorkspace.name}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          <SidebarNav items={navItems} />
        </nav>

        {/* User profile at bottom */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {userProfile?.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-200">
                {displayName}
              </p>
              <p className="truncate text-xs text-gray-500">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
