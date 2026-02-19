"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Users,
  FileText,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  FolderOpen,
  Rocket,
} from "lucide-react";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to BucketCrew",
    subtitle: "Your AI consulting team is ready. Let's set you up in 60 seconds.",
  },
  {
    id: "workspace",
    title: "Name your workspace",
    subtitle: "This is where your team, files, and deliverables live.",
  },
  {
    id: "upload",
    title: "Add your first files",
    subtitle:
      "Drop in business documents — financials, proposals, reports, anything. Your team reads these to give you better advice.",
  },
  {
    id: "ready",
    title: "You're all set!",
    subtitle: "Your AI team is standing by. Pick a TeamMate and watch them work.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { workspace, refresh } = useWorkspace();

  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || "");
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];

  async function handleSaveWorkspaceName() {
    if (!workspace || !workspaceName.trim()) return;
    setSaving(true);
    await supabase
      .from("workspaces")
      .update({ name: workspaceName.trim() })
      .eq("id", workspace.id);
    await refresh();
    setSaving(false);
    setStep(2);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !workspace) return;

    setUploading(true);
    let count = 0;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tags", JSON.stringify([]));

        const res = await fetch(
          `/api/workspaces/${workspace.id}/files/upload`,
          { method: "POST", body: formData }
        );

        if (res.ok) count++;
      } catch {
        // Skip failed uploads
      }
    }

    setUploadedCount(count);
    setUploading(false);
  }

  function handleFinish() {
    // Mark onboarding as completed in workspace settings
    if (workspace) {
      supabase
        .from("workspaces")
        .update({
          settings: {
            ...((workspace.settings as Record<string, unknown>) || {}),
            onboarding_completed: true,
          },
        })
        .eq("id", workspace.id)
        .then(() => refresh());
    }
    router.push("/dashboard/teammates");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-indigo-500"
                  : i < step
                    ? "w-2 bg-indigo-300"
                    : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{current.title}</h1>
              <p className="mt-2 text-gray-500">{current.subtitle}</p>

              <div className="mt-8 space-y-4 text-left">
                {[
                  {
                    icon: FolderOpen,
                    title: "Upload your files",
                    desc: "Financial reports, proposals, SOPs — anything about your business",
                  },
                  {
                    icon: Users,
                    title: "Pick a TeamMate",
                    desc: "Choose from Research Sprint, Growth Plan, or SOP Builder",
                  },
                  {
                    icon: FileText,
                    title: "Get a deliverable",
                    desc: "Watch your AI team work and receive a polished business document",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                      <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setStep(1)}
                className="mt-8 w-full bg-indigo-600 hover:bg-indigo-500"
                size="lg"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Name workspace */}
          {step === 1 && (
            <div>
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{current.subtitle}</p>

              <div className="mt-6">
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g., Acme Corp, My Coffee Shop, Smith Consulting"
                  className="text-lg"
                  autoFocus
                />
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  onClick={handleSaveWorkspaceName}
                  disabled={!workspaceName.trim() || saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                >
                  {saving ? "Saving..." : "Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Upload files */}
          {step === 2 && (
            <div>
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{current.subtitle}</p>

              <div className="mt-6">
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-8 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      {uploading
                        ? "Uploading..."
                        : "Click to upload or drag files here"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      PDF, DOCX, CSV, TXT — up to 10MB each
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.csv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>

                {uploadedCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {uploadedCount} file{uploadedCount !== 1 ? "s" : ""} uploaded
                    successfully!
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                >
                  {uploadedCount > 0 ? "Continue" : "Skip for now"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                <Rocket className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{current.title}</h2>
              <p className="mt-2 text-gray-500">{current.subtitle}</p>

              <div className="mt-8 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 text-left">
                <h3 className="text-sm font-semibold text-gray-900">
                  Recommended first run:
                </h3>
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-lg">
                    🔍
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Research Sprint</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Upload a few business documents and let your team produce a
                      comprehensive analysis in under 3 minutes.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleFinish}
                className="mt-8 w-full bg-indigo-600 hover:bg-indigo-500"
                size="lg"
              >
                Meet Your TeamMates
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
