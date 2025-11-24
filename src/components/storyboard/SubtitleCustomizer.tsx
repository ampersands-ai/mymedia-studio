import { useState, useEffect } from "react";
import { Copy, RotateCcw, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { SubtitleSettings } from "@/types/subtitle";
import { DEFAULT_SUBTITLE_SETTINGS } from "@/types/subtitle";
import { SUBTITLE_PRESETS, FONT_FAMILIES, SUBTITLE_STYLES, LANGUAGES, SUBTITLES_MODELS } from "@/config/subtitlePresets";
import { SubtitlePreview } from "./SubtitlePreview";
import { PositionGridSelector } from "./PositionGridSelector";
import { cn } from "@/lib/utils";

interface SubtitleCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings?: Partial<SubtitleSettings>;
  onSave: (settings: SubtitleSettings) => void;
}

export function SubtitleCustomizer({ open, onOpenChange, initialSettings, onSave }: SubtitleCustomizerProps) {
  const [settings, setSettings] = useState<SubtitleSettings>({
    ...DEFAULT_SUBTITLE_SETTINGS,
    ...initialSettings,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(() => ({ ...DEFAULT_SUBTITLE_SETTINGS, ...initialSettings }));
    }
  }, [initialSettings]);

  const updateSetting = <K extends keyof SubtitleSettings>(key: K, value: SubtitleSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = SUBTITLE_PRESETS[presetKey];
    if (preset) {
      setSettings(prev => ({
        ...prev,
        ...preset.settings,
      }));
    }
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SUBTITLE_SETTINGS);
  };

  const copyJSON = () => {
    const json = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(json);
  };

  const copyFullTemplate = () => {
    const fullTemplate = {
      resolution: "vertical",
      quality: "high",
      draft: false,
      template: "mG1o3jStlfepwwOj8a2H",
      variables: {
        subtitlesModel: settings.subtitlesModel,
        subtitleStyle: settings.style,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        allCaps: settings.allCaps,
        boxColor: settings.boxColor,
        lineColor: settings.lineColor,
        wordColor: settings.wordColor,
        outlineColor: settings.outlineColor,
        outlineWidth: settings.outlineWidth,
        shadowOffset: settings.shadowOffset,
        position: settings.position,
        maxWordsPerLine: settings.maxWordsPerLine,
        x: settings.x,
        y: settings.y,
        keywords: settings.keywords,
        replace: settings.replace,
        fontUrl: settings.fontUrl,
        subtitleLanguage: settings.language
      }
    };
    
    navigator.clipboard.writeText(JSON.stringify(fullTemplate, null, 2));
  };

  const handleSave = () => {
    onSave(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            json2video Subtitle Customizer
          </DialogTitle>
          <DialogDescription>
            Customize all json2video subtitle parameters with live preview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset Cards */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Quick Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(SUBTITLE_PRESETS).map(([key, preset]) => (
                <Card
                  key={key}
                  className="cursor-pointer hover:border-primary transition-all p-3 space-y-2"
                  onClick={() => applyPreset(key)}
                >
                  <div className="text-xs font-semibold">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2">
                    {preset.description}
                  </div>
                  <div 
                    className="text-xs text-center py-2 rounded"
                    style={{
                      fontFamily: preset.settings.fontFamily,
                      fontSize: '14px',
                      color: preset.settings.lineColor,
                      backgroundColor: ['boxed-line', 'boxed-word'].includes(preset.settings.style || '') 
                        ? preset.settings.boxColor
                        : 'transparent',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    Sample
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Live Preview</Label>
            <div className="max-w-2xl mx-auto">
              <SubtitlePreview settings={settings} />
            </div>
          </div>

          {/* Collapsible Sections */}
          <Accordion type="multiple" defaultValue={["basic", "text"]} className="space-y-2">
            {/* Basic Settings */}
            <AccordionItem value="basic" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                ⚙️ Basic Settings
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Subtitle Style</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {SUBTITLE_STYLES.map(styleOption => (
                      <Card
                        key={styleOption.value}
                        className={cn(
                          "cursor-pointer p-3 transition-all",
                          settings.style === styleOption.value 
                            ? "border-primary bg-primary/10" 
                            : "hover:border-primary/50"
                        )}
                        onClick={() => updateSetting('style', styleOption.value)}
                      >
                        <div className="text-xs font-semibold">{styleOption.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {styleOption.description}
                        </div>
                        <div className="mt-2 p-2 bg-muted rounded text-[10px] text-center">
                          {styleOption.preview}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Transcription Model</Label>
                    <Select value={settings.subtitlesModel} onValueChange={(v) => updateSetting('subtitlesModel', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUBTITLES_MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Language</Label>
                    <Select value={settings.language} onValueChange={(v) => updateSetting('language', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Text Styling */}
            <AccordionItem value="text" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                📝 Text Styling
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Font Family</Label>
                  <Select value={settings.fontFamily} onValueChange={(v) => updateSetting('fontFamily', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map(font => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Font Size: {settings.fontSize}px</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([v]) => updateSetting('fontSize', v)}
                      min={40}
                      max={300}
                      step={5}
                    />
                    <p className="text-[10px] text-muted-foreground">Default: 40px (adjust as needed)</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Max Words Per Line: {settings.maxWordsPerLine}</Label>
                    <Slider
                      value={[settings.maxWordsPerLine]}
                      onValueChange={([v]) => updateSetting('maxWordsPerLine', v)}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <p className="text-[10px] text-muted-foreground">Set to 1 for one word at a time</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <Switch 
                      checked={settings.allCaps} 
                      onCheckedChange={(v) => updateSetting('allCaps', v)} 
                    />
                    MAKE ALL TEXT UPPERCASE
                  </Label>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Colors */}
            <AccordionItem value="colors" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                🎨 Colors
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Text Color (Non-speaking words)</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={settings.lineColor} onChange={(e) => updateSetting('lineColor', e.target.value)} className="w-16 h-9 p-1" />
                      <Input type="text" value={settings.lineColor} onChange={(e) => updateSetting('lineColor', e.target.value)} className="flex-1 h-9" />
                    </div>
                  </div>

                  {['classic', 'classic-progressive', 'classic-one-word'].includes(settings.style) && (
                    <div className="space-y-2">
                      <Label className="text-xs">Highlight Color (Speaking word)</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.wordColor} onChange={(e) => updateSetting('wordColor', e.target.value)} className="w-16 h-9 p-1" />
                        <Input type="text" value={settings.wordColor} onChange={(e) => updateSetting('wordColor', e.target.value)} className="flex-1 h-9" />
                      </div>
                    </div>
                  )}

                  {['boxed-line', 'boxed-word'].includes(settings.style) && (
                    <div className="space-y-2">
                      <Label className="text-xs">Background Box Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.boxColor} onChange={(e) => updateSetting('boxColor', e.target.value)} className="w-16 h-9 p-1" />
                        <Input type="text" value={settings.boxColor} onChange={(e) => updateSetting('boxColor', e.target.value)} className="flex-1 h-9" />
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Outline & Shadow */}
            <AccordionItem value="outline" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                ✏️ Outline & Shadow
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Outline Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={settings.outlineColor} onChange={(e) => updateSetting('outlineColor', e.target.value)} className="w-16 h-9 p-1" />
                      <Input type="text" value={settings.outlineColor} onChange={(e) => updateSetting('outlineColor', e.target.value)} className="flex-1 h-9" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Outline Width: {settings.outlineWidth}px</Label>
                    <Slider value={[settings.outlineWidth]} onValueChange={([v]) => updateSetting('outlineWidth', v)} min={0} max={20} step={1} />
                    <p className="text-[10px] text-muted-foreground">0 = No outline</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Shadow Offset: {settings.shadowOffset}px</Label>
                  <Slider value={[settings.shadowOffset]} onValueChange={([v]) => updateSetting('shadowOffset', v)} min={0} max={50} step={1} />
                  <p className="text-[10px] text-muted-foreground">Simple vertical shadow offset (json2video API)</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Positioning */}
            <AccordionItem value="position" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                📍 Positioning
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Position Mode</Label>
                  <Select 
                    value={settings.position === 'custom' ? 'custom' : settings.position}
                    onValueChange={(v) => {
                      if (v === 'custom') {
                        updateSetting('position', 'custom');
                      } else {
                        updateSetting('position', v);
                        updateSetting('x', 0);
                        updateSetting('y', 0);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-center">Top Center</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="mid-left-center">Middle Left</SelectItem>
                      <SelectItem value="mid-center">Middle Center</SelectItem>
                      <SelectItem value="mid-right-center">Middle Right</SelectItem>
                      <SelectItem value="mid-bottom-center">Mid Bottom</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-center">Bottom Center</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="custom">Custom (X, Y)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.position !== 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Position Grid</Label>
                    <PositionGridSelector value={settings.position} onChange={(v) => updateSetting('position', v)} />
                  </div>
                )}

                {settings.position === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">X Coordinate: {settings.x}px</Label>
                      <Input 
                        type="number" 
                        value={settings.x}
                        onChange={(e) => updateSetting('x', Number(e.target.value))}
                        min={-1000}
                        max={1000}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Y Coordinate: {settings.y}px</Label>
                      <Input 
                        type="number" 
                        value={settings.y}
                        onChange={(e) => updateSetting('y', Number(e.target.value))}
                        min={-1000}
                        max={1000}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Advanced Settings */}
            <AccordionItem value="advanced" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                🔧 Advanced Settings
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Keywords (for transcription accuracy)</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Add words to improve transcription accuracy. Type and press Enter.
                  </p>
                  <Input 
                    placeholder="Type word and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newKeyword = e.currentTarget.value.trim();
                        updateSetting('keywords', [...settings.keywords, newKeyword]);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="h-9"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {keyword}
                        <button 
                          onClick={() => {
                            const newKeywords = [...settings.keywords];
                            newKeywords.splice(idx, 1);
                            updateSetting('keywords', newKeywords);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Word Replacement</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Replace transcribed words with corrections
                  </p>
                  {Object.entries(settings.replace).map(([find, replace], idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        value={find} 
                        placeholder="Find"
                        onChange={(e) => {
                          const newReplace = { ...settings.replace };
                          delete newReplace[find];
                          newReplace[e.target.value] = replace;
                          updateSetting('replace', newReplace);
                        }}
                        className="flex-1 h-9"
                      />
                      <Input 
                        value={replace} 
                        placeholder="Replace"
                        onChange={(e) => {
                          updateSetting('replace', { 
                            ...settings.replace, 
                            [find]: e.target.value 
                          });
                        }}
                        className="flex-1 h-9"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          const newReplace = { ...settings.replace };
                          delete newReplace[find];
                          updateSetting('replace', newReplace);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      updateSetting('replace', { 
                        ...settings.replace, 
                        '': '' 
                      });
                    }}
                  >
                    + Add Replacement
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Custom Font URL (Optional)</Label>
                  <Input 
                    type="url"
                    value={settings.fontUrl}
                    onChange={(e) => updateSetting('fontUrl', e.target.value)}
                    placeholder="https://example.com/font.ttf"
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ⚠️ Font family must match the font name in the file
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={copyJSON}>
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
            <Button variant="outline" size="sm" onClick={copyFullTemplate}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Full Template
            </Button>
          </div>
          
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save & Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
