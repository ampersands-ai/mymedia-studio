import { useState } from 'react';
import { ShaderParams } from '@/types/procedural-background';
import { parsePromptToParams, getPromptSuggestions } from '@/utils/promptParser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptInputProps {
  onApply: (params: Partial<ShaderParams>) => void;
}

export function PromptInput({ onApply }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [parsedParams, setParsedParams] = useState<Partial<ShaderParams> | null>(null);
  const suggestions = getPromptSuggestions();

  const handleParse = () => {
    if (!prompt.trim()) return;
    const params = parsePromptToParams(prompt);
    setParsedParams(params);
  };

  const handleApply = () => {
    if (parsedParams && Object.keys(parsedParams).length > 0) {
      onApply(parsedParams);
      setParsedParams(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    const params = parsePromptToParams(suggestion);
    setParsedParams(params);
  };

  const clearPrompt = () => {
    setPrompt('');
    setParsedParams(null);
  };

  const paramLabels: Record<keyof ShaderParams, string> = {
    shape: 'Shape',
    arrangement: 'Arrangement',
    colorPrimary: 'Primary',
    colorSecondary: 'Secondary',
    metallic: 'Metallic',
    cameraSpeed: 'Speed',
    instanceCount: 'Density',
    backgroundColor: 'Background',
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">AI Prompt</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Describe your background in natural language
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setParsedParams(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleParse();
              }
            }}
            placeholder="e.g., gold cubes spiral metallic"
            className="bg-background pr-8"
          />
          {prompt && (
            <button
              onClick={clearPrompt}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleParse} variant="outline">
          Parse
        </Button>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 4).map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSuggestionClick(suggestion)}
            className={cn(
              'rounded-full border border-border bg-muted/50 px-3 py-1 text-xs transition-colors',
              'hover:border-primary/50 hover:bg-primary/10 hover:text-primary'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Parsed params display */}
      {parsedParams && Object.keys(parsedParams).length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(parsedParams).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1"
              >
                <span className="text-xs text-muted-foreground">
                  {paramLabels[key as keyof ShaderParams]}:
                </span>
                {key.toLowerCase().includes('color') ? (
                  <div className="flex items-center gap-1">
                    <div
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: value as string }}
                    />
                    <span className="font-mono text-xs text-foreground">{value}</span>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-foreground">
                    {typeof value === 'number' ? (value < 1 ? `${Math.round(value * 100)}%` : value) : value}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Button
            onClick={handleApply}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply Changes
          </Button>
        </div>
      )}
    </div>
  );
}
