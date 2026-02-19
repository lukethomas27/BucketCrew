import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/[id]/runs/[runId]/stream
 * Server-Sent Events endpoint for real-time workflow progress.
 * Polls the workflow_runs table every 1.5 seconds and streams new progress entries.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; runId: string } }
) {
  // Auth check with regular client
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify workspace ownership
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', params.id)
    .single();

  if (!workspace || workspace.owner_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let lastProgressCount = 0;
      const serviceClient = createServiceClient();

      const interval = setInterval(async () => {
        try {
          const { data: run } = await serviceClient
            .from('workflow_runs')
            .select('status, progress, result, error')
            .eq('id', params.runId)
            .single();

          if (!run) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: 'Run not found' })}\n\n`
              )
            );
            clearInterval(interval);
            controller.close();
            return;
          }

          const progress = (run.progress || []) as any[];

          // Only send if there are new progress entries or status changed
          if (
            progress.length > lastProgressCount ||
            run.status === 'completed' ||
            run.status === 'failed'
          ) {
            const newEntries = progress.slice(lastProgressCount);
            lastProgressCount = progress.length;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  status: run.status,
                  progress: newEntries,
                  allProgress: progress,
                  result: run.result,
                  error: run.error,
                })}\n\n`
              )
            );
          }

          if (run.status === 'completed' || run.status === 'failed') {
            clearInterval(interval);
            controller.close();
          }
        } catch (err) {
          // Don't kill the stream on transient errors
          console.error('[SSE] Polling error:', err);
        }
      }, 1500);

      // 5 minute timeout safety
      const timeout = setTimeout(() => {
        clearInterval(interval);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'Stream timeout' })}\n\n`
          )
        );
        controller.close();
      }, 5 * 60 * 1000);

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearTimeout(timeout);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
