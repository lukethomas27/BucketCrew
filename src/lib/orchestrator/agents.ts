import { callClaude, callClaudeWithThinking, callClaudeAgentic } from '@/lib/ai/claude'
import { PROMPT_BY_ROLE } from '@/lib/ai/prompts'
import { updateProgress } from './progress'
import type { WorkflowContext } from './context'
import type { ProgressEntry, AgentRole, RetrievedChunk } from '@/types'

/**
 * Execute a single agent step within a workflow.
 *
 * Selects the right Claude calling mode based on agent role:
 * - planner    → callClaude (fast, structured)
 * - researcher → callClaudeAgentic (tool_use: calculator + doc analysis)
 * - strategist → callClaudeWithThinking (extended thinking for deep strategy)
 * - editor     → callClaudeWithThinking (extended thinking for synthesis)
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
    message: getRunningMessage(step.agent_role, step.name),
    timestamp: new Date().toISOString(),
  }
  ctx.progress.push(runningEntry)
  await updateProgress(ctx.runId, runningEntry)

  try {
    // --- 2. Build user message ---
    const userMessage = buildUserMessage(ctx, step)

    // --- 3. Determine system prompt ---
    const systemPrompt = step.system_prompt || PROMPT_BY_ROLE[step.agent_role] || ''

    // --- 4. Call Claude with the appropriate mode ---
    const result = await callForRole(step.agent_role, systemPrompt, userMessage)

    // --- 5. Parse response ---
    let parsed: any
    try {
      let raw = result.content.trim()
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }
      parsed = JSON.parse(raw)
    } catch {
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
      message: getCompletedMessage(step.agent_role, step.name, durationMs),
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    }
    ctx.progress.push(completedEntry)
    await updateProgress(ctx.runId, completedEntry)

    return parsed
  } catch (error) {
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
// Call routing
// ---------------------------------------------------------------------------

async function callForRole(
  role: string,
  systemPrompt: string,
  userMessage: string
) {
  const messages = [{ role: 'user' as const, content: userMessage }]

  switch (role) {
    case 'strategist':
      return callClaudeWithThinking({
        system: systemPrompt,
        messages,
        maxTokens: 16000,
        thinkingBudget: 10000,
      })

    case 'editor':
      return callClaudeWithThinking({
        system: systemPrompt,
        messages,
        maxTokens: 16000,
        thinkingBudget: 12000,
      })

    case 'researcher':
      return callClaudeAgentic({
        system: systemPrompt,
        messages,
        maxTokens: 8192,
        maxTurns: 4,
      })

    case 'planner':
    default:
      return callClaude({
        system: systemPrompt,
        messages,
        maxTokens: 4096,
        temperature: 0.3,
      })
  }
}

// ---------------------------------------------------------------------------
// Progress messages — make it feel like a real team working
// ---------------------------------------------------------------------------

function getRunningMessage(role: string, name: string): string {
  switch (role) {
    case 'planner':
      return `${name} is scoping the engagement and assigning research tasks...`
    case 'researcher':
      return `${name} is analyzing your documents and running calculations...`
    case 'strategist':
      return `${name} is developing strategic recommendations (deep analysis)...`
    case 'editor':
      return `${name} is polishing the final deliverable (quality review)...`
    default:
      return `${name} is working...`
  }
}

function getCompletedMessage(role: string, name: string, durationMs: number): string {
  const seconds = Math.round(durationMs / 1000)
  switch (role) {
    case 'planner':
      return `${name} completed the research plan (${seconds}s)`
    case 'researcher':
      return `${name} finished analysis with ${seconds}s of document review`
    case 'strategist':
      return `${name} delivered strategic recommendations (${seconds}s of deep thinking)`
    case 'editor':
      return `${name} finalized the deliverable (${seconds}s)`
    default:
      return `${name} finished (${seconds}s)`
  }
}

// ---------------------------------------------------------------------------
// Context building
// ---------------------------------------------------------------------------

function buildUserMessage(
  ctx: WorkflowContext,
  step: { agent_role: string; id: string }
): string {
  const sections: string[] = []

  // -- User input --
  sections.push('=== USER INPUT ===')
  for (const [key, value] of Object.entries(ctx.userInput)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    sections.push(`${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
  }

  // -- Bucket context (retrieved document chunks) --
  if (ctx.bucketContext.length > 0) {
    sections.push('')
    sections.push('=== BUSINESS DOCUMENTS ===')
    sections.push(`(${ctx.bucketContext.length} relevant excerpts from uploaded files)`)
    sections.push('')
    ctx.bucketContext.forEach((chunk: RetrievedChunk, idx: number) => {
      sections.push(
        `--- [${idx + 1}] ${chunk.file_name} (section ${chunk.chunk_index + 1}, relevance: ${(chunk.similarity * 100).toFixed(0)}%) ---`
      )
      sections.push(chunk.content)
      sections.push('')
    })
  } else {
    sections.push('')
    sections.push('=== BUSINESS DOCUMENTS ===')
    sections.push('No documents were provided. Work with the user input and your business expertise.')
  }

  // -- Previous agent outputs --
  const priorOutputKeys = Object.keys(ctx.agentOutputs)
  if (priorOutputKeys.length > 0) {
    sections.push('')
    sections.push('=== TEAM MEMBERS\' COMPLETED WORK ===')
    for (const key of priorOutputKeys) {
      const output = ctx.agentOutputs[key]
      sections.push(`--- ${key} ---`)
      sections.push(typeof output === 'string' ? output : JSON.stringify(output, null, 2))
      sections.push('')
    }
  }

  return sections.join('\n')
}
