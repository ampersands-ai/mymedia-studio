import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import {
  handleOptionsRequest,
  createJsonResponse,
  createErrorResponse
} from '../_shared/cors-headers.ts';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const logger = new EdgeLogger('extend-session', requestId);

  try {
    logger.info("Session extension request received");

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('No authorization header');
      return createErrorResponse('Unauthorized', 401);
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
      return createErrorResponse(error.message, 500);
    }

    logger.logDuration('extend-session', startTime);
    logger.info("Session extended successfully");

    return createJsonResponse({ 
      success: true,
      message: "Session extended successfully",
      session: data.session
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Error extending session", err);
    return createErrorResponse(err.message, 500);
  }
};

Deno.serve(handler);
