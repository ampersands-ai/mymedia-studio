import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Upload } from 'lucide-react';
import { CaptionInstruction, CaptionStyle, CaptionPosition, CaptionWord } from './types';

interface CaptionPanelProps {
  caption: CaptionInstruction | undefined;
  sceneDuration: number;
  onUpdate: (updates: Partial<CaptionInstruction>) => void;
}

const STYLE_OPTIONS: { value: CaptionStyle; label: string }[] = [
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'wave', label: 'Wave' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'static', label: 'Static' },
];

const POSITION_OPTIONS: { value: CaptionPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
];

export const CaptionPanel: React.FC<CaptionPanelProps> = ({
  caption,
  sceneDuration,
  onUpdate,
  onImportTimestamps,
}) => {
  const [scriptText, setScriptText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const words = caption?.words || [];
  const isVisible = caption?.visible ?? false;

  const handleToggleVisible = (visible: boolean) => {
    onUpdate({ visible });
  };

  const handleAddWord = () => {
    const lastWord = words[words.length - 1];
    const start = lastWord ? lastWord.end + 0.1 : 0;
    const newWord: CaptionWord = {
      id: crypto.randomUUID(),
      word: 'new',
      start,
      end: Math.min(start + 0.5, sceneDuration),
    };
    onUpdate({ words: [...words, newWord] });
  };

  const handleUpdateWord = (wordId: string, updates: Partial<CaptionWord>) => {
    onUpdate({
      words: words.map(w => w.id === wordId ? { ...w, ...updates } : w),
    });
  };

  const handleDeleteWord = (wordId: string) => {
    onUpdate({ words: words.filter(w => w.id !== wordId) });
  };

  const handleAutoSpace = () => {
    if (words.length === 0) return;
    
    const wordDuration = sceneDuration / words.length;
    const spacedWords = words.map((word, i) => ({
      ...word,
      start: i * wordDuration,
      end: (i + 1) * wordDuration,
    }));
    onUpdate({ words: spacedWords });
  };

  const handleImportScript = () => {
    const wordList = scriptText.trim().split(/\s+/).filter(Boolean);
    if (wordList.length === 0) return;

    const wordDuration = sceneDuration / wordList.length;
    const newWords: CaptionWord[] = wordList.map((word, i) => ({
      id: crypto.randomUUID(),
      word,
      start: i * wordDuration,
      end: (i + 1) * wordDuration,
    }));
    
    onUpdate({ words: newWords, visible: true });
    setScriptText('');
    setShowImport(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Captions</Label>
          <Switch
            checked={isVisible}
            onCheckedChange={handleToggleVisible}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Style */}
          <div className="space-y-2">
            <Label>Style</Label>
            <Select
              value={caption?.style || 'karaoke'}
              onValueChange={(v) => onUpdate({ style: v as CaptionStyle })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Position</Label>
            <Select
              value={caption?.position || 'bottom'}
              onValueChange={(v) => onUpdate({ position: v as CaptionPosition })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Typography */}
          <div className="space-y-3">
            <Label>Typography</Label>
            
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Font Size: {caption?.fontSize || 32}px</span>
              <Slider
                value={[caption?.fontSize || 32]}
                min={16}
                max={72}
                step={2}
                onValueChange={([v]) => onUpdate({ fontSize: v })}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Font Family</span>
              <Select
                value={caption?.fontFamily || 'Inter'}
                onValueChange={(v) => onUpdate({ fontFamily: v })}
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
          </div>

          <Separator />

          {/* Colors */}
          <div className="space-y-3">
            <Label>Colors</Label>
            
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Text Color</span>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={caption?.color || '#ffffff'}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={caption?.color || '#ffffff'}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Highlight Color</span>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={caption?.highlightColor || '#FFD700'}
                  onChange={(e) => onUpdate({ highlightColor: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={caption?.highlightColor || '#FFD700'}
                  onChange={(e) => onUpdate({ highlightColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Words */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Words ({words.length})</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImport(!showImport)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </Button>
                <Button variant="ghost" size="icon" onClick={handleAddWord}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Import textarea */}
            {showImport && (
              <div className="space-y-2 p-2 bg-muted rounded">
                <Textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste your script here... Words will be auto-spaced across the scene duration."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImportScript}>
                    Import Words
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowImport(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {words.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleAutoSpace} className="w-full">
                Auto-Space Words
              </Button>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {words.map((word, index) => (
                <div key={word.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                  <Input
                    value={word.word}
                    onChange={(e) => handleUpdateWord(word.id, { word: e.target.value })}
                    className="flex-1 h-7 text-sm"
                  />
                  <Input
                    type="number"
                    value={word.start.toFixed(1)}
                    onChange={(e) => handleUpdateWord(word.id, { start: parseFloat(e.target.value) || 0 })}
                    className="w-16 h-7 text-xs"
                    step={0.1}
                    min={0}
                    max={sceneDuration}
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input
                    type="number"
                    value={word.end.toFixed(1)}
                    onChange={(e) => handleUpdateWord(word.id, { end: parseFloat(e.target.value) || 0 })}
                    className="w-16 h-7 text-xs"
                    step={0.1}
                    min={0}
                    max={sceneDuration}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleDeleteWord(word.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {words.length === 0 && !showImport && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No words yet. Click Import or Add to create captions.
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
