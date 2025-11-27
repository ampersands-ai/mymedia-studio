/**
 * Module type declarations for packages without proper TypeScript support
 */

declare module 'dompurify' {
  import DOMPurify from 'dompurify';
  export default DOMPurify;
}

declare module '@monaco-editor/react' {
  import type { EditorProps } from '@monaco-editor/react';
  import type * as Monaco from 'monaco-editor';
  const Editor: React.ComponentType<EditorProps>;
  export default Editor;
  export type { Monaco };
}

declare module 'monaco-editor' {
  export namespace editor {
    interface IStandaloneCodeEditor {
      deltaDecorations(oldDecorations: string[], newDecorations: unknown[]): string[];
      // Monaco editor interface
    }
    namespace Range {
      function fromPositions(start: unknown, end?: unknown): Range;
    }
    class Range {
      constructor(startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number);
    }
  }
}

declare module 'canvas-confetti' {
  export interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  function confetti(options?: Options): Promise<null>;
  
  export default confetti;
}

