import type { WorkflowTemplate, RetrievedChunk, ProgressEntry, Deliverable } from '@/types'

export interface WorkflowContext {
  runId: string
  workspaceId: string
  template: WorkflowTemplate
  userInput: Record<string, any>
  bucketContext: RetrievedChunk[]
  webResearchEnabled: boolean
  agentOutputs: Record<string, any>
  progress: ProgressEntry[]
  totalTokensUsed: { input: number; output: number }
  finalDeliverable?: Deliverable
}

export function createWorkflowContext(params: {
  runId: string
  workspaceId: string
  template: WorkflowTemplate
  userInput: Record<string, any>
  bucketContext: RetrievedChunk[]
  webResearchEnabled: boolean
}): WorkflowContext {
  return {
    ...params,
    agentOutputs: {},
    progress: [],
    totalTokensUsed: { input: 0, output: 0 },
  }
}
