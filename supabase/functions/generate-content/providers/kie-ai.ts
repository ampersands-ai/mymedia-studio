import { ProviderRequest, ProviderResponse } from "./index.ts";

export async function callKieAI(request: ProviderRequest): Promise<ProviderResponse> {
  const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY');
  
  if (!KIE_AI_API_KEY) {
    throw new Error('KIE_AI_API_KEY not configured. Please add it to your Supabase secrets.');
  }

  // TODO: Replace with actual Kie.ai API endpoint once provided
  const baseUrl = 'https://api.kie.ai'; // Placeholder
  const endpoint = request.api_endpoint || '/v1/generate';
  
  console.log('Calling Kie.ai API:', endpoint, 'Model:', request.model);

  // Build request payload based on model type
  const payload: Record<string, any> = {
    model: request.model,
    prompt: request.prompt,
    ...request.parameters
  };

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kie.ai API error:', response.status, errorText);
      throw new Error(`Kie.ai API error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Check if response is JSON (contains URL) or binary data
    if (contentType.includes('application/json')) {
      const jsonResponse = await response.json();
      
      // If JSON response contains a URL to the generated content
      if (jsonResponse.url || jsonResponse.output_url || jsonResponse.image_url) {
        const contentUrl = jsonResponse.url || jsonResponse.output_url || jsonResponse.image_url;
        console.log('Downloading generated content from:', contentUrl);
        
        const contentResponse = await fetch(contentUrl);
        if (!contentResponse.ok) {
          throw new Error(`Failed to download generated content: ${contentResponse.status}`);
        }
        
        const arrayBuffer = await contentResponse.arrayBuffer();
        const output_data = new Uint8Array(arrayBuffer);
        
        // Determine file extension from content type or URL
        const fileExtension = determineFileExtension(
          contentResponse.headers.get('content-type') || '',
          contentUrl
        );
        
        return {
          output_data,
          file_extension: fileExtension,
          file_size: output_data.length,
          metadata: jsonResponse
        };
      }
      
      throw new Error('Kie.ai response does not contain expected output URL');
    }
    
    // Direct binary response
    const arrayBuffer = await response.arrayBuffer();
    const output_data = new Uint8Array(arrayBuffer);
    
    const fileExtension = determineFileExtension(contentType, '');
    
    return {
      output_data,
      file_extension,
      file_size: output_data.length,
      metadata: {
        model: request.model,
        content_type: contentType
      }
    };

  } catch (error: any) {
    console.error('Kie.ai provider error:', error);
    throw new Error(`Kie.ai provider failed: ${error.message}`);
  }
}

function determineFileExtension(contentType: string, url: string): string {
  // Try to get extension from URL first
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }
  
  // Fallback to content type mapping
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'text/plain': 'txt'
  };
  
  return mimeToExt[contentType.toLowerCase()] || 'bin';
}
