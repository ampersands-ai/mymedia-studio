import { useState } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Maximize2, Minimize2, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeViewerProps {
  code: string;
  language?: string;
  title?: string;
  filePath?: string;
  highlightLines?: number[];
  className?: string;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
}

export function CodeViewer({
  code,
  language = "typescript",
  title,
  filePath,
  highlightLines = [],
  className,
  readOnly = true,
  onChange,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          {title && (
            <span className="text-sm font-semibold">{title}</span>
          )}
          {filePath && (
            <Badge variant="secondary" className="text-xs font-mono">
              {filePath}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {language}
          </Badge>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className={cn(
        "overflow-hidden",
        isExpanded ? "h-[600px]" : "h-[400px]"
      )}>
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={onChange}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: isExpanded },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            folding: true,
            renderLineHighlight: "line",
            guides: {
              indentation: true,
            },
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
            },
            padding: {
              top: 16,
              bottom: 16,
            },
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
          }}
          beforeMount={(monaco: typeof import('monaco-editor')) => {
            // Define custom theme
            // @ts-expect-error - Monaco editor types incomplete
            monaco.editor.defineTheme("custom-dark", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#0f172a",
                "editor.lineHighlightBackground": "#1e293b",
              },
            });
          }}
          onMount={(editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
            // Set custom theme
            // @ts-expect-error - Monaco editor types incomplete
            monaco.editor.setTheme("custom-dark");

            // Highlight specific lines if provided
            if (highlightLines.length > 0 && 'deltaDecorations' in editor && typeof editor.deltaDecorations === 'function') {
              try {
                editor.deltaDecorations(
                  [],
                  highlightLines.map((lineNumber) => ({
                    range: new (monaco as typeof import('monaco-editor')).editor.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                      isWholeLine: true,
                      className: "highlight-line",
                      glyphMarginClassName: "highlight-glyph",
                    },
                  }))
                );
              } catch {
                // Ignore decoration errors
              }
            }
          }}
        />
      </div>

      <style>{`
        .highlight-line {
          background: rgba(59, 130, 246, 0.1);
          border-left: 3px solid rgb(59, 130, 246);
        }
        .highlight-glyph {
          background: rgb(59, 130, 246);
          width: 5px !important;
          margin-left: 3px;
        }
      `}</style>
    </Card>
  );
}
