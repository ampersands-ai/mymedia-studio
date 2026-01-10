import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, Play, ArrowRight, Image as ImageIcon, Video, Music } from "lucide-react";
import { toast } from "sonner";
import type { ModelSample } from "@/hooks/useModelPages";

interface ModelSampleGalleryProps {
  samples: ModelSample[];
  modelName: string;
  onTryPrompt: (prompt: string) => void;
}

export function ModelSampleGallery({ samples, modelName, onTryPrompt }: ModelSampleGalleryProps) {
  const [selectedSample, setSelectedSample] = useState<ModelSample | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!samples || samples.length === 0) {
    return (
      <section id="samples" className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Sample Gallery</h2>
          <p className="text-muted-foreground mb-8">
            No samples available yet. Be the first to create with {modelName}!
          </p>
          <Button onClick={() => onTryPrompt("")} className="gap-2">
            Create First Sample
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>
    );
  }

  const handleCopyPrompt = (sample: ModelSample) => {
    navigator.clipboard.writeText(sample.prompt);
    setCopiedId(sample.id);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getOutputTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "audio":
        return <Music className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const renderMedia = (sample: ModelSample, isExpanded = false) => {
    const baseClasses = isExpanded 
      ? "w-full max-h-[60vh] object-contain rounded-lg" 
      : "w-full h-full object-cover";

    if (sample.output_type === "video") {
      return (
        <video
          src={sample.output_url}
          poster={sample.thumbnail_url || undefined}
          controls={isExpanded}
          autoPlay={isExpanded}
          loop
          muted={!isExpanded}
          playsInline
          className={baseClasses}
        />
      );
    }

    if (sample.output_type === "audio") {
      return (
        <div className={`flex items-center justify-center bg-muted ${isExpanded ? 'p-8' : 'h-full'}`}>
          <audio
            src={sample.output_url}
            controls
            className="w-full max-w-md"
          />
        </div>
      );
    }

    return (
      <img
        src={sample.thumbnail_url || sample.output_url}
        alt={sample.title || sample.prompt.slice(0, 50)}
        className={baseClasses}
        loading="lazy"
      />
    );
  };

  return (
    <>
      <section id="samples" className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Sample Gallery</h2>
            <p className="text-muted-foreground">
              See what's possible with {modelName}. Click any sample to see the full prompt.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {samples.map((sample) => (
              <Card
                key={sample.id}
                className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                onClick={() => setSelectedSample(sample)}
              >
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {renderMedia(sample)}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Play className="w-4 h-4" />
                      View Details
                    </Button>
                  </div>

                  {/* Type badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 gap-1"
                  >
                    {getOutputTypeIcon(sample.output_type)}
                    {sample.output_type}
                  </Badge>

                  {sample.is_featured && (
                    <Badge 
                      className="absolute top-2 left-2 bg-amber-500 text-white"
                    >
                      Featured
                    </Badge>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  {sample.title && (
                    <h3 className="font-medium line-clamp-1">{sample.title}</h3>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {sample.prompt}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Detail Modal */}
      <Dialog open={!!selectedSample} onOpenChange={() => setSelectedSample(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSample && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedSample.title || modelName + " Sample"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Media */}
                <div className="rounded-lg overflow-hidden bg-muted">
                  {renderMedia(selectedSample, true)}
                </div>

                {/* Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Prompt Used</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyPrompt(selectedSample)}
                      className="gap-2"
                    >
                      {copiedId === selectedSample.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Prompt
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-sm">
                    {selectedSample.prompt}
                  </div>
                </div>

                {/* Negative prompt if exists */}
                {selectedSample.negative_prompt && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-red-500">Negative Prompt</h4>
                    <div className="p-4 rounded-lg bg-red-500/10 text-sm">
                      {selectedSample.negative_prompt}
                    </div>
                  </div>
                )}

                {/* Parameters */}
                {Object.keys(selectedSample.parameters).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Parameters</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedSample.parameters).map(([key, value]) => (
                        <Badge key={key} variant="outline">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <Button 
                  onClick={() => {
                    onTryPrompt(selectedSample.prompt);
                    setSelectedSample(null);
                  }}
                  className="w-full gap-2"
                  size="lg"
                >
                  Try This Prompt
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
