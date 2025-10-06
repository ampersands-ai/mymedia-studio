import { ProviderRequest, ProviderResponse } from "./index.ts";

export async function callKieAI(request: ProviderRequest): Promise<ProviderResponse> {
  const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY');
  
  if (!KIE_AI_API_KEY) {
    throw new Error('KIE_AI_API_KEY not configured. Please add it to your Supabase secrets.');
  }

  const baseUrl = 'https://api.kie.ai';
  const createTaskEndpoint = request.api_endpoint || '/api/v1/jobs/createTask';
  
  console.log('Calling Kie.ai API - Model:', request.model, 'Endpoint:', createTaskEndpoint);

  // Build request payload according to Kie.ai's structure
  const payload: any = {
    model: request.model,
    input: {
      prompt: request.prompt,
      ...request.parameters
    }
  };

  console.log('Kie.ai payload input fields:', Object.keys(payload.input));
  console.log('Full payload:', JSON.stringify(payload, null, 2));

  try {
    // Step 1: Create the task
    console.log('Creating Kie.ai task:', JSON.stringify(payload));
    
    const createResponse = await fetch(`${baseUrl}${createTaskEndpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Kie.ai task creation error:', createResponse.status, errorText);
      throw new Error(`Kie.ai task creation failed: ${createResponse.status} - ${errorText}`);
    }

    const createData = await createResponse.json();
    console.log('Task created:', createData);

    // Check response structure
    if (createData.code !== 200 || !createData.data?.taskId) {
      throw new Error(`Kie.ai task creation failed: ${createData.message || 'Unknown error'}`);
    }

    const taskId = createData.data.taskId;
    console.log('Task ID:', taskId);

    // Step 2: Poll for task completion
    const maxRetries = 60; // 5 minutes (60 * 5 seconds)
    const pollInterval = 5000; // 5 seconds
    let retries = 0;
    let taskComplete = false;
    let resultData;

    // Wait 2 seconds before first poll (task needs time to start)
    await new Promise(resolve => setTimeout(resolve, 2000));

    while (!taskComplete && retries < maxRetries) {
      console.log(`Polling task status (attempt ${retries + 1}/${maxRetries})...`);
      
      const pollResponse = await fetch(
        `${baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${KIE_AI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!pollResponse.ok) {
        console.error('Polling error:', pollResponse.status);
        throw new Error(`Failed to poll task status: ${pollResponse.status}`);
      }

      const pollData = await pollResponse.json();
      console.log('Poll response:', pollData);

      if (pollData.code !== 200) {
        throw new Error(`Polling failed: ${pollData.message || 'Unknown error'}`);
      }

      const state = pollData.data?.state;
      
      if (state === 'success') {
        taskComplete = true;
        resultData = pollData.data;
        console.log('Task completed successfully');
      } else if (state === 'failed') {
        const failMsg = pollData.data?.failMsg || 'Unknown failure';
        console.error('Task failed:', failMsg);
        throw new Error(`Generation failed: ${failMsg}`);
      } else if (state === 'processing') {
        console.log('Task still processing...');
        retries++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        console.warn('Unexpected state:', state);
        retries++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (!taskComplete) {
      throw new Error('Generation timed out after 5 minutes');
    }

    // Step 3: Extract result URL
    if (!resultData.resultJson) {
      throw new Error('No result data returned from Kie.ai');
    }

    const resultJson = JSON.parse(resultData.resultJson);
    console.log('Result JSON:', resultJson);

    const resultUrl = resultJson.resultUrls?.[0];
    if (!resultUrl) {
      throw new Error('No result URL found in response');
    }

    console.log('Downloading result from:', resultUrl);

    // Step 4: Download the generated content
    const contentResponse = await fetch(resultUrl);
    if (!contentResponse.ok) {
      throw new Error(`Failed to download result: ${contentResponse.status}`);
    }

    const arrayBuffer = await contentResponse.arrayBuffer();
    const output_data = new Uint8Array(arrayBuffer);
    
    // Determine file extension
    const contentType = contentResponse.headers.get('content-type') || '';
    const fileExtension = determineFileExtension(contentType, resultUrl);
    
    console.log('Downloaded successfully. Size:', output_data.length, 'Extension:', fileExtension);

    return {
      output_data,
      file_extension: fileExtension,
      file_size: output_data.length,
      metadata: {
        model: request.model,
        task_id: taskId,
        result_url: resultUrl,
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
  
  return mimeToExt[contentType.toLowerCase()] || 'png'; // Default to png for images
}
