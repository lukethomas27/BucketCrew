import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ModelCallResult {
  content: string
  input_tokens: number
  output_tokens: number
  model: string
}

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
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature ?? 0.7,
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
