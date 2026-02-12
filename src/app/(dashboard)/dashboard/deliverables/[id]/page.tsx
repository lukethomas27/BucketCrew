"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Deliverable, ChecklistItem } from "@/types";
import {
  FileText,
  Download,
  Copy,
  Check,
  AlertTriangle,
  BookOpen,
  Target,
  Calendar,
  CheckSquare,
  Loader2,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

export default function DeliverableViewerPage() {
  const params = useParams();
  const deliverableId = params.id as string;
  const supabase = createClient();

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState("summary");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (workspace) setWorkspaceId(workspace.id);

      const { data } = await supabase
        .from("deliverables")
        .select("*")
        .eq("id", deliverableId)
        .single();

      if (data) setDeliverable(data as unknown as Deliverable);
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  // Scroll spy
  useEffect(() => {
    function handleScroll() {
      const sectionIds = [
        "summary",
        "findings",
        "recommendations",
        "plan",
        "risks",
        "checklist",
        "sources",
      ];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom > 120) {
            setActiveSection(id);
            break;
          }
        }
      }
    }

    const scrollContainer = document.getElementById("deliverable-content");
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  // Toggle checklist item
  async function toggleChecklist(itemId: string) {
    if (!deliverable || !workspaceId) return;

    const updated = deliverable.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    setDeliverable({ ...deliverable, checklist: updated });

    await fetch(
      `/api/workspaces/${workspaceId}/deliverables/${deliverableId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: updated }),
      }
    );
  }

  // Copy markdown
  function copyMarkdown() {
    if (!deliverable) return;
    const c = deliverable.content;

    let md = `# ${deliverable.title}\n\n`;
    md += `## Executive Summary\n\n${c.executive_summary}\n\n`;

    if (c.findings?.length) {
      md += `## Key Findings\n\n`;
      c.findings.forEach((f, i) => {
        md += `### ${i + 1}. ${f.title}\n\n${f.body}\n\n`;
        if (f.citations?.length) {
          f.citations.forEach((cit) => {
            md += `> [Source: ${cit.file_name}] "${cit.excerpt}"\n\n`;
          });
        }
      });
    }

    if (c.recommendations?.length) {
      md += `## Recommendations\n\n`;
      c.recommendations.forEach((r) => {
        md += `### [${r.priority.toUpperCase()}] ${r.title}\n\n${r.body}\n\n`;
        md += `- **Effort:** ${r.effort}\n- **Impact:** ${r.impact}\n\n`;
      });
    }

    if (c.plan_30_60_90?.length) {
      md += `## 30/60/90 Day Plan\n\n`;
      c.plan_30_60_90.forEach((phase) => {
        md += `### ${phase.phase}: ${phase.title}\n\n`;
        phase.items.forEach((item) => {
          md += `- ${item}\n`;
        });
        md += "\n";
      });
    }

    if (c.risks_assumptions?.length) {
      md += `## Risks & Assumptions\n\n`;
      c.risks_assumptions.forEach((r) => {
        md += `- ${r}\n`;
      });
      md += "\n";
    }

    if (deliverable.checklist?.length) {
      md += `## TODO Checklist\n\n`;
      deliverable.checklist.forEach((item) => {
        md += `- [${item.completed ? "x" : " "}] ${item.text}\n`;
      });
      md += "\n";
    }

    if (deliverable.sources?.length) {
      md += `## Sources\n\n`;
      deliverable.sources.forEach((src) => {
        md += `- ${src.name} (${src.type})${src.url ? ` — ${src.url}` : ""}\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Export PDF (window.print)
  function exportPdf() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!deliverable) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 font-medium text-gray-500">
            Deliverable not found.
          </p>
        </div>
      </div>
    );
  }

  const c = deliverable.content;

  // Build table of contents
  const sections = [
    { id: "summary", label: "Executive Summary", icon: BookOpen },
    ...(c.findings?.length
      ? [{ id: "findings", label: "Key Findings", icon: Target }]
      : []),
    ...(c.recommendations?.length
      ? [{ id: "recommendations", label: "Recommendations", icon: Target }]
      : []),
    ...(c.plan_30_60_90 && c.plan_30_60_90.length > 0
      ? [{ id: "plan", label: "30/60/90 Plan", icon: Calendar }]
      : []),
    ...(c.risks_assumptions?.length
      ? [{ id: "risks", label: "Risks & Assumptions", icon: AlertTriangle }]
      : []),
    ...(deliverable.checklist?.length
      ? [{ id: "checklist", label: "TODO Checklist", icon: ListChecks }]
      : []),
    ...(deliverable.sources?.length
      ? [{ id: "sources", label: "Sources", icon: FileText }]
      : []),
  ];

  return (
    <div className="flex h-full">
      {/* Left sidebar - Table of Contents */}
      <div className="hidden w-56 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-0 overflow-y-auto p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Contents
          </p>
          <nav className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  document
                    .getElementById(s.id)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <s.icon className="h-3.5 w-3.5 shrink-0" />
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div id="deliverable-content" className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900">
              {deliverable.title}
            </h1>
            <p className="text-sm text-gray-500">
              {formatDate(deliverable.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyMarkdown}>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="ml-1.5">
                {copied ? "Copied!" : "Copy Markdown"}
              </span>
            </Button>
            <Button
              size="sm"
              onClick={exportPdf}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              <Download className="h-4 w-4" />
              <span className="ml-1.5">Export PDF</span>
            </Button>
          </div>
        </div>

        {/* Content sections */}
        <div className="mx-auto max-w-4xl space-y-10 px-8 py-8">
          {/* Executive Summary */}
          <section id="summary">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Executive Summary
            </h2>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6">
              <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
                {c.executive_summary}
              </p>
            </div>
          </section>

          {/* Key Findings */}
          {c.findings?.length > 0 && (
            <section id="findings">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Target className="h-5 w-5 text-indigo-500" />
                Key Findings
              </h2>
              <div className="space-y-4">
                {c.findings.map((finding, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {i + 1}. {finding.title}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {finding.body}
                    </p>
                    {finding.citations?.length > 0 && (
                      <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                        {finding.citations.map((cit, j) => (
                          <p key={j} className="text-xs italic text-gray-500">
                            [Source: {cit.file_name}] &ldquo;{cit.excerpt}
                            &rdquo;
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {c.recommendations?.length > 0 && (
            <section id="recommendations">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Target className="h-5 w-5 text-indigo-500" />
                Recommendations
              </h2>
              <div className="space-y-4">
                {c.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                          PRIORITY_COLORS[rec.priority] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <h3 className="font-semibold text-gray-900">
                        {rec.title}
                      </h3>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {rec.body}
                    </p>
                    <div className="mt-3 flex gap-4 border-t border-gray-100 pt-3">
                      <span className="rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600">
                        Effort: <strong>{rec.effort}</strong>
                      </span>
                      <span className="rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600">
                        Impact: <strong>{rec.impact}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 30/60/90 Day Plan */}
          {c.plan_30_60_90 && c.plan_30_60_90.length > 0 && (
            <section id="plan">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Calendar className="h-5 w-5 text-indigo-500" />
                30/60/90 Day Plan
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {c.plan_30_60_90.map((phase, i) => {
                  const phaseColors: Record<string, string> = {
                    "30-day": "bg-emerald-100 text-emerald-700",
                    "60-day": "bg-yellow-100 text-yellow-700",
                    "90-day": "bg-red-100 text-red-700",
                  };
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-200 bg-white p-5"
                    >
                      <span
                        className={`mb-2 inline-block rounded-md px-2 py-1 text-xs font-semibold ${
                          phaseColors[phase.phase] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {phase.phase}
                      </span>
                      <h3 className="mb-2 text-sm font-semibold text-gray-900">
                        {phase.title}
                      </h3>
                      <ul className="space-y-1.5">
                        {phase.items.map((item, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-2 text-sm text-gray-700"
                          >
                            <span className="mt-1 text-indigo-400">&bull;</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Risks & Assumptions */}
          {c.risks_assumptions?.length > 0 && (
            <section id="risks">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Risks & Assumptions
              </h2>
              <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-5">
                <ul className="space-y-2">
                  {c.risks_assumptions.map((risk, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* TODO Checklist */}
          {deliverable.checklist?.length > 0 && (
            <section id="checklist">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ListChecks className="h-5 w-5 text-indigo-500" />
                TODO Checklist
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="space-y-2">
                  {deliverable.checklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleChecklist(item.id)}
                      />
                      <span
                        className={`text-sm ${
                          item.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400">
                    {deliverable.checklist.filter((i) => i.completed).length} of{" "}
                    {deliverable.checklist.length} completed
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Sources */}
          {deliverable.sources?.length > 0 && (
            <section id="sources">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-indigo-500" />
                Sources
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="space-y-2">
                  {deliverable.sources.map((src, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                    >
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          src.type === "bucket"
                            ? "bg-indigo-400"
                            : "bg-emerald-400"
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {src.name}
                      </span>
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                        {src.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {src.relevance}
                      </span>
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-gray-400 transition-colors hover:text-indigo-500"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
