import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@/lib/supabase/server'
import { createWorkflowContext } from './context'
import { updateRunStatus } from './progress'
import { runAgent } from './agents'
import type {
  Deliverable,
  DeliverableContent,
  ChecklistItem,
  DeliverableSource,
  WorkflowTemplate,
  WorkflowStep,
  RetrievedChunk,
} from '@/types'

// ============================================================
// Main Workflow Execution Engine
// ============================================================

export async function executeWorkflow(params: {
  runId: string
  workspaceId: string
  templateId: string
  userInput: Record<string, any>
  fileIds: string[]
}): Promise<Deliverable> {
  const { runId, workspaceId, templateId, userInput, fileIds } = params

  try {
    // --- 1. Load the workflow template ---
    const template = await loadTemplate(templateId)

    // --- 2. Retrieve relevant chunks from bucket using RAG ---
    const bucketContext = await retrieveChunks(workspaceId, userInput, fileIds)

    // --- 3. Create workflow context ---
    const ctx = createWorkflowContext({
      runId,
      workspaceId,
      template,
      userInput,
      bucketContext,
      webResearchEnabled: false, // default; can be overridden per-workspace
    })

    // --- 4. Update run status to 'running' ---
    await updateRunStatus(runId, 'running')

    // --- 5. Execute steps, respecting depends_on and parallel_group ---
    const steps = template.config.steps
    const executionOrder = buildExecutionOrder(steps)

    for (const group of executionOrder) {
      if (group.length === 1) {
        // Single step -- run sequentially
        await runAgent(ctx, group[0])
      } else {
        // Parallel group -- run all steps concurrently
        await Promise.all(group.map((step) => runAgent(ctx, step)))
      }
    }

    // --- 6. Assemble the final deliverable from the editor's output ---
    const deliverable = assembleDeliverable(ctx.agentOutputs, runId, workspaceId, bucketContext)

    // --- 7. Save deliverable to database ---
    await saveDeliverable(deliverable)

    // --- 8. Update run status to 'completed' ---
    await updateRunStatus(runId, 'completed', deliverable)

    return deliverable
  } catch (error) {
    // On error, mark the run as failed
    const errorMessage = error instanceof Error ? error.message : String(error)
    await updateRunStatus(runId, 'failed', undefined, errorMessage)
    throw error
  }
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Load a workflow template by ID from the database.
 */
async function loadTemplate(templateId: string): Promise<WorkflowTemplate> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to load workflow template "${templateId}": ${error?.message || 'not found'}`)
  }

  return data as WorkflowTemplate
}

/**
 * Retrieve relevant document chunks for the workflow using vector similarity search.
 *
 * If specific fileIds are provided, the search is scoped to those files.
 * Otherwise, all files in the workspace are considered.
 */
async function retrieveChunks(
  workspaceId: string,
  userInput: Record<string, any>,
  fileIds: string[]
): Promise<RetrievedChunk[]> {
  const supabase = createClient()

  // Build a search query from the user input fields
  const searchText = Object.values(userInput)
    .filter((v) => typeof v === 'string')
    .join(' ')

  if (!searchText.trim()) {
    return []
  }

  // Attempt to use a Supabase RPC for vector similarity search.
  // If the RPC is not available, fall back to a basic text-match query.
  try {
    const rpcParams: Record<string, any> = {
      query_text: searchText,
      match_workspace_id: workspaceId,
      match_count: 20,
    }

    if (fileIds.length > 0) {
      rpcParams.filter_file_ids = fileIds
    }

    const { data, error } = await supabase.rpc('match_chunks', rpcParams)

    if (error) {
      throw error
    }

    return (data || []) as RetrievedChunk[]
  } catch (rpcError) {
    // Fallback: fetch chunks directly for the given files
    console.warn('[retrieveChunks] RPC match_chunks not available, using fallback query:', rpcError)

    let query = supabase
      .from('file_chunks')
      .select('*, bucket_files!inner(name)')
      .eq('workspace_id', workspaceId)
      .order('chunk_index', { ascending: true })
      .limit(20)

    if (fileIds.length > 0) {
      query = query.in('file_id', fileIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('[retrieveChunks] Fallback query failed:', error.message)
      return []
    }

    // Map to RetrievedChunk shape
    return (data || []).map((row: any) => ({
      id: row.id,
      file_id: row.file_id,
      workspace_id: row.workspace_id,
      chunk_index: row.chunk_index,
      content: row.content,
      token_count: row.token_count,
      metadata: row.metadata || {},
      similarity: 1.0, // No real similarity score in fallback mode
      file_name: row.bucket_files?.name || row.metadata?.file_name || 'unknown',
    }))
  }
}

/**
 * Group workflow steps into an ordered list of parallel groups.
 *
 * Steps with the same `parallel_group` value run concurrently within one group.
 * Steps without a parallel_group form their own single-step group.
 * Ordering respects `depends_on` by ensuring that all dependencies appear in
 * earlier groups.
 */
function buildExecutionOrder(steps: WorkflowStep[]): WorkflowStep[][] {
  const groups: WorkflowStep[][] = []
  const executed = new Set<string>()

  // Build a quick lookup for step IDs
  const stepMap = new Map<string, WorkflowStep>()
  for (const step of steps) {
    stepMap.set(step.id, step)
  }

  // Collect all unique parallel_group values (preserving insertion order)
  // Steps without a parallel_group get a unique synthetic group
  const groupOrder: string[] = []
  const groupMembers = new Map<string, WorkflowStep[]>()
  let syntheticIdx = 0

  for (const step of steps) {
    const groupKey = step.parallel_group || `__solo_${syntheticIdx++}`
    if (!groupMembers.has(groupKey)) {
      groupOrder.push(groupKey)
      groupMembers.set(groupKey, [])
    }
    groupMembers.get(groupKey)!.push(step)
  }

  // Topological iteration: emit groups only when all their deps are satisfied
  const remaining = new Set(groupOrder)
  const maxIterations = groupOrder.length + 1
  let iterations = 0

  while (remaining.size > 0 && iterations < maxIterations) {
    iterations++
    for (const groupKey of Array.from(remaining)) {
      const members = groupMembers.get(groupKey)!
      const allDepsMet = members.every((step) => {
        if (!step.depends_on || step.depends_on.length === 0) return true
        return step.depends_on.every((dep) => executed.has(dep))
      })

      if (allDepsMet) {
        groups.push(members)
        for (const member of members) {
          executed.add(member.id)
        }
        remaining.delete(groupKey)
      }
    }
  }

  // Safety: if there are still remaining groups (circular deps), push them at the end
  Array.from(remaining).forEach((groupKey) => {
    groups.push(groupMembers.get(groupKey)!)
  })

  return groups
}

/**
 * Assemble a Deliverable from the collected agent outputs.
 *
 * The editor agent's output is expected to contain the final consolidated structure.
 * If no editor output exists, we compose from the individual agent outputs.
 */
function assembleDeliverable(
  agentOutputs: Record<string, any>,
  runId: string,
  workspaceId: string,
  bucketContext: RetrievedChunk[]
): Deliverable {
  // Find the editor output (search by key containing 'editor')
  const editorKey = Object.keys(agentOutputs).find(
    (key) => key.toLowerCase().includes('editor')
  )
  const editorOutput = editorKey ? agentOutputs[editorKey] : null

  // Build the content from editor output, or fall back to assembling from parts
  const content: DeliverableContent = {
    executive_summary: editorOutput?.executive_summary || buildFallbackSummary(agentOutputs),
    findings: editorOutput?.findings || collectFindings(agentOutputs),
    recommendations: editorOutput?.recommendations || collectRecommendations(agentOutputs),
    plan_30_60_90: editorOutput?.plan_30_60_90 || collectPlan(agentOutputs),
    risks_assumptions: editorOutput?.risks_assumptions || [],
  }

  // Build checklist
  const rawChecklist: { text: string }[] = editorOutput?.checklist || []
  const checklist: ChecklistItem[] = rawChecklist.map((item) => ({
    id: uuidv4(),
    text: item.text,
    completed: false,
  }))

  // Build sources
  const rawSources: { name: string; relevance: string }[] = editorOutput?.sources_used || []
  const sources: DeliverableSource[] = rawSources.map((src) => {
    // Try to match source name to a bucket file
    const matchingChunk = bucketContext.find((c) => c.file_name === src.name)
    return {
      type: 'bucket' as const,
      name: src.name,
      file_id: matchingChunk?.file_id,
      relevance: src.relevance,
    }
  })

  // If no sources were listed by the editor, derive them from bucket context
  if (sources.length === 0 && bucketContext.length > 0) {
    const uniqueFiles = new Map<string, RetrievedChunk>()
    for (const chunk of bucketContext) {
      if (!uniqueFiles.has(chunk.file_id)) {
        uniqueFiles.set(chunk.file_id, chunk)
      }
    }
    Array.from(uniqueFiles.entries()).forEach(([fileId, chunk]) => {
      sources.push({
        type: 'bucket',
        name: chunk.file_name,
        file_id: fileId,
        relevance: 'Referenced during analysis',
      })
    })
  }

  const title = editorOutput?.title || `${new Date().toLocaleDateString()} Consulting Deliverable`

  return {
    id: uuidv4(),
    workspace_id: workspaceId,
    run_id: runId,
    title,
    content,
    checklist,
    sources,
    created_at: new Date().toISOString(),
  }
}

/**
 * Save the deliverable to the database.
 */
async function saveDeliverable(deliverable: Deliverable): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('deliverables').insert({
    id: deliverable.id,
    workspace_id: deliverable.workspace_id,
    run_id: deliverable.run_id,
    title: deliverable.title,
    content: deliverable.content,
    checklist: deliverable.checklist,
    sources: deliverable.sources,
    created_at: deliverable.created_at,
  })

  if (error) {
    console.error('[saveDeliverable] Failed to save deliverable:', error.message)
    throw new Error(`Failed to save deliverable: ${error.message}`)
  }
}

// ============================================================
// Fallback assembly helpers (used when editor output is missing)
// ============================================================

function buildFallbackSummary(agentOutputs: Record<string, any>): string {
  const findings = collectFindings(agentOutputs)
  const recommendations = collectRecommendations(agentOutputs)

  if (findings.length === 0 && recommendations.length === 0) {
    return 'Analysis complete. Please review the detailed findings below.'
  }

  const parts: string[] = []
  if (findings.length > 0) {
    parts.push(`This analysis identified ${findings.length} key finding${findings.length === 1 ? '' : 's'}.`)
  }
  if (recommendations.length > 0) {
    parts.push(
      `${recommendations.length} strategic recommendation${recommendations.length === 1 ? '' : 's'} ${recommendations.length === 1 ? 'has' : 'have'} been developed.`
    )
  }
  return parts.join(' ')
}

function collectFindings(agentOutputs: Record<string, any>): any[] {
  const findings: any[] = []
  for (const output of Object.values(agentOutputs)) {
    if (output?.findings && Array.isArray(output.findings)) {
      findings.push(...output.findings)
    }
  }
  return findings
}

function collectRecommendations(agentOutputs: Record<string, any>): any[] {
  const recs: any[] = []
  for (const output of Object.values(agentOutputs)) {
    if (output?.recommendations && Array.isArray(output.recommendations)) {
      recs.push(...output.recommendations)
    }
  }
  return recs
}

function collectPlan(agentOutputs: Record<string, any>): any[] {
  for (const output of Object.values(agentOutputs)) {
    if (output?.plan_30_60_90 && Array.isArray(output.plan_30_60_90)) {
      return output.plan_30_60_90
    }
  }
  return []
}
