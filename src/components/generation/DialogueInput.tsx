/**
 * DialogueInput Component
 * 
 * Custom renderer for ElevenLabs Dialogue V3 multi-voice dialogue generation.
 * Allows users to create multiple dialogue entries with text and voice selection.
 */


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare } from "lucide-react";

export interface DialogueEntry {
  text: string;
  voice: string;
}

interface DialogueInputProps {
  value: DialogueEntry[];
  onChange: (entries: DialogueEntry[]) => void;
  voices: string[];
  maxCharacters?: number;
  required?: boolean;
}

export const DialogueInput = ({ 
  value, 
  onChange, 
  voices,
  maxCharacters = 5000,
  required 
}: DialogueInputProps) => {
  // Initialize with one empty entry if empty
  const entries: DialogueEntry[] = value.length > 0 ? value : [
    { text: "", voice: voices[0] || "Liam" }
  ];

  // Calculate total character count
  const totalCharacters = entries.reduce((sum, entry) => sum + (entry.text?.length || 0), 0);

  const updateEntry = (index: number, field: keyof DialogueEntry, newValue: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: newValue };
    onChange(newEntries);
  };

  const addEntry = () => {
    const newEntries = [...entries, { text: "", voice: voices[0] || "Liam" }];
    onChange(newEntries);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  return (
    <div className="space-y-4">
      {/* Header with character counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">
            Dialogue
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
        <span className={`text-sm ${totalCharacters > maxCharacters * 0.9 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
          {totalCharacters} / {maxCharacters}
        </span>
      </div>

      {/* Dialogue Entries */}
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="p-4 space-y-4">
              {/* Entry Header */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">
                  Dialogue {index + 1}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEntry(index)}
                  disabled={entries.length <= 1}
                  className="h-8 px-3 text-xs"
                >
                  Remove
                </Button>
              </div>

              {/* Text Field */}
              <div className="space-y-2">
                <Label className="text-sm">
                  text <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={entry.text}
                  onChange={(e) => updateEntry(index, "text", e.target.value)}
                  placeholder="Enter dialogue text. Use emotion tags like [excitedly], [whispering], [curiously]..."
                  rows={3}
                  className="resize-y text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the text content for this dialogue segment.
                </p>
              </div>

              {/* Voice Field */}
              <div className="space-y-2">
                <Label className="text-sm">
                  voice <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={entry.voice}
                  onValueChange={(v) => updateEntry(index, "voice", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => (
                      <SelectItem key={voice} value={voice}>
                        {voice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the voice character for this dialogue.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Dialogue Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="w-full gap-2 border-dashed"
      >
        <Plus className="h-4 w-4" />
        Add dialogue
      </Button>
    </div>
  );
};
