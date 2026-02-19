import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe, PLANS } from '@/lib/stripe';

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout session for upgrading to a paid plan.
 * Body: { plan: 'pro' | 'business', workspace_id: string }
 */
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { plan } = body;

    // Validate plan
    if (!plan || !(['pro', 'business'] as const).includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "pro" or "business".' },
        { status: 400 }
      );
    }

    // Get user's workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const workspace_id = workspace.id;

    const selectedPlan = PLANS[plan as keyof typeof PLANS];

    // Build absolute URLs for redirect
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${origin}/dashboard/settings?upgraded=true`;
    const cancelUrl = `${origin}/dashboard/settings`;

    // Create Stripe Checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.stripe_price_id,
          quantity: 1,
        },
      ],
      metadata: {
        workspace_id,
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          workspace_id,
          user_id: user.id,
          plan,
        },
      },
      customer_email: user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[POST /api/stripe/checkout] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
