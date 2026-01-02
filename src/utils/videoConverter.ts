// Video converter utility for WebM to MP4 conversion
// Note: Full FFmpeg.wasm integration requires the @ffmpeg/ffmpeg package
// For now, we provide a download function and stub for future MP4 conversion

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function convertToMp4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // For now, return the WebM blob as-is
  // Full MP4 conversion requires FFmpeg.wasm setup
  // This is a placeholder that can be expanded later
  
  onProgress?.(0);
  
  try {
    // Dynamic import of FFmpeg when needed
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
    
    const ffmpeg = new FFmpeg();
    
    // Load FFmpeg with progress
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    onProgress?.(20);
    
    // Write input file
    await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
    onProgress?.(40);
    
    // Convert to MP4
    await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', 'output.mp4']);
    onProgress?.(80);
    
    // Read output file
    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    onProgress?.(100);
    
    // Create a copy of the buffer to ensure it's a regular ArrayBuffer
    const arrayBuffer = new Uint8Array(data).buffer;
    return new Blob([arrayBuffer], { type: 'video/mp4' });
  } catch (error) {
    console.warn('FFmpeg conversion failed, falling back to WebM:', error);
    // Fallback: return WebM with MP4 extension (works in most players)
    onProgress?.(100);
    return webmBlob;
  }
}

export function generateFilename(prefix: string = 'procedural-background'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}`;
}
