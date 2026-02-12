"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Subscription, WorkspaceSettings } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  AlertTriangle,
  User,
  Building2,
  CreditCard,
  Shield,
  Zap,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Workspace state
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  // Billing state
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Data state
  const [webResearch, setWebResearch] = useState(true);
  const [retentionDays, setRetentionDays] = useState("forever");

  // Confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    "workspace" | "data" | null
  >(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) setFullName(profile.full_name ?? "");

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (workspace) {
        setWorkspaceId(workspace.id);
        setWorkspaceName(workspace.name);
        const settings = (workspace.settings ?? {}) as WorkspaceSettings;
        setWebResearch(settings.web_research_enabled !== false);
        setRetentionDays(
          settings.data_retention_days?.toString() ?? "forever"
        );

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("workspace_id", workspace.id)
          .single();

        if (sub) setSubscription(sub as unknown as Subscription);
      }

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save profile
  async function saveProfile() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
    }
    setSaving(false);
  }

  // Save workspace name
  async function saveWorkspace() {
    setSaving(true);
    await supabase
      .from("workspaces")
      .update({ name: workspaceName })
      .eq("id", workspaceId);
    setSaving(false);
  }

  // Save data preferences
  async function savePreferences() {
    setSaving(true);
    await supabase
      .from("workspaces")
      .update({
        settings: {
          web_research_enabled: webResearch,
          data_retention_days:
            retentionDays === "forever" ? null : parseInt(retentionDays),
        },
      })
      .eq("id", workspaceId);
    setSaving(false);
  }

  // Handle destructive actions
  async function handleDelete() {
    if (deleteTarget === "workspace") {
      await supabase.from("workspaces").delete().eq("id", workspaceId);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      router.push("/");
    } else if (deleteTarget === "data") {
      await supabase
        .from("file_chunks")
        .delete()
        .eq("workspace_id", workspaceId);
      await supabase.from("files").delete().eq("workspace_id", workspaceId);
      await supabase
        .from("deliverables")
        .delete()
        .eq("workspace_id", workspaceId);
      await supabase
        .from("workflow_runs")
        .delete()
        .eq("workspace_id", workspaceId);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }

  // Change password
  function handleChangePassword() {
    alert(
      "Password change email will be sent to your registered email address."
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const creditsUsed = subscription?.credits_used ?? 0;
  const creditsTotal = subscription?.credits_total ?? 3;
  const creditsPercent = Math.min(
    Math.round((creditsUsed / creditsTotal) * 100),
    100
  );
  const creditsRemaining = Math.max(creditsTotal - creditsUsed, 0);

  const planLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    business: "Business",
  };

  const planDescriptions: Record<string, string> = {
    free: "3 workflow runs per month",
    pro: "50 workflow runs per month",
    business: "200 workflow runs per month",
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Settings</h1>

        <Tabs defaultValue="profile">
          <TabsList className="mb-8 grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="workspace" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Workspace
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Data
            </TabsTrigger>
          </TabsList>

          {/* ─── Profile Tab ─────────────────────────────────────── */}
          <TabsContent value="profile">
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangePassword}
                  >
                    Change password
                  </Button>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ─── Workspace Tab ───────────────────────────────────── */}
          <TabsContent value="workspace">
            <div className="space-y-6">
              <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace name</Label>
                  <Input
                    id="workspaceName"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Workspace"
                  />
                </div>
                <Button
                  onClick={saveWorkspace}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Rename Workspace"
                  )}
                </Button>
              </div>

              {/* Danger zone */}
              <div className="rounded-xl border border-red-200 bg-white p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Permanently delete this workspace and all its data. This
                  action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setDeleteTarget("workspace");
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete Workspace
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ─── Billing Tab ─────────────────────────────────────── */}
          <TabsContent value="billing">
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              {/* Current plan */}
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {planLabels[subscription?.plan ?? "free"]} Plan
                  </h3>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    Current
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {planDescriptions[subscription?.plan ?? "free"]}
                </p>
              </div>

              {/* Credits usage */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Credits used
                  </span>
                  <span className="text-sm text-gray-500">
                    {creditsUsed} of {creditsTotal} ({creditsRemaining}{" "}
                    remaining)
                  </span>
                </div>
                <Progress
                  value={creditsPercent}
                  className={`h-3 ${creditsPercent > 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-indigo-500"}`}
                />
              </div>

              {/* Upgrade CTA */}
              {(subscription?.plan ?? "free") === "free" && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
                      <Zap className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-900">
                        Upgrade to Pro
                      </h4>
                      <p className="mt-1 text-sm text-indigo-700">
                        Get 50 workflow runs/month, DOCX export, web research,
                        and priority processing.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3 bg-indigo-600 hover:bg-indigo-500"
                      >
                        Upgrade to Pro &mdash; $29/mo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Data Tab ────────────────────────────────────────── */}
          <TabsContent value="data">
            <div className="space-y-6">
              <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* Web research toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Web research default
                    </p>
                    <p className="text-xs text-gray-500">
                      Allow TeamMates to search the web during workflows
                    </p>
                  </div>
                  <Switch
                    checked={webResearch}
                    onCheckedChange={setWebResearch}
                  />
                </div>

                {/* Data retention */}
                <div className="space-y-2">
                  <Label>Data retention</Label>
                  <Select
                    value={retentionDays}
                    onValueChange={setRetentionDays}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">
                    How long to keep uploaded files and deliverables.
                  </p>
                </div>

                <Button
                  onClick={savePreferences}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </div>

              {/* Delete all data */}
              <div className="rounded-xl border border-red-200 bg-white p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Delete All Data
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Delete all files, deliverables, and workflow runs from this
                  workspace. Your account and workspace will remain.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setDeleteTarget("data");
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete All Data
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteTarget === "workspace"
                ? "Delete Workspace?"
                : "Delete All Data?"}
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.{" "}
              {deleteTarget === "workspace"
                ? "All files, deliverables, and settings will be permanently deleted."
                : "All files, chunks, deliverables, and workflow runs will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
