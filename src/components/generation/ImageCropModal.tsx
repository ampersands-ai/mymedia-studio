import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AspectRatioSelector } from "./AspectRatioSelector";
import { getCroppedImg, Area } from "@/utils/crop-canvas";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedImageBlob: Blob, croppedImageUrl: string) => void;
}

export const ImageCropModal = ({
  open,
  onOpenChange,
  imageUrl,
  onCropComplete,
}: ImageCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) {
      toast.error("Please adjust the crop area");
      return;
    }

    setIsProcessing(true);
    try {
      const { blob, url } = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(blob, url);
      toast.success("Image cropped successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Failed to crop image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset to defaults
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectRatio(1);
  };

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  const handleResetRotation = () => {
    setRotation(0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isProcessing) {
        e.preventDefault();
        handleApplyCrop();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isProcessing, croppedAreaPixels]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Crop Image</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCrop}
                disabled={isProcessing || !croppedAreaPixels}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply Crop"
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Cropper Area */}
        <div className="flex-1 relative bg-black/90 min-h-0">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio || undefined}
            rotation={rotation}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
            objectFit="contain"
          />
        </div>

        {/* Controls */}
        <div className="px-6 py-4 space-y-4 border-t bg-background">
          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Zoom
              </label>
              <span className="text-sm text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Rotation Controls */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Rotate
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRotate(90)}
                disabled={isProcessing}
                className="flex-1"
              >
                90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRotate(180)}
                disabled={isProcessing}
                className="flex-1"
              >
                180°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRotate(270)}
                disabled={isProcessing}
                className="flex-1"
              >
                270°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetRotation}
                disabled={isProcessing || rotation === 0}
                className="flex-1"
              >
                ↺ Reset
              </Button>
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <AspectRatioSelector
            selectedRatio={aspectRatio}
            onRatioChange={setAspectRatio}
          />

          {/* Keyboard Hints */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd> to
            apply or <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> to
            cancel
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
