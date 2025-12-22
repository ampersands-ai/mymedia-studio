import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Copy, GripVertical } from 'lucide-react';
import { SceneInstruction, BackgroundType, BackgroundInstruction } from './types';
import { cn } from '@/lib/utils';

interface ScenePanelProps {
  scenes: SceneInstruction[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onUpdateScene: (sceneId: string, updates: Partial<SceneInstruction>) => void;
  onUpdateBackground: (updates: Partial<BackgroundInstruction>) => void;
}

const BACKGROUND_OPTIONS: { value: BackgroundType; label: string }[] = [
  { value: 'solid', label: 'Solid Color' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'particles', label: 'Particles' },
  { value: 'waves', label: 'Waves' },
  { value: 'grid', label: 'Grid' },
  { value: 'starfield', label: 'Starfield' },
  { value: 'image', label: 'Image' },
];

export const ScenePanel: React.FC<ScenePanelProps> = ({
  scenes,
  selectedSceneId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  onDuplicateScene,
  onUpdateScene,
  onUpdateBackground,
}) => {
  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  return (
    <div className="flex flex-col h-full">
      {/* Scene List */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold">Scenes</Label>
          <Button variant="ghost" size="icon" onClick={onAddScene}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-32">
          <div className="space-y-1">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                  selectedSceneId === scene.id
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-muted border border-transparent'
                )}
                onClick={() => onSelectScene(scene.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{scene.name}</span>
                <span className="text-xs text-muted-foreground">{scene.duration}s</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateScene(scene.id);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {scenes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(scene.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Scene Properties */}
      {selectedScene && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            <div className="space-y-2">
              <Label>Scene Name</Label>
              <Input
                value={selectedScene.name}
                onChange={(e) => onUpdateScene(selectedScene.id, { name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Duration</Label>
                <span className="text-xs font-mono">{selectedScene.duration}s</span>
              </div>
              <Slider
                value={[selectedScene.duration]}
                min={1}
                max={60}
                step={0.5}
                onValueChange={([v]) => onUpdateScene(selectedScene.id, { duration: v })}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Background</Label>
              
              <Select
                value={selectedScene.background.type}
                onValueChange={(v) => onUpdateBackground({ type: v as BackgroundType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUND_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Solid color */}
              {selectedScene.background.type === 'solid' && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Color</span>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={selectedScene.background.color1 || '#1a1a2e'}
                      onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      value={selectedScene.background.color1 || '#1a1a2e'}
                      onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {/* Gradient */}
              {selectedScene.background.type === 'gradient' && (
                <>
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Color 1</span>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedScene.background.color1 || '#1a1a2e'}
                        onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        value={selectedScene.background.color1 || '#1a1a2e'}
                        onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Color 2</span>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedScene.background.color2 || '#16213e'}
                        onChange={(e) => onUpdateBackground({ color2: e.target.value })}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        value={selectedScene.background.color2 || '#16213e'}
                        onChange={(e) => onUpdateBackground({ color2: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Angle</span>
                      <span className="text-xs font-mono">{selectedScene.background.gradientAngle || 135}°</span>
                    </div>
                    <Slider
                      value={[selectedScene.background.gradientAngle || 135]}
                      min={0}
                      max={360}
                      step={15}
                      onValueChange={([v]) => onUpdateBackground({ gradientAngle: v })}
                    />
                  </div>
                </>
              )}

              {/* Image */}
              {selectedScene.background.type === 'image' && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Image URL</span>
                  <Input
                    value={selectedScene.background.imageUrl || ''}
                    onChange={(e) => onUpdateBackground({ imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}

              {/* Particles/Waves color */}
              {(selectedScene.background.type === 'particles' || selectedScene.background.type === 'waves') && (
                <>
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Primary Color</span>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedScene.background.color1 || '#ffffff'}
                        onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        value={selectedScene.background.color1 || '#ffffff'}
                        onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  {selectedScene.background.type === 'waves' && (
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Secondary Color</span>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedScene.background.color2 || '#16213e'}
                          onChange={(e) => onUpdateBackground({ color2: e.target.value })}
                          className="w-12 h-8 p-1"
                        />
                        <Input
                          value={selectedScene.background.color2 || '#16213e'}
                          onChange={(e) => onUpdateBackground({ color2: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Particles count */}
              {selectedScene.background.type === 'particles' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Particle Count</span>
                    <span className="text-xs font-mono">{selectedScene.background.particleCount || 50}</span>
                  </div>
                  <Slider
                    value={[selectedScene.background.particleCount || 50]}
                    min={10}
                    max={200}
                    step={10}
                    onValueChange={([v]) => onUpdateBackground({ particleCount: v })}
                  />
                </div>
              )}

              {/* Grid color */}
              {selectedScene.background.type === 'grid' && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Grid Color</span>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={selectedScene.background.color1 || '#ffffff'}
                      onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      value={selectedScene.background.color1 || '#ffffff'}
                      onChange={(e) => onUpdateBackground({ color1: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Elements list */}
            <Separator />

            <div className="space-y-2">
              <Label>Elements ({selectedScene.elements.length})</Label>
              <div className="space-y-1">
                {selectedScene.elements.map((el) => (
                  <div
                    key={el.id}
                    className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                  >
                    <span className="capitalize">{el.type}</span>
                    <span className="text-muted-foreground truncate flex-1">
                      {el.content.slice(0, 20)}{el.content.length > 20 ? '...' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {el.enterAt}s - {el.exitAt}s
                    </span>
                  </div>
                ))}
                {selectedScene.elements.length === 0 && (
                  <p className="text-xs text-muted-foreground">No elements yet. Add one from the toolbar.</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
