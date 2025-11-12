import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2, Sparkles, MessageSquare, Tag } from 'lucide-react';
import { applyTextOverlay, defaultTextLayer, watermarkTemplates, presetTemplates, type TextLayer } from '@/utils/text-overlay';
import { logger } from '@/lib/logger';

interface TextOverlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onOverlayComplete: (overlayBlob: Blob, overlayUrl: string) => void;
}

const positionPresets = [
  { label: 'Top Left', x: 0.15, y: 0.1 },
  { label: 'Top Center', x: 0.5, y: 0.1 },
  { label: 'Top Right', x: 0.85, y: 0.1 },
  { label: 'Center Left', x: 0.15, y: 0.5 },
  { label: 'Center', x: 0.5, y: 0.5 },
  { label: 'Center Right', x: 0.85, y: 0.5 },
  { label: 'Bottom Left', x: 0.15, y: 0.9 },
  { label: 'Bottom Center', x: 0.5, y: 0.9 },
  { label: 'Bottom Right', x: 0.85, y: 0.9 },
];

export function TextOverlayModal({
  open,
  onOpenChange,
  imageUrl,
  onOverlayComplete,
}: TextOverlayModalProps) {
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);

  const selectedLayer = textLayers.find(layer => layer.id === selectedLayerId);

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      ...defaultTextLayer,
      id: `layer-${Date.now()}`,
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const addWatermark = (templateIndex: number) => {
    const template = watermarkTemplates[templateIndex];
    const newLayer: TextLayer = {
      ...template,
      id: `watermark-${Date.now()}`,
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const addPresetTemplate = (template: Omit<TextLayer, 'id'>) => {
    const newLayer: TextLayer = {
      ...template,
      id: `preset-${Date.now()}`,
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const removeLayer = (id: string) => {
    setTextLayers(textLayers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers(textLayers.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const handleApplyOverlay = async () => {
    if (textLayers.length === 0) return;

    try {
      setIsApplying(true);
      const { blob, url } = await applyTextOverlay(imageUrl, textLayers);
      onOverlayComplete(blob, url);
      onOpenChange(false);
    } catch (error) {
      logger.error('Text overlay application failed', error as Error, {
        component: 'TextOverlayModal',
        layerCount: textLayers.length,
        imageUrl: imageUrl.substring(0, 50),
        operation: 'handleApplyOverlay'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const getPreviewStyle = (layer: TextLayer) => {
    const shadows = [];
    if (layer.strokeWidth > 0) {
      shadows.push(`0 0 ${layer.strokeWidth}px ${layer.strokeColor}`);
    }
    if (layer.shadowBlur > 0) {
      shadows.push(`${layer.shadowOffsetX / 4}px ${layer.shadowOffsetY / 4}px ${layer.shadowBlur / 4}px ${layer.shadowColor}`);
    }
    
    return {
      position: 'absolute' as const,
      left: `${layer.x * 100}%`,
      top: `${layer.y * 100}%`,
      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
      fontSize: `${layer.fontSize / 4}px`,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight,
      fontStyle: layer.fontStyle,
      color: layer.color,
      opacity: layer.opacity,
      textShadow: shadows.length > 0 ? shadows.join(', ') : 'none',
      backgroundColor: layer.backgroundColor || 'transparent',
      padding: layer.backgroundColor ? `${layer.padding / 2}px` : '0',
      cursor: draggingLayerId === layer.id ? 'grabbing' : 'grab',
      whiteSpace: 'nowrap' as const,
      userSelect: 'none' as const,
    };
  };

  const handleTextMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setDraggingLayerId(layerId);
    setSelectedLayerId(layerId);
  };

  const handleTextMouseMove = (e: React.MouseEvent) => {
    if (!draggingLayerId) return;
    
    const previewElement = e.currentTarget as HTMLElement;
    const rect = previewElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    updateLayer(draggingLayerId, { 
      x: Math.max(0.05, Math.min(0.95, x)), 
      y: Math.max(0.05, Math.min(0.95, y)) 
    });
  };

  const handleTextMouseUp = () => {
    setDraggingLayerId(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleApplyOverlay();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, textLayers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add Text & Watermark</DialogTitle>
        </DialogHeader>

        {/* Preview - Fixed height */}
        <div 
          className="relative bg-muted/30 rounded-lg p-4 flex items-center justify-center min-h-[250px] max-h-[350px] flex-shrink-0"
          onMouseMove={handleTextMouseMove}
          onMouseUp={handleTextMouseUp}
          onMouseLeave={handleTextMouseUp}
        >
          <img
            src={imageUrl}
            alt="Text overlay preview"
            className="max-w-full max-h-[300px] object-contain rounded"
          />
          {textLayers.map(layer => (
            <div
              key={layer.id}
              style={getPreviewStyle(layer)}
              onMouseDown={(e) => handleTextMouseDown(e, layer.id)}
              onClick={() => setSelectedLayerId(layer.id)}
              className={selectedLayerId === layer.id ? 'ring-2 ring-primary rounded' : ''}
            >
              {layer.text}
            </div>
          ))}
        </div>

        {/* Controls - Scrollable */}
        <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 py-4">
          {/* Quick Add and Presets */}
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="quick">Quick Add</TabsTrigger>
              <TabsTrigger value="motivational">
                <Sparkles className="h-4 w-4 mr-1" />
                Motivational
              </TabsTrigger>
              <TabsTrigger value="social">
                <MessageSquare className="h-4 w-4 mr-1" />
                Social
              </TabsTrigger>
              <TabsTrigger value="promo">
                <Tag className="h-4 w-4 mr-1" />
                Promo
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="quick" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTextLayer}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Text
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addWatermark(0)}
                >
                  @username
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addWatermark(1)}
                >
                  © Copyright
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addWatermark(2)}
                >
                  Made with AI
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="motivational" className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {presetTemplates.motivational.map((template, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPresetTemplate(template)}
                    className="justify-start"
                  >
                    {template.text}
                  </Button>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="social" className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {presetTemplates.social.map((template, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPresetTemplate(template)}
                    className="justify-start"
                  >
                    {template.text}
                  </Button>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="promo" className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {presetTemplates.promotional.map((template, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPresetTemplate(template)}
                    className="justify-start"
                  >
                    {template.text}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Layer List */}
          {textLayers.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2">
              <label className="text-sm font-medium">Text Layers</label>
              <div className="space-y-2">
                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                      selectedLayerId === layer.id ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <span className="text-sm truncate">{layer.text}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layer Editor */}
          {selectedLayer && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium">Edit Selected Layer</h3>

              {/* Text Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Text</label>
                <Input
                  value={selectedLayer.text}
                  onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                  placeholder="Enter text"
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Font Family</label>
                <Select
                  value={selectedLayer.fontFamily}
                  onValueChange={(value) => updateLayer(selectedLayer.id, { fontFamily: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                    <SelectItem value="Impact">Impact</SelectItem>
                    <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                    <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                    <SelectItem value="Palatino">Palatino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Font Size</label>
                  <span className="text-sm text-muted-foreground">{selectedLayer.fontSize}px</span>
                </div>
                <Slider
                  value={[selectedLayer.fontSize]}
                  onValueChange={([value]) => updateLayer(selectedLayer.id, { fontSize: value })}
                  min={12}
                  max={120}
                  step={1}
                />
              </div>

              {/* Color */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <Input
                    type="color"
                    value={selectedLayer.color}
                    onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Opacity: {Math.round(selectedLayer.opacity * 100)}%</label>
                  <Slider
                    value={[selectedLayer.opacity * 100]}
                    onValueChange={([value]) => updateLayer(selectedLayer.id, { opacity: value / 100 })}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              {/* Position Preset */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Position</label>
                <Select
                  value={`${selectedLayer.x},${selectedLayer.y}`}
                  onValueChange={(value) => {
                    const [x, y] = value.split(',').map(Number);
                    updateLayer(selectedLayer.id, { x, y });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionPresets.map(preset => (
                      <SelectItem key={preset.label} value={`${preset.x},${preset.y}`}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font Weight & Style */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Weight</label>
                  <Select
                    value={selectedLayer.fontWeight}
                    onValueChange={(value) => updateLayer(selectedLayer.id, { fontWeight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Style</label>
                  <Select
                    value={selectedLayer.fontStyle}
                    onValueChange={(value) => updateLayer(selectedLayer.id, { fontStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="italic">Italic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stroke */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stroke Width: {selectedLayer.strokeWidth}px</label>
                  <Slider
                    value={[selectedLayer.strokeWidth]}
                    onValueChange={([value]) => updateLayer(selectedLayer.id, { strokeWidth: value })}
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stroke Color</label>
                  <Input
                    type="color"
                    value={selectedLayer.strokeColor}
                    onChange={(e) => updateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                  />
                </div>
              </div>

              {/* Background */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Background Color (optional)</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedLayer.backgroundColor || '#000000'}
                    onChange={(e) => updateLayer(selectedLayer.id, { backgroundColor: e.target.value })}
                    disabled={!selectedLayer.backgroundColor}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateLayer(selectedLayer.id, { 
                      backgroundColor: selectedLayer.backgroundColor ? null : '#000000' 
                    })}
                  >
                    {selectedLayer.backgroundColor ? 'Remove' : 'Add'}
                  </Button>
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Rotation</label>
                  <span className="text-sm text-muted-foreground">{selectedLayer.rotation}°</span>
                </div>
                <Slider
                  value={[selectedLayer.rotation]}
                  onValueChange={([value]) => updateLayer(selectedLayer.id, { rotation: value })}
                  min={-180}
                  max={180}
                  step={1}
                />
              </div>

              {/* Shadow Effects */}
              <div className="space-y-3 border rounded-lg p-3">
                <label className="text-sm font-medium">Shadow Effects</label>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-muted-foreground">Blur Intensity</label>
                    <span className="text-sm text-muted-foreground">{selectedLayer.shadowBlur}px</span>
                  </div>
                  <Slider
                    value={[selectedLayer.shadowBlur]}
                    onValueChange={([value]) => updateLayer(selectedLayer.id, { shadowBlur: value })}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>

                {selectedLayer.shadowBlur > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Shadow Color</label>
                        <Input
                          type="color"
                          value={selectedLayer.shadowColor}
                          onChange={(e) => updateLayer(selectedLayer.id, { shadowColor: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">X Offset: {selectedLayer.shadowOffsetX}px</label>
                        <Slider
                          value={[selectedLayer.shadowOffsetX]}
                          onValueChange={([value]) => updateLayer(selectedLayer.id, { shadowOffsetX: value })}
                          min={-20}
                          max={20}
                          step={1}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Y Offset: {selectedLayer.shadowOffsetY}px</label>
                      <Slider
                        value={[selectedLayer.shadowOffsetY]}
                        onValueChange={([value]) => updateLayer(selectedLayer.id, { shadowOffsetY: value })}
                        min={-20}
                        max={20}
                        step={1}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        </ScrollArea>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={handleApplyOverlay} disabled={isApplying || textLayers.length === 0}>
            {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Text
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
