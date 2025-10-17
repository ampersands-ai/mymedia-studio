import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  caption?: string;
  hashtags?: string[];
  onDownload: () => void;
}

export const ShareModal = ({ 
  open, 
  onOpenChange, 
  imageUrl, 
  caption, 
  hashtags,
  onDownload 
}: ShareModalProps) => {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
      trackEvent('share_copy_link', { method: 'clipboard' });
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy link');
    }
  };
  
  const handleTwitterShare = () => {
    const text = `${caption || 'Check out my AI creation!'}\n\n${hashtags?.join(' ') || ''}\n\nCreated with artifio.ai`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
    trackEvent('share_twitter', { has_caption: !!caption });
  };
  
  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
    trackEvent('share_linkedin');
  };
  
  const handleDownloadForInstagram = () => {
    onDownload();
    toast.success('Download for Instagram ready!');
    trackEvent('share_instagram_download');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Share Your Creation</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 pt-2">
          <Button 
            onClick={handleCopyLink} 
            variant="outline" 
            className="h-12 justify-start text-left border-2"
          >
            <LinkIcon className="h-4 w-4 mr-3" />
            Copy Link
          </Button>
          <Button 
            onClick={handleTwitterShare} 
            variant="outline" 
            className="h-12 justify-start text-left border-2"
          >
            <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on Twitter
          </Button>
          <Button 
            onClick={handleLinkedInShare} 
            variant="outline" 
            className="h-12 justify-start text-left border-2"
          >
            <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Share on LinkedIn
          </Button>
          <Button 
            onClick={handleDownloadForInstagram} 
            variant="outline" 
            className="h-12 justify-start text-left border-2"
          >
            <Download className="h-4 w-4 mr-3" />
            Download for Instagram
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
