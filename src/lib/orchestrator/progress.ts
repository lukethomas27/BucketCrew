import { createServiceClient } from '@/lib/supabase/server'
import type { ProgressEntry } from '@/types'

/**
 * Append a progress entry to the workflow_runs row's progress JSONB array.
 * Uses service role client since this runs in background (no user session).
 */
export async function updateProgress(
  runId: string,
  entry: ProgressEntry
): Promise<void> {
  const supabase = createServiceClient()

  const { data: run, error: fetchError } = await supabase
    .from('workflow_runs')
    .select('progress')
    .eq('id', runId)
    .single()

  if (fetchError) {
    console.error(`[updateProgress] Failed to fetch run ${runId}:`, fetchError.message)
    return
  }

  const currentProgress: ProgressEntry[] = (run?.progress as ProgressEntry[]) || []
  const updatedProgress = [...currentProgress, entry]

  const { error: updateError } = await supabase
    .from('workflow_runs')
    .update({ progress: updatedProgress })
    .eq('id', runId)

  if (updateError) {
    console.error(`[updateProgress] Failed to update progress for run ${runId}:`, updateError.message)
  }
}

/**
 * Update the overall status of a workflow run.
 * Uses service role client since this runs in background (no user session).
 */
export async function updateRunStatus(
  runId: string,
  status: string,
  result?: any,
  error?: string
): Promise<void> {
  const supabase = createServiceClient()

  const updatePayload: Record<string, any> = { status }

  if (status === 'running') {
    updatePayload.started_at = new Date().toISOString()
  }

  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updatePayload.completed_at = new Date().toISOString()
  }

  if (result !== undefined) {
    updatePayload.result = result
  }

  if (error !== undefined) {
    updatePayload.error = error
  }

  const { error: updateError } = await supabase
    .from('workflow_runs')
    .update(updatePayload)
    .eq('id', runId)

  if (updateError) {
    console.error(`[updateRunStatus] Failed to update status for run ${runId}:`, updateError.message)
  }
}
