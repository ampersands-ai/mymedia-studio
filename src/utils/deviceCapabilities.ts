/**
 * Device capability detection utilities
 */

export interface DeviceCapabilities {
  webgpu: boolean;
  webgpuAdapter: boolean;
  captureStream: boolean;
  mediaRecorder: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Check if WebGPU is available and can get an adapter
 */
export async function checkWebGPUSupport(): Promise<{ supported: boolean; adapter: GPUAdapter | null }> {
  if (!navigator.gpu) {
    return { supported: false, adapter: null };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    
    if (!adapter) {
      return { supported: false, adapter: null };
    }

    return { supported: true, adapter };
  } catch (error) {
    console.warn('WebGPU adapter request failed:', error);
    return { supported: false, adapter: null };
  }
}

/**
 * Check if canvas capture stream is supported
 */
export function checkCaptureStreamSupport(): boolean {
  const canvas = document.createElement('canvas');
  return typeof canvas.captureStream === 'function';
}

/**
 * Check if MediaRecorder is supported
 */
export function checkMediaRecorderSupport(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

/**
 * Check if device is mobile
 */
export function checkIsMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device is iOS
 */
export function checkIsIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Check if device is Android
 */
export function checkIsAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Get all device capabilities (cached after first call)
 */
export function getDeviceCapabilities(): Omit<DeviceCapabilities, 'webgpuAdapter'> & { webgpu: boolean } {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  cachedCapabilities = {
    webgpu: !!navigator.gpu,
    webgpuAdapter: false, // Will be updated async
    captureStream: checkCaptureStreamSupport(),
    mediaRecorder: checkMediaRecorderSupport(),
    isMobile: checkIsMobile(),
    isIOS: checkIsIOS(),
    isAndroid: checkIsAndroid(),
  };

  return cachedCapabilities;
}

/**
 * Check if recording is fully supported
 */
export function canRecord(): boolean {
  const caps = getDeviceCapabilities();
  return caps.captureStream && caps.mediaRecorder;
}

/**
 * Check if MP4 conversion is recommended (avoid on mobile due to FFmpeg WASM overhead)
 */
export function shouldAllowMp4Conversion(): boolean {
  const caps = getDeviceCapabilities();
  return !caps.isMobile;
}
