import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const logger = new EdgeLogger('extend-session', requestId);

  try {
    logger.info("Session extension request received");

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Refresh the session
    logger.info("Refreshing session");
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      logger.error("Session refresh failed", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.logDuration('extend-session', startTime);
    logger.info("Session extended successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Session extended successfully",
      session: data.session
    }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Error extending session", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
};

Deno.serve(handler);
