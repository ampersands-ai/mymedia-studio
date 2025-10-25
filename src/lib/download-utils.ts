import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export async function downloadMultipleOutputs(
  outputs: Array<{ id: string; storage_path: string; output_index: number }>,
  contentType: string,
  onDownloadSuccess?: () => void
) {
  // Single output - direct download using public URL (no signed URL needed)
  if (outputs.length === 1) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${outputs[0].storage_path}`;
      
      const response = await fetch(publicUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = outputs[0].storage_path.split('.').pop() || 'file';
      a.download = `output-1-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!');
      onDownloadSuccess?.();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    }
    return;
  }

  // Multiple outputs - create ZIP using public URLs
  try {
    const toastId = toast.loading(`Preparing ${outputs.length} files for download...`);
    
    const zip = new JSZip();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Download all files in parallel using public URLs
    const downloadPromises = outputs.map(async (output) => {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${output.storage_path}`;
      const response = await fetch(publicUrl);
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
    console.error('Batch download error:', error);
    toast.error('Failed to download files. Try downloading individually from History.');
  }
}
