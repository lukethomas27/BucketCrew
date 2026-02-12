import type { WorkflowTemplate } from "@/types";

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "research-sprint",
    name: "Research Sprint",
    description:
      "Deep-dive into your market landscape, competitors, and customer segments. Your research team scans your business files, analyzes the competitive landscape, and maps out your market position.",
    icon: "Search",
    category: "Research",
    tagline: "Know your market in minutes, not months.",
    what_you_get: [
      "Market landscape overview",
      "Competitor profiles & positioning",
      "Customer segment analysis",
      "Opportunity gaps identified",
      "Action items & next steps",
    ],
    credit_cost: 1,
    is_active: true,
    config: {
      form_fields: [
        {
          id: "business_description",
          label: "Describe your business",
          type: "textarea",
          placeholder:
            "e.g., We're a residential plumbing company in Austin, TX serving homeowners...",
          required: true,
        },
        {
          id: "target_market",
          label: "Who is your target market?",
          type: "textarea",
          placeholder:
            "e.g., Homeowners in Austin metro area, ages 30-55, household income $75K+",
          required: true,
        },
        {
          id: "competitors",
          label: "Key competitors (optional)",
          type: "textarea",
          placeholder:
            "e.g., ABC Plumbing, QuickFix Plumbing, Roto-Rooter...",
          required: false,
        },
        {
          id: "focus_areas",
          label: "Focus areas",
          type: "checkbox",
          options: [
            { label: "Market size & trends", value: "market_size" },
            { label: "Competitor analysis", value: "competitors" },
            { label: "Customer segments", value: "customers" },
            { label: "Pricing landscape", value: "pricing" },
            { label: "Channel opportunities", value: "channels" },
          ],
          required: false,
        },
      ],
      output_schema: "findings" as any,
      steps: [
        {
          id: "plan",
          agent_role: "planner" as const,
          name: "Planner",
          description: "Analyzes your goal and creates a research plan",
          system_prompt: "planner",
        },
        {
          id: "research_market",
          agent_role: "researcher" as const,
          name: "Market Researcher",
          description: "Researches market landscape and trends",
          system_prompt: "researcher",
          depends_on: ["plan"],
          parallel_group: "research",
        },
        {
          id: "research_competitors",
          agent_role: "researcher" as const,
          name: "Competitive Analyst",
          description: "Analyzes competitors and positioning",
          system_prompt: "researcher",
          depends_on: ["plan"],
          parallel_group: "research",
        },
        {
          id: "strategize",
          agent_role: "strategist" as const,
          name: "Strategist",
          description: "Synthesizes findings into recommendations",
          system_prompt: "strategist",
          depends_on: ["research_market", "research_competitors"],
        },
        {
          id: "edit",
          agent_role: "editor" as const,
          name: "Editor",
          description: "Polishes the final deliverable",
          system_prompt: "editor",
          depends_on: ["strategize"],
        },
      ],
    },
  },
  {
    id: "growth-plan",
    name: "90-Day Growth Plan",
    description:
      "Get a strategic, actionable growth plan with channels, offers, experiments, and KPIs. Your strategy team builds a prioritized roadmap calibrated to your business data.",
    icon: "TrendingUp",
    category: "Strategy",
    tagline: "A strategic plan. Not a to-do list.",
    what_you_get: [
      "Growth strategy overview",
      "Channel-by-channel plan",
      "30/60/90 day milestones",
      "Experiment ideas with expected impact",
      "KPI dashboard template",
      "Risk assessment",
    ],
    credit_cost: 1,
    is_active: true,
    config: {
      form_fields: [
        {
          id: "business_description",
          label: "Describe your business",
          type: "textarea",
          placeholder:
            "e.g., B2B SaaS for dental practices, $50K MRR, 120 customers...",
          required: true,
        },
        {
          id: "current_revenue",
          label: "Current monthly revenue range",
          type: "select",
          options: [
            { label: "Pre-revenue", value: "pre_revenue" },
            { label: "$0 - $10K/mo", value: "0_10k" },
            { label: "$10K - $50K/mo", value: "10k_50k" },
            { label: "$50K - $200K/mo", value: "50k_200k" },
            { label: "$200K+/mo", value: "200k_plus" },
          ],
          required: true,
        },
        {
          id: "primary_channel",
          label: "Primary growth channel today",
          type: "select",
          options: [
            { label: "Word of mouth / referrals", value: "referrals" },
            { label: "Paid ads (Google, Meta)", value: "paid_ads" },
            { label: "Content / SEO", value: "content_seo" },
            { label: "Outbound sales", value: "outbound" },
            { label: "Partnerships", value: "partnerships" },
            { label: "Other / None", value: "other" },
          ],
          required: true,
        },
        {
          id: "growth_target",
          label: "What does success look like in 90 days?",
          type: "textarea",
          placeholder:
            "e.g., Double our customer base, reach $100K MRR, launch in 2 new markets...",
          required: true,
        },
        {
          id: "constraints",
          label: "Constraints or context",
          type: "textarea",
          placeholder:
            "e.g., Small team (3 people), limited budget ($5K/mo for marketing), seasonal business...",
          required: false,
        },
      ],
      output_schema: "plan_30_60_90" as any,
      steps: [
        {
          id: "plan",
          agent_role: "planner" as const,
          name: "Planner",
          description: "Analyzes your business and sets strategic direction",
          system_prompt: "planner",
        },
        {
          id: "research_channels",
          agent_role: "researcher" as const,
          name: "Channel Researcher",
          description: "Evaluates growth channels and opportunities",
          system_prompt: "researcher",
          depends_on: ["plan"],
          parallel_group: "research",
        },
        {
          id: "research_benchmarks",
          agent_role: "researcher" as const,
          name: "Benchmark Analyst",
          description: "Researches industry benchmarks and best practices",
          system_prompt: "researcher",
          depends_on: ["plan"],
          parallel_group: "research",
        },
        {
          id: "strategize",
          agent_role: "strategist" as const,
          name: "Growth Strategist",
          description: "Builds the 30/60/90 day growth plan",
          system_prompt: "strategist",
          depends_on: ["research_channels", "research_benchmarks"],
        },
        {
          id: "edit",
          agent_role: "editor" as const,
          name: "Editor",
          description: "Polishes and formats the growth plan",
          system_prompt: "editor",
          depends_on: ["strategize"],
        },
      ],
    },
  },
  {
    id: "sop-builder",
    name: "SOP Builder",
    description:
      "Turn your messy documents, notes, and tribal knowledge into clean, standardized operating procedures. Your ops team reads your docs and outputs processes your team can actually follow.",
    icon: "ClipboardList",
    category: "Operations",
    tagline: "Turn tribal knowledge into real processes.",
    what_you_get: [
      "Standardized procedure documents",
      "Step-by-step workflows",
      "Role assignments & responsibilities",
      "Quality checkpoints",
      "Training checklist",
    ],
    credit_cost: 1,
    is_active: true,
    config: {
      form_fields: [
        {
          id: "process_name",
          label: "What process do you want to document?",
          type: "text",
          placeholder:
            "e.g., New customer onboarding, Invoice processing, Hiring workflow...",
          required: true,
        },
        {
          id: "process_description",
          label: "Describe how this process works today",
          type: "textarea",
          placeholder:
            "e.g., When a new customer signs up, Sarah sends them a welcome email, then John sets up their account...",
          required: true,
        },
        {
          id: "audience",
          label: "Who will use this SOP?",
          type: "text",
          placeholder: "e.g., New hires, operations team, all staff...",
          required: false,
        },
        {
          id: "pain_points",
          label: "What goes wrong with this process today?",
          type: "textarea",
          placeholder:
            "e.g., Steps get skipped, different people do it differently, training takes too long...",
          required: false,
        },
      ],
      output_schema: "findings" as any,
      steps: [
        {
          id: "plan",
          agent_role: "planner" as const,
          name: "Planner",
          description: "Maps the process and identifies documentation needs",
          system_prompt: "planner",
        },
        {
          id: "research_docs",
          agent_role: "researcher" as const,
          name: "Document Analyst",
          description: "Extracts process details from your uploaded files",
          system_prompt: "researcher",
          depends_on: ["plan"],
        },
        {
          id: "strategize",
          agent_role: "strategist" as const,
          name: "Process Designer",
          description: "Structures the optimal workflow and identifies gaps",
          system_prompt: "strategist",
          depends_on: ["research_docs"],
        },
        {
          id: "edit",
          agent_role: "editor" as const,
          name: "Technical Writer",
          description: "Produces the polished SOP document",
          system_prompt: "editor",
          depends_on: ["strategize"],
        },
      ],
    },
  },
];

export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
