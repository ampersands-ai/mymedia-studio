import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Keyboard } from "lucide-react";
import { formatShortcut, getModifierKey } from "@/hooks/useKeyboardShortcuts";
import type { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsDialogProps {
  shortcuts: KeyboardShortcut[];
  children?: React.ReactNode;
}

export function KeyboardShortcutsDialog({
  shortcuts: _shortcuts,
  children,
}: KeyboardShortcutsDialogProps) {
  // Group shortcuts by category
  const categories = {
    "Execution Control": [
      { key: " ", description: "Play / Pause execution" },
      { key: "ArrowRight", description: "Step forward" },
      { key: "n", description: "Step forward (alternative)" },
      { key: "Escape", description: "Stop execution" },
      { key: "r", description: "Restart execution" },
    ],
    "Navigation": [
      { key: "Tab", description: "Next tab" },
      { key: "Tab", shift: true, description: "Previous tab" },
    ],
    "Actions": [
      { key: "e", description: "Export execution trace" },
      { key: "b", description: "Bookmark current run" },
      { key: "h", description: "Toggle history browser" },
      { key: "c", description: "Compare selected runs" },
    ],
    "Search & Filter": [
      {
        key: "k",
        ctrl: !isMac(),
        meta: isMac(),
        description: "Focus search input",
      },
      {
        key: "f",
        ctrl: !isMac(),
        meta: isMac(),
        description: "Toggle filters",
      },
    ],
    "View": [
      { key: "1", description: "Execution Flow tab" },
      { key: "2", description: "Live Logs tab" },
      { key: "3", description: "Source Code tab" },
      { key: "4", description: "Performance tab" },
      { key: "0", description: "Toggle fullscreen" },
    ],
    "Help": [
      { key: "?", description: "Show keyboard shortcuts" },
    ],
  };

  function isMac(): boolean {
    return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {Object.entries(categories).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3">{category}</h3>
              <Card className="p-3">
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">
                          {shortcut.description}
                        </span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                          {formatShortcut(shortcut as KeyboardShortcut)}
                        </kbd>
                      </div>
                      {index < categoryShortcuts.length - 1 && (
                        <Separator className="my-1" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
          <p className="font-semibold mb-1">💡 Pro Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Shortcuts won't work when typing in input fields</li>
            <li>Use Space to quickly toggle play/pause during execution</li>
            <li>Press ? to show this dialog anytime</li>
            <li>Use {getModifierKey()} + K to quickly jump to search</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
