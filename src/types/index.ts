// ============================================================
// BucketCrew Core Types
// ============================================================

// --- Auth & Users ---
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

// --- Workspaces ---
export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  settings: WorkspaceSettings;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSettings {
  web_research_enabled?: boolean;
  data_retention_days?: number;
}

// --- Files (Business Bucket) ---
export type FileTag =
  | "Sales"
  | "Ops"
  | "Finance"
  | "Marketing"
  | "Website"
  | string;

export type ProcessingStatus = "pending" | "processing" | "ready" | "error";

export interface BucketFile {
  id: string;
  workspace_id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  tags: FileTag[];
  metadata: Record<string, unknown>;
  processing_status: ProcessingStatus;
  created_at: string;
}

// --- RAG ---
export interface FileChunk {
  id: string;
  file_id: string;
  workspace_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata: {
    page?: number;
    section?: string;
    file_name?: string;
  };
}

export interface RetrievedChunk extends FileChunk {
  similarity: number;
  file_name: string;
}

// --- Workflow Templates ---
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tagline: string;
  what_you_get: string[];
  credit_cost: number;
  is_active: boolean;
  config: WorkflowConfig;
}

export interface WorkflowConfig {
  steps: WorkflowStep[];
  output_schema: DeliverableSections;
  form_fields: FormField[];
}

export interface WorkflowStep {
  id: string;
  agent_role: AgentRole;
  name: string;
  description: string;
  system_prompt: string;
  depends_on?: string[];
  parallel_group?: string;
}

export type AgentRole = "planner" | "researcher" | "strategist" | "editor";

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file-select";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

// --- Workflow Runs ---
export type RunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowRun {
  id: string;
  workspace_id: string;
  user_id: string;
  template_id: string;
  input: Record<string, unknown>;
  file_ids: string[];
  status: RunStatus;
  progress: ProgressEntry[];
  result: Deliverable | null;
  error: string | null;
  credits_used: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProgressEntry {
  agent: string;
  role: AgentRole;
  status: "waiting" | "running" | "completed" | "error";
  message: string;
  timestamp: string;
  duration_ms?: number;
}

// --- Deliverables ---
export interface Deliverable {
  id: string;
  workspace_id: string;
  run_id: string;
  title: string;
  content: DeliverableContent;
  checklist: ChecklistItem[];
  sources: DeliverableSource[];
  created_at: string;
}

export interface DeliverableContent {
  executive_summary: string;
  findings: Finding[];
  recommendations: Recommendation[];
  plan_30_60_90?: PlanPhase[];
  risks_assumptions: string[];
  raw_markdown?: string;
}

export type DeliverableSections =
  | "executive_summary"
  | "findings"
  | "recommendations"
  | "plan_30_60_90"
  | "risks_assumptions"
  | "checklist"
  | "sources";

export interface Finding {
  title: string;
  body: string;
  citations: Citation[];
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  title: string;
  body: string;
  effort: string;
  impact: string;
}

export interface PlanPhase {
  phase: "30-day" | "60-day" | "90-day";
  title: string;
  items: string[];
}

export interface Citation {
  file_name: string;
  chunk_index: number;
  excerpt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface DeliverableSource {
  type: "bucket" | "web";
  name: string;
  url?: string;
  file_id?: string;
  relevance: string;
}

// --- Billing ---
export type PlanTier = "free" | "pro" | "business";

export interface Subscription {
  id: string;
  workspace_id: string;
  plan: PlanTier;
  credits_total: number;
  credits_used: number;
  period_start: string;
  period_end: string;
}

export interface CreditUsage {
  id: string;
  workspace_id: string;
  user_id: string;
  run_id: string;
  credits: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}
