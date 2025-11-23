import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal = ({ isOpen, onClose }: WelcomeModalProps) => {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary-500" />
              <DialogTitle className="text-2xl font-bold">Welcome to Artifio.ai!</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-base pt-2">
            Get started with 5 free credits + earn <span className="font-bold text-primary-500">2 bonus credits</span> by completing your first creation!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold">Ready to start creating?</h3>
          <p className="text-muted-foreground">
            Head to the Create page to begin generating amazing AI content with your free credits.
          </p>

          <div className="pt-4 flex justify-center">
            <Button 
              onClick={onClose}
              className="bg-primary-500 hover:bg-primary-600 text-neutral-900 font-bold"
            >
              Get Started
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
