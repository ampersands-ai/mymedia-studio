import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { edgeBrand } from "../_shared/brand.ts";

/**
 * Send Web Push Notification
 * Uses the Web Push protocol to send notifications to subscribed users
 */

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  url?: string;
}

// Convert base64url to Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return new Uint8Array([...binary].map(char => char.charCodeAt(0)));
}

// Create JWT for VAPID authentication
async function createVapidJWT(
  audience: string,
  subject: string,
  privateKey: CryptoKey,
  expiration: number
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    data
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Import PKCS8 private key
async function importPrivateKey(base64urlKey: string): Promise<CryptoKey> {
  const keyData = base64urlToUint8Array(base64urlKey);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyData.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// Send push notification to a single subscription
async function sendToSubscription(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: CryptoKey,
  subject: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

    const jwt = await createVapidJWT(audience, subject, vapidPrivateKey, expiration);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: payload,
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status };
    } else if (response.status === 404 || response.status === 410) {
      // Subscription expired or unsubscribed
      return { success: false, statusCode: response.status, error: 'Subscription expired' };
    } else {
      const errorText = await response.text();
      return { success: false, statusCode: response.status, error: errorText };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body: PushNotificationRequest = await req.json();
    const { user_id, title, body: notificationBody, icon, badge, tag, data, url } = body;

    if (!user_id || !title || !notificationBody) {
      return new Response(
        JSON.stringify({ error: 'user_id, title, and body are required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const logger = new EdgeLogger('send-push-notification', requestId, supabase, true);
    logger.info('Sending push notification', { userId: user_id, metadata: { title } });

    // Get active VAPID keys
    const { data: vapidKeys, error: vapidError } = await supabase
      .from('vapid_keys')
      .select('public_key, private_key')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (vapidError || !vapidKeys) {
      logger.error('VAPID keys not found', vapidError as Error);
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's active push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh_key, auth_key')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      logger.info('No active push subscriptions found for user', { userId: user_id });
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions', sent: 0 }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import private key
    const privateKey = await importPrivateKey(vapidKeys.private_key);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body: notificationBody,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/badge-72x72.png',
      tag: tag || 'default',
      data: {
        ...data,
        url: url || '/dashboard/history',
        timestamp: Date.now(),
      },
    });

    const subject = `mailto:${edgeBrand.noreplyEmail}`;
    let successCount = 0;
    let failCount = 0;
    const expiredSubscriptions: string[] = [];

    // Send to all subscriptions
    for (const subscription of subscriptions) {
      const result = await sendToSubscription(
        subscription,
        notificationPayload,
        vapidKeys.public_key,
        privateKey,
        subject
      );

      if (result.success) {
        successCount++;
        // Update last_used_at
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', subscription.id);
      } else {
        failCount++;
        logger.warn('Push notification failed', {
          metadata: {
            subscriptionId: subscription.id,
            statusCode: result.statusCode,
            error: result.error,
          },
        });

        // Mark expired subscriptions as inactive
        if (result.statusCode === 404 || result.statusCode === 410) {
          expiredSubscriptions.push(subscription.id);
        }
      }
    }

    // Deactivate expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', expiredSubscriptions);
      
      logger.info('Deactivated expired subscriptions', {
        metadata: { count: expiredSubscriptions.length },
      });
    }

    logger.logDuration('Push notifications sent', startTime);
    logger.info('Push notification results', {
      userId: user_id,
      metadata: { successCount, failCount, expiredCount: expiredSubscriptions.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        expired: expiredSubscriptions.length,
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const logger = new EdgeLogger('send-push-notification', requestId, supabase, true);
    logger.error('Error sending push notification', error as Error);

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
