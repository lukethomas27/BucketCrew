import { NextResponse } from 'next/server';
import { getStripe, PLANS } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

/**
 * POST /api/stripe/webhook
 * Handle incoming Stripe webhook events.
 * Verifies the signature and processes checkout completions, subscription updates, and cancellations.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);
    // Return 200 even on processing errors to prevent Stripe from retrying
    // Log the error for investigation
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Handle checkout.session.completed — user just finished paying.
 * Update the workspace subscription to the purchased plan.
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  const workspaceId = session.metadata?.workspace_id;
  const plan = session.metadata?.plan as keyof typeof PLANS | undefined;

  if (!workspaceId || !plan) {
    console.error('[Stripe Webhook] checkout.session.completed missing metadata:', {
      workspace_id: workspaceId,
      plan,
    });
    return;
  }

  const planConfig = PLANS[plan];
  if (!planConfig) {
    console.error('[Stripe Webhook] Invalid plan in metadata:', plan);
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan,
      credits_total: planConfig.credits,
      credits_used: 0,
    })
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update subscription:', error.message);
    throw error;
  }

  console.log(`[Stripe Webhook] Workspace ${workspaceId} upgraded to ${plan}`);
}

/**
 * Handle customer.subscription.updated — plan change or renewal.
 * Sync the plan and credits with the Supabase subscriptions table.
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const workspaceId = subscription.metadata?.workspace_id;
  const plan = subscription.metadata?.plan as keyof typeof PLANS | undefined;

  if (!workspaceId || !plan) {
    console.error('[Stripe Webhook] customer.subscription.updated missing metadata:', {
      workspace_id: workspaceId,
      plan,
    });
    return;
  }

  const planConfig = PLANS[plan];
  if (!planConfig) {
    console.error('[Stripe Webhook] Invalid plan in metadata:', plan);
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan,
      credits_total: planConfig.credits,
    })
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update subscription on change:', error.message);
    throw error;
  }

  console.log(`[Stripe Webhook] Workspace ${workspaceId} subscription updated to ${plan}`);
}

/**
 * Handle customer.subscription.deleted — subscription cancelled.
 * Downgrade the workspace back to the free tier.
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const workspaceId = subscription.metadata?.workspace_id;

  if (!workspaceId) {
    console.error('[Stripe Webhook] customer.subscription.deleted missing workspace_id in metadata');
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      credits_total: 3,
      credits_used: 0,
    })
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[Stripe Webhook] Failed to downgrade subscription:', error.message);
    throw error;
  }

  console.log(`[Stripe Webhook] Workspace ${workspaceId} downgraded to free`);
}
