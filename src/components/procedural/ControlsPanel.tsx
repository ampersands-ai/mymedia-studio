import { ShaderParams } from '@/types/procedural-background';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Box, Circle, Triangle, LayoutGrid, Loader2, Waves } from 'lucide-react';

interface ControlsPanelProps {
  params: ShaderParams;
  onChange: (params: Partial<ShaderParams>) => void;
}

export function ControlsPanel({ params, onChange }: ControlsPanelProps) {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5">
      <h3 className="text-lg font-semibold text-foreground">Parameters</h3>

      {/* Shape */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Shape</Label>
        <Select
          value={params.shape}
          onValueChange={(value) => onChange({ shape: value as ShaderParams['shape'] })}
        >
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cube">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                Cube
              </div>
            </SelectItem>
            <SelectItem value="sphere">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Sphere
              </div>
            </SelectItem>
            <SelectItem value="pyramid">
              <div className="flex items-center gap-2">
                <Triangle className="h-4 w-4" />
                Pyramid
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Arrangement */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Arrangement</Label>
        <Select
          value={params.arrangement}
          onValueChange={(value) => onChange({ arrangement: value as ShaderParams['arrangement'] })}
        >
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="radial">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Radial
              </div>
            </SelectItem>
            <SelectItem value="spiral">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4" />
                Spiral
              </div>
            </SelectItem>
            <SelectItem value="grid">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Grid
              </div>
            </SelectItem>
            <SelectItem value="wave">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4" />
                Wave
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Primary Color */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Primary Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={params.colorPrimary}
            onChange={(e) => onChange({ colorPrimary: e.target.value })}
            className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent"
          />
          <span className="font-mono text-sm text-muted-foreground">{params.colorPrimary}</span>
        </div>
      </div>

      {/* Secondary Color */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Secondary Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={params.colorSecondary}
            onChange={(e) => onChange({ colorSecondary: e.target.value })}
            className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent"
          />
          <span className="font-mono text-sm text-muted-foreground">{params.colorSecondary}</span>
        </div>
      </div>

      {/* Background Color */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Background Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={params.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent"
          />
          <span className="font-mono text-sm text-muted-foreground">{params.backgroundColor}</span>
        </div>
      </div>

      {/* Metallic */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">Metallic</Label>
          <span className="text-sm font-medium text-foreground">{Math.round(params.metallic * 100)}%</span>
        </div>
        <Slider
          value={[params.metallic * 100]}
          onValueChange={([value]) => onChange({ metallic: value / 100 })}
          min={0}
          max={100}
          step={1}
          className="cursor-pointer"
        />
      </div>

      {/* Camera Speed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">Camera Speed</Label>
          <span className="text-sm font-medium text-foreground">{params.cameraSpeed.toFixed(2)}</span>
        </div>
        <Slider
          value={[params.cameraSpeed * 100]}
          onValueChange={([value]) => onChange({ cameraSpeed: value / 100 })}
          min={10}
          max={100}
          step={5}
          className="cursor-pointer"
        />
      </div>

      {/* Instance Count */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">Density</Label>
          <span className="text-sm font-medium text-foreground">{params.instanceCount.toLocaleString()}</span>
        </div>
        <Slider
          value={[params.instanceCount]}
          onValueChange={([value]) => onChange({ instanceCount: value })}
          min={1000}
          max={8000}
          step={500}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
}
