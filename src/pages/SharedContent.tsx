import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function SharedContent() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { execute } = useErrorHandler();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('image');

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    fetchSharedContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSharedContent = async () => {
    try {
      await execute(
        async () => {
          const { data, error: fetchError } = await supabase.functions.invoke('get-shared-content', {
            body: { token }
          });

          if (fetchError) throw fetchError;

          if (data.error) {
            setError(data.error);
          } else {
            setContentUrl(data.signed_url);
            setContentType(data.content_type);
          }
        },
        {
          showSuccessToast: false,
          context: {
            component: 'SharedContent',
            operation: 'fetchSharedContent',
            token,
          },
          onError: (error) => {
            setError(error.message || 'Failed to load shared content');
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!contentUrl) return;

    toast.loading('Preparing download...', { id: 'download' });
    await execute(
      async () => {
        const response = await fetch(contentUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `shared-${contentType}-${Date.now()}.${contentType === 'video' ? 'mp4' : contentType === 'audio' ? 'mp3' : 'png'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      },
      {
        successMessage: 'Download started!',
        errorMessage: 'Download failed',
        context: {
          component: 'SharedContent',
          operation: 'handleDownload',
          contentType,
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-bold">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-black">Share Link Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} variant="default">
            Go to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">Shared Creation</h1>
            <Button onClick={handleDownload} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="rounded-lg overflow-hidden bg-muted">
            {contentType === 'image' && contentUrl && (
              <img src={contentUrl} alt="Shared content" className="w-full h-auto" />
            )}
            {contentType === 'video' && contentUrl && (
              <video src={contentUrl} controls className="w-full h-auto" />
            )}
            {contentType === 'audio' && contentUrl && (
              <div className="p-8">
                <audio src={contentUrl} controls className="w-full" />
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Created with <span className="font-bold">artifio.ai</span>
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="mt-4"
            >
              Create Your Own
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
