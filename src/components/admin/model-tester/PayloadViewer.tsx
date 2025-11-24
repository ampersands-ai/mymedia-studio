import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PayloadViewerProps {
  data: unknown;
  title?: string;
  className?: string;
}

export function PayloadViewer({ data, title, className }: PayloadViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeColor = (value: unknown): string => {
    if (value === null) return 'text-gray-500';
    if (typeof value === 'string') return 'text-green-600';
    if (typeof value === 'number') return 'text-blue-600';
    if (typeof value === 'boolean') return 'text-purple-600';
    if (Array.isArray(value)) return 'text-orange-600';
    if (typeof value === 'object') return 'text-pink-600';
    return 'text-gray-600';
  };

  const renderValue = (value: unknown, indent: number = 0): JSX.Element => {
    const padding = indent * 16;

    if (value === null) {
      return <span className="text-gray-500">null</span>;
    }

    if (typeof value === 'string') {
      return (
        <span className="text-green-600">
          "{value.length > 100 ? value.substring(0, 100) + '...' : value}"
        </span>
      );
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return <span className={getTypeColor(value)}>{String(value)}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-500">[]</span>;
      }
      return (
        <div>
          <span className="text-gray-500">[</span>
          {value.map((item, index) => (
            <div key={index} style={{ paddingLeft: padding + 16 }}>
              {renderValue(item, indent + 1)}
              {index < value.length - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
          <div style={{ paddingLeft: padding }}>
            <span className="text-gray-500">]</span>
          </div>
        </div>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span className="text-gray-500">{'{}'}</span>;
      }
      return (
        <div>
          <span className="text-gray-500">{'{'}</span>
          {entries.map(([key, val], index) => (
            <div key={key} style={{ paddingLeft: padding + 16 }}>
              <span className="text-blue-700 font-medium">"{key}"</span>
              <span className="text-gray-500">: </span>
              {renderValue(val, indent + 1)}
              {index < entries.length - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
          <div style={{ paddingLeft: padding }}>
            <span className="text-gray-500">{'}'}</span>
          </div>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        {title && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {title}
            </span>
            <Badge variant="secondary" className="text-xs font-mono">
              JSON
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      <ScrollArea className={cn("rounded-lg border bg-slate-950 p-4", className)}>
        <div className="font-mono text-xs text-slate-50">
          {renderValue(data)}
        </div>
      </ScrollArea>
    </div>
  );
}
