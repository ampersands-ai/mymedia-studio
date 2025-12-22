import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Copy, RotateCcw } from 'lucide-react';
import { ElementInstruction, ShapeType } from './types';
import { ENTER_OPTIONS, EMPHASIS_OPTIONS, EXIT_OPTIONS } from '../primitives';

interface PropertyPanelProps {
  element: ElementInstruction | null;
  sceneDuration: number;
  onUpdate: (updates: Partial<ElementInstruction>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const SHAPE_OPTIONS: { value: ShapeType; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'star', label: 'Star' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'line', label: 'Line' },
];

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Oswald',
  'Playfair Display',
];

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  element,
  sceneDuration,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an element to edit its properties
      </div>
    );
  }

  const updateStyle = (styleUpdates: Partial<ElementInstruction['style']>) => {
    onUpdate({ style: { ...element.style, ...styleUpdates } });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold capitalize">{element.type}</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <div className="space-y-2">
          <Label>Content</Label>
          {element.type === 'emoji' ? (
            <Input
              value={element.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Enter emoji..."
              className="text-2xl text-center"
            />
          ) : element.type === 'image' ? (
            <Input
              value={element.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Image URL..."
            />
          ) : (
            <Input
              value={element.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Enter text..."
            />
          )}
        </div>

        {/* Shape type selector */}
        {element.type === 'shape' && (
          <div className="space-y-2">
            <Label>Shape Type</Label>
            <Select
              value={element.style.shapeType || 'circle'}
              onValueChange={(v) => updateStyle({ shapeType: v as ShapeType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHAPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        {/* Position */}
        <div className="space-y-3">
          <Label>Position</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">X: {Math.round(element.x)}%</span>
              <Slider
                value={[element.x]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => onUpdate({ x: v })}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Y: {Math.round(element.y)}%</span>
              <Slider
                value={[element.y]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => onUpdate({ y: v })}
              />
            </div>
          </div>
        </div>

        {/* Transform */}
        <div className="space-y-3">
          <Label>Transform</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Rotation</span>
              <span className="text-xs font-mono">{element.rotation || 0}°</span>
            </div>
            <Slider
              value={[element.rotation || 0]}
              min={-180}
              max={180}
              step={1}
              onValueChange={([v]) => onUpdate({ rotation: v })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Scale</span>
              <span className="text-xs font-mono">{((element.scale || 1) * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[(element.scale || 1) * 100]}
              min={25}
              max={300}
              step={5}
              onValueChange={([v]) => onUpdate({ scale: v / 100 })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Opacity</span>
              <span className="text-xs font-mono">{((element.opacity ?? 1) * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[(element.opacity ?? 1) * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => onUpdate({ opacity: v / 100 })}
            />
          </div>
        </div>

        <Separator />

        {/* Timing */}
        <div className="space-y-3">
          <Label>Timing</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Enter At</span>
              <span className="text-xs font-mono">{element.enterAt.toFixed(1)}s</span>
            </div>
            <Slider
              value={[element.enterAt]}
              min={0}
              max={sceneDuration}
              step={0.1}
              onValueChange={([v]) => onUpdate({ enterAt: Math.min(v, element.exitAt - 0.5) })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Exit At</span>
              <span className="text-xs font-mono">{element.exitAt.toFixed(1)}s</span>
            </div>
            <Slider
              value={[element.exitAt]}
              min={0}
              max={sceneDuration}
              step={0.1}
              onValueChange={([v]) => onUpdate({ exitAt: Math.max(v, element.enterAt + 0.5) })}
            />
          </div>
        </div>

        <Separator />

        {/* Animations */}
        <div className="space-y-3">
          <Label>Animations</Label>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Enter</span>
            <Select
              value={element.enterAnimation}
              onValueChange={(v) => onUpdate({ enterAnimation: v as ElementInstruction['enterAnimation'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Emphasis</span>
            <Select
              value={element.emphasisAnimation}
              onValueChange={(v) => onUpdate({ emphasisAnimation: v as ElementInstruction['emphasisAnimation'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPHASIS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Exit</span>
            <Select
              value={element.exitAnimation}
              onValueChange={(v) => onUpdate({ exitAnimation: v as ElementInstruction['exitAnimation'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Style */}
        {(element.type === 'text' || element.type === 'counter') && (
          <div className="space-y-3">
            <Label>Style</Label>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Font Size</span>
              <Slider
                value={[element.style.fontSize || 24]}
                min={12}
                max={120}
                step={2}
                onValueChange={([v]) => updateStyle({ fontSize: v })}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Font Family</span>
              <Select
                value={element.style.fontFamily || 'Inter'}
                onValueChange={(v) => updateStyle({ fontFamily: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(font => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Text Color</span>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={element.style.color || '#ffffff'}
                  onChange={(e) => updateStyle({ color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={element.style.color || '#ffffff'}
                  onChange={(e) => updateStyle({ color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Background Color</span>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={element.style.backgroundColor || '#000000'}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={element.style.backgroundColor || ''}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value || undefined })}
                  placeholder="None"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Shape colors */}
        {element.type === 'shape' && (
          <div className="space-y-3">
            <Label>Colors</Label>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Fill Color</span>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={element.style.fillColor || element.style.color || '#ffffff'}
                  onChange={(e) => updateStyle({ fillColor: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={element.style.fillColor || element.style.color || '#ffffff'}
                  onChange={(e) => updateStyle({ fillColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Stroke Color</span>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={element.style.strokeColor || '#000000'}
                  onChange={(e) => updateStyle({ strokeColor: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={element.style.strokeColor || ''}
                  onChange={(e) => updateStyle({ strokeColor: e.target.value || undefined })}
                  placeholder="None"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Stroke Width</span>
              <Slider
                value={[element.style.strokeWidth || 0]}
                min={0}
                max={10}
                step={1}
                onValueChange={([v]) => updateStyle({ strokeWidth: v })}
              />
            </div>
          </div>
        )}

        {/* Emoji size */}
        {element.type === 'emoji' && (
          <div className="space-y-3">
            <Label>Size</Label>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Font Size: {element.style.fontSize || 48}px</span>
              <Slider
                value={[element.style.fontSize || 48]}
                min={24}
                max={200}
                step={4}
                onValueChange={([v]) => updateStyle({ fontSize: v })}
              />
            </div>
          </div>
        )}

        {/* Reset button */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            onUpdate({
              x: 50,
              y: 50,
              rotation: 0,
              scale: 1,
              opacity: 1,
            });
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset Transform
        </Button>
      </div>
    </ScrollArea>
  );
};
