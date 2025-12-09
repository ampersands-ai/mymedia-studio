import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export async function downloadSingleOutput(
  storagePath: string,
  outputIndex: number,
  contentType: string,
  onDownloadSuccess?: () => void
) {
  try {
    const { data, error } = await supabase.storage
      .from('generated-content')
      .createSignedUrl(storagePath, 60);
    
    if (error || !data?.signedUrl) {
      toast.error('Failed to create download link');
      return;
    }
    
    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const extension = storagePath.split('.').pop() || 'file';
    a.download = `output-${outputIndex + 1}-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    onDownloadSuccess?.();
  } catch (error) {
    logger.error('Single output download failed', error as Error, {
      utility: 'download-utils',
      storagePath: storagePath.substring(0, 50),
      contentType,
      outputIndex,
      operation: 'downloadSingleOutput'
    });
    toast.error('Failed to download');
  }
}

export async function downloadMultipleOutputs(
  outputs: Array<{ id: string; storage_path: string; output_index: number }>,
  contentType: string,
  onDownloadSuccess?: () => void
) {
  // Single output - direct download using signed URL
  if (outputs.length === 1) {
    await downloadSingleOutput(outputs[0].storage_path, outputs[0].output_index, contentType, onDownloadSuccess);
    return;
  }

  // Multiple outputs - create ZIP using signed URLs
  try {
    const toastId = toast.loading(`Preparing ${outputs.length} files for download...`);
    
    const zip = new JSZip();
    
    // Download all files in parallel using signed URLs
    const downloadPromises = outputs.map(async (output) => {
      const { data, error } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(output.storage_path, 60);
      
      if (error || !data?.signedUrl) {
        throw new Error(`Failed to create signed URL for ${output.storage_path}`);
      }
      
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const extension = output.storage_path.split('.').pop() || 'file';
      const filename = `output-${output.output_index + 1}.${extension}`;
      zip.file(filename, blob);
    });
    
    await Promise.all(downloadPromises);
    
    // Update toast with progress
    toast.loading('Creating ZIP file...', { id: toastId });
    
    // Generate ZIP
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // Trigger download
    const url = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generations-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success(`Successfully downloaded ${outputs.length} outputs!`, { id: toastId });
    onDownloadSuccess?.();
  } catch (error) {
    logger.error('Batch outputs download failed', error as Error, {
      utility: 'download-utils',
      outputCount: outputs.length,
      contentType,
      operation: 'downloadMultipleOutputs'
    });
    toast.error('Failed to download files. Try downloading individually from History.');
  }
}
