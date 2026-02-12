"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getWorkflowTemplate } from "@/data/workflow-templates";
import type {
  WorkflowTemplate,
  FormField,
  BucketFile,
  WorkflowRun,
  ProgressEntry,
  WorkflowStep,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Coins,
  Play,
  Loader2,
  CheckCircle2,
  Circle,
  FileIcon,
} from "lucide-react";

// ─── Run Progress Component ─────────────────────────────────────────
function RunProgress({
  run,
  steps,
}: {
  run: WorkflowRun;
  steps: WorkflowStep[];
}) {
  function getStepProgress(step: WorkflowStep): ProgressEntry | undefined {
    return run.progress?.find(
      (p) => p.agent === step.name || p.role === step.agent_role
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
          <Play className="h-6 w-6 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Your team is working...
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          This usually takes 1-3 minutes. Stay on this page to watch progress.
        </p>
      </div>

      {/* Progress timeline */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="space-y-3">
          {steps.map((step) => {
            const entry = getStepProgress(step);
            const status = entry?.status ?? "waiting";
            const message = entry?.message ?? step.description;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 rounded-xl p-4 ${
                  status === "completed"
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : status === "running"
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : status === "error"
                        ? "bg-red-50 ring-1 ring-red-200"
                        : "bg-gray-50 ring-1 ring-gray-200"
                }`}
              >
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : status === "running" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  ) : status === "error" ? (
                    <Circle className="h-5 w-5 text-red-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      status === "completed"
                        ? "text-emerald-800"
                        : status === "running"
                          ? "text-blue-800"
                          : status === "error"
                            ? "text-red-800"
                            : "text-gray-500"
                    }`}
                  >
                    {step.name}
                  </p>
                  <p
                    className={`text-xs ${
                      status === "completed"
                        ? "text-emerald-600"
                        : status === "running"
                          ? "text-blue-600"
                          : "text-gray-400"
                    }`}
                  >
                    {status === "completed" ? "Done" : message}
                  </p>
                </div>

                {/* Duration */}
                {entry?.duration_ms && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {Math.round(entry.duration_ms / 1000)}s
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {run.status === "failed" && run.error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Something went wrong
            </p>
            <p className="mt-1 text-sm text-red-600">{run.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function RunWorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const templateId = params.id as string;
  const template = getWorkflowTemplate(templateId);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [bucketFiles, setBucketFiles] = useState<BucketFile[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [includeWebResearch, setIncludeWebResearch] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Run state
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);

  // Init: load workspace + files
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!workspace) return;
      setWorkspaceId(workspace.id);

      const { data: files } = await supabase
        .from("files")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("processing_status", "ready")
        .order("created_at", { ascending: false });

      setBucketFiles((files as BucketFile[]) ?? []);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for run progress
  useEffect(() => {
    if (!activeRun || !workspaceId) return;
    if (activeRun.status === "completed" || activeRun.status === "failed")
      return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/runs/${activeRun.id}`
        );
        if (!res.ok) return;

        const updated: WorkflowRun = await res.json();
        setActiveRun(updated);

        if (updated.status === "completed" && updated.result) {
          clearInterval(interval);
          router.push(`/dashboard/deliverables/${updated.result.id}`);
        }

        if (updated.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRun, workspaceId, router]);

  // Handle form field change
  function handleFieldChange(fieldId: string, value: any) {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  // Handle checkbox group change
  function handleCheckboxChange(
    fieldId: string,
    optionValue: string,
    checked: boolean
  ) {
    setFormValues((prev) => {
      const current = (prev[fieldId] as string[]) ?? [];
      return {
        ...prev,
        [fieldId]: checked
          ? [...current, optionValue]
          : current.filter((v: string) => v !== optionValue),
      };
    });
  }

  // Toggle file selection
  function toggleFile(fileId: string) {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  }

  // Submit run
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !template) return;

    // Validate required fields
    for (const field of template.config.form_fields) {
      if (field.required && !formValues[field.id]) {
        alert(`Please fill in "${field.label}"`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          input: {
            ...formValues,
            include_web_research: includeWebResearch,
            additional_context: additionalContext,
          },
          file_ids: selectedFileIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start run");
      }

      const run: WorkflowRun = await res.json();
      setActiveRun(run);
    } catch (err: any) {
      alert(err.message || "Failed to start run");
      setSubmitting(false);
    }
  }

  // Render dynamic form field
  function renderField(field: FormField) {
    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.id}
            value={formValues[field.id] ?? ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={field.id}
            value={formValues[field.id] ?? ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
          />
        );

      case "select":
        return (
          <Select
            value={formValues[field.id] ?? ""}
            onValueChange={(value) => handleFieldChange(field.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => {
              const checked = (
                (formValues[field.id] as string[]) ?? []
              ).includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) =>
                      handleCheckboxChange(field.id, opt.value, !!c)
                    }
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  }

  // Not found state
  if (!template) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Template not found
          </h2>
          <p className="mt-2 text-gray-500">
            The requested workflow template does not exist.
          </p>
        </div>
      </div>
    );
  }

  // Show progress view if run is active
  if (activeRun) {
    return (
      <div className="p-8">
        <RunProgress run={activeRun} steps={template.config.steps} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{template.description}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* Dynamic form fields */}
            {template.config.form_fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* File selection */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <Label className="mb-3 block">Select files from bucket</Label>
            {bucketFiles.length === 0 ? (
              <p className="text-sm text-gray-400">
                No processed files available. Upload files in your Business
                Bucket first.
              </p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {bucketFiles.map((file) => {
                  const selected = selectedFileIds.includes(file.id);
                  return (
                    <label
                      key={file.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                        selected
                          ? "bg-indigo-50 ring-1 ring-indigo-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleFile(file.id)}
                      />
                      <FileIcon className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate text-sm text-gray-700">
                        {file.original_name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {selectedFileIds.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {selectedFileIds.length} file(s) selected
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* Web research toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Include web research?
                </p>
                <p className="text-xs text-gray-500">
                  Allow the team to search the web for additional context
                </p>
              </div>
              <Switch
                checked={includeWebResearch}
                onCheckedChange={setIncludeWebResearch}
              />
            </div>

            {/* Additional context */}
            <div className="space-y-2">
              <Label htmlFor="additional_context">
                Anything else your team should know?
              </Label>
              <Textarea
                id="additional_context"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Optional: any extra context, constraints, or priorities..."
                rows={3}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Coins className="h-4 w-4 text-amber-500" />
              <span>
                This will use{" "}
                <span className="font-semibold text-gray-700">
                  {template.credit_cost} credit
                </span>
              </span>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 bg-indigo-600 hover:bg-indigo-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Team
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
