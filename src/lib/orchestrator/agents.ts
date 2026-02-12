import { callClaude } from '@/lib/ai/claude'
import { PROMPT_BY_ROLE } from '@/lib/ai/prompts'
import { updateProgress } from './progress'
import type { WorkflowContext } from './context'
import type { ProgressEntry, AgentRole, RetrievedChunk } from '@/types'

/**
 * Execute a single agent step within a workflow.
 *
 * 1. Emits a "running" progress entry.
 * 2. Builds the user message from userInput, bucket context, and prior agent outputs.
 * 3. Calls Claude with the agent's system prompt.
 * 4. Parses the response as JSON (falls back to raw text on parse failure).
 * 5. Stores the result in ctx.agentOutputs[step.id].
 * 6. Accumulates token usage in ctx.totalTokensUsed.
 * 7. Emits a "completed" progress entry.
 * 8. Returns the parsed result.
 */
export async function runAgent(
  ctx: WorkflowContext,
  step: {
    agent_role: string
    name: string
    system_prompt: string
    id: string
  }
): Promise<any> {
  const startTime = Date.now()

  // --- 1. Emit running progress ---
  const runningEntry: ProgressEntry = {
    agent: step.name,
    role: step.agent_role as AgentRole,
    status: 'running',
    message: `${step.name} is working...`,
    timestamp: new Date().toISOString(),
  }
  ctx.progress.push(runningEntry)
  await updateProgress(ctx.runId, runningEntry)

  try {
    // --- 2. Build user message ---
    const userMessage = buildUserMessage(ctx, step)

    // --- 3. Determine system prompt ---
    // Prefer the step-level prompt; fall back to the role-based default
    const systemPrompt = step.system_prompt || PROMPT_BY_ROLE[step.agent_role] || ''

    // --- 4. Call Claude ---
    const result = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    // --- 5. Parse response ---
    let parsed: any
    try {
      // Strip markdown code fences if the model wraps its output
      let raw = result.content.trim()
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }
      parsed = JSON.parse(raw)
    } catch {
      // Fallback: treat the response as raw text
      parsed = { raw_text: result.content }
    }

    // --- 6. Store result ---
    ctx.agentOutputs[step.id] = parsed

    // --- 7. Track tokens ---
    ctx.totalTokensUsed.input += result.input_tokens
    ctx.totalTokensUsed.output += result.output_tokens

    // --- 8. Emit completed progress ---
    const durationMs = Date.now() - startTime
    const completedEntry: ProgressEntry = {
      agent: step.name,
      role: step.agent_role as AgentRole,
      status: 'completed',
      message: `${step.name} finished.`,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    }
    ctx.progress.push(completedEntry)
    await updateProgress(ctx.runId, completedEntry)

    return parsed
  } catch (error) {
    // Emit an error progress entry so the UI can reflect failure
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorEntry: ProgressEntry = {
      agent: step.name,
      role: step.agent_role as AgentRole,
      status: 'error',
      message: `${step.name} failed: ${errorMessage}`,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    }
    ctx.progress.push(errorEntry)
    await updateProgress(ctx.runId, errorEntry)

    throw error
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assemble the user-facing message that provides the agent with all relevant context:
 * - The user's original input/goal
 * - Retrieved document chunks from the business bucket
 * - Outputs from previously completed agents
 */
function buildUserMessage(
  ctx: WorkflowContext,
  step: { agent_role: string; id: string }
): string {
  const sections: string[] = []

  // -- User input --
  sections.push('=== USER INPUT ===')
  for (const [key, value] of Object.entries(ctx.userInput)) {
    sections.push(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
  }

  // -- Bucket context (retrieved document chunks) --
  if (ctx.bucketContext.length > 0) {
    sections.push('')
    sections.push('=== BUSINESS DOCUMENTS ===')
    ctx.bucketContext.forEach((chunk: RetrievedChunk, idx: number) => {
      sections.push(
        `--- Document ${idx + 1}: ${chunk.file_name} (chunk ${chunk.chunk_index}, relevance: ${chunk.similarity.toFixed(3)}) ---`
      )
      sections.push(chunk.content)
    })
  }

  // -- Previous agent outputs --
  const priorOutputKeys = Object.keys(ctx.agentOutputs)
  if (priorOutputKeys.length > 0) {
    sections.push('')
    sections.push('=== PREVIOUS AGENT OUTPUTS ===')
    for (const key of priorOutputKeys) {
      const output = ctx.agentOutputs[key]
      sections.push(`--- ${key} ---`)
      sections.push(typeof output === 'string' ? output : JSON.stringify(output, null, 2))
    }
  }

  return sections.join('\n')
}
