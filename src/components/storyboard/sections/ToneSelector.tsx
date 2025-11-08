import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TONES = [
  { value: 'engaging', label: 'Engaging & Curious' },
  { value: 'educational', label: 'Educational & Informative' },
  { value: 'dramatic', label: 'Dramatic & Intense' },
  { value: 'humorous', label: 'Humorous & Playful' },
  { value: 'mysterious', label: 'Mysterious & Intriguing' },
];

interface ToneSelectorProps {
  tone: string;
  onToneChange: (tone: string) => void;
  disabled?: boolean;
}

export function ToneSelector({ tone, onToneChange, disabled }: ToneSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tone" className="text-sm font-medium">Tone & Style</Label>
      <Select value={tone} onValueChange={onToneChange} disabled={disabled}>
        <SelectTrigger id="tone">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TONES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
