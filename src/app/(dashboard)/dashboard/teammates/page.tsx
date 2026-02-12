import Link from "next/link";
import { workflowTemplates } from "@/data/workflow-templates";
import {
  Search,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  Coins,
  ArrowRight,
} from "lucide-react";
import type { WorkflowTemplate } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  Search,
  TrendingUp,
  ClipboardList,
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  Research: { bg: "bg-blue-100", text: "text-blue-700" },
  Strategy: { bg: "bg-purple-100", text: "text-purple-700" },
  Operations: { bg: "bg-green-100", text: "text-green-700" },
};

function TemplateCard({ template }: { template: WorkflowTemplate }) {
  const Icon = iconMap[template.icon] ?? Search;
  const colors = categoryColors[template.category] ?? {
    bg: "bg-gray-100",
    text: "text-gray-700",
  };

  return (
    <div className="group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="flex-1 p-6">
        {/* Icon and category */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
            <Icon className="h-5 w-5 text-indigo-600" />
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
          >
            {template.category}
          </span>
        </div>

        {/* Name and tagline */}
        <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
        <p className="mt-1 text-sm font-medium text-indigo-600">
          {template.tagline}
        </p>

        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          {template.description}
        </p>

        {/* What you get */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            What you&apos;ll get
          </p>
          <ul className="space-y-1.5">
            {template.what_you_get.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">
            {template.credit_cost} credit
          </span>
        </div>
        <Link
          href={`/dashboard/teammates/${template.id}/run`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Run This Team
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function TeammatesPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">TeamMates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose an AI team to work on your business challenge
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {workflowTemplates
          .filter((t) => t.is_active)
          .map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
      </div>
    </div>
  );
}
