import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ModelCallResult {
  content: string
  input_tokens: number
  output_tokens: number
  model: string
  thinking?: string
}

/**
 * Standard Claude call — used for Planner and Researchers.
 * Fast, reliable, structured JSON output.
 */
export async function callClaude(params: {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  model?: string
  maxTokens?: number
  temperature?: number
}): Promise<ModelCallResult> {
  const model = params.model || 'claude-sonnet-4-20250514'
  const response = await anthropic.messages.create({
    model,
    max_tokens: params.maxTokens || 8192,
    temperature: params.temperature ?? 0.4,
    system: params.system,
    messages: params.messages,
  })

  const textContent = response.content.find(b => b.type === 'text')
  return {
    content: textContent?.text || '',
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    model,
  }
}

/**
 * Extended thinking call — used for Strategist and Editor roles.
 * Enables Claude's deep reasoning for higher-quality strategic analysis.
 * The model thinks through the problem before producing its output.
 */
export async function callClaudeWithThinking(params: {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  model?: string
  maxTokens?: number
  thinkingBudget?: number
}): Promise<ModelCallResult> {
  const model = params.model || 'claude-sonnet-4-20250514'
  const response = await anthropic.messages.create({
    model,
    max_tokens: params.maxTokens || 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: params.thinkingBudget || 10000,
    },
    // Note: temperature must not be set when using extended thinking
    // system prompt goes in messages for thinking mode
    system: params.system,
    messages: params.messages,
  })

  let textContent = ''
  let thinkingContent = ''

  for (const block of response.content) {
    if (block.type === 'thinking') {
      thinkingContent = block.thinking
    } else if (block.type === 'text') {
      textContent = block.text
    }
  }

  return {
    content: textContent,
    thinking: thinkingContent,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    model,
  }
}

/**
 * Multi-turn agentic call — used for Researcher agents that need to
 * iteratively analyze documents and use tools (like a calculator).
 *
 * Supports tool_use with a built-in calculator tool for financial analysis.
 */
export async function callClaudeAgentic(params: {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  model?: string
  maxTokens?: number
  maxTurns?: number
}): Promise<ModelCallResult> {
  const model = params.model || 'claude-sonnet-4-20250514'
  const tools: Anthropic.Tool[] = [
    {
      name: 'calculator',
      description:
        'Perform arithmetic calculations. Use this for computing margins, growth rates, ratios, percentages, projections, and other numerical analysis. Always show your work.',
      input_schema: {
        type: 'object' as const,
        properties: {
          expression: {
            type: 'string',
            description:
              'A mathematical expression to evaluate, e.g. "(150000 - 120000) / 150000 * 100" for margin calculation',
          },
          label: {
            type: 'string',
            description: 'Human-readable label for what this calculation represents',
          },
        },
        required: ['expression', 'label'],
      },
    },
    {
      name: 'analyze_document_section',
      description:
        'Request a focused re-read of a specific section of the business documents. Use when you need to drill deeper into a particular topic, verify a data point, or cross-reference information across documents.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'What specific information are you looking for?',
          },
          document_name: {
            type: 'string',
            description: 'Optional: specific document to focus on',
          },
        },
        required: ['query'],
      },
    },
  ]

  let conversationMessages: Anthropic.MessageParam[] = params.messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let finalContent = ''
  const maxTurns = params.maxTurns || 5
  let turn = 0

  while (turn < maxTurns) {
    turn++

    const response = await anthropic.messages.create({
      model,
      max_tokens: params.maxTokens || 8192,
      temperature: 0.3,
      system: params.system,
      messages: conversationMessages,
      tools,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    // Check if model wants to use tools
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
    const textBlocks = response.content.filter(b => b.type === 'text')

    if (textBlocks.length > 0) {
      finalContent = textBlocks.map(b => b.type === 'text' ? b.text : '').join('\n')
    }

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      break
    }

    // Process tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolBlock of toolUseBlocks) {
      if (toolBlock.type !== 'tool_use') continue

      if (toolBlock.name === 'calculator') {
        const input = toolBlock.input as { expression: string; label: string }
        let result: string
        try {
          // Safe math evaluation — only allow numbers and operators
          const sanitized = input.expression.replace(/[^0-9+\-*/().%\s]/g, '')
          const computed = Function(`"use strict"; return (${sanitized})`)()
          result = `${input.label}: ${input.expression} = ${computed}`
        } catch {
          result = `Error: could not evaluate "${input.expression}"`
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: result,
        })
      } else if (toolBlock.name === 'analyze_document_section') {
        // This is a "virtual" tool — we just acknowledge it and let the model
        // work with the documents already in context. The re-read cue helps
        // the model focus its attention on a specific aspect.
        const input = toolBlock.input as { query: string; document_name?: string }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: `Focused analysis requested: "${input.query}"${input.document_name ? ` in ${input.document_name}` : ''}. Please analyze the relevant sections from the documents provided above and continue your research.`,
        })
      }
    }

    // Add assistant response and tool results to conversation
    conversationMessages = [
      ...conversationMessages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ]
  }

  return {
    content: finalContent,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    model,
  }
}
