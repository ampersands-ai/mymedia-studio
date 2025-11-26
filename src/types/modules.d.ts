/**
 * Module type declarations for packages without proper TypeScript support
 */

declare module 'dompurify' {
  import DOMPurify from 'dompurify';
  export default DOMPurify;
}

declare module '@monaco-editor/react' {
  import { EditorProps } from '@monaco-editor/react';
  const Editor: React.ComponentType<EditorProps>;
  export default Editor;
}

