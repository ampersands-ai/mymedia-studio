import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading2,
  Heading3,
  Quote,
  Code
} from "lucide-react";
import DOMPurify from "dompurify";

interface BlogEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageInsert?: (position: number) => void;
}

export const BlogEditor = ({ content, onChange, onImageInsert }: BlogEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      // Sanitize content before setting innerHTML to prevent XSS
      const sanitized = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
      });
      editorRef.current.innerHTML = sanitized;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      // Sanitize output to ensure clean HTML
      const sanitized = DOMPurify.sanitize(editorRef.current.innerHTML, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
      });
      onChange(sanitized);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertHeading = (level: number) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const heading = document.createElement(`h${level}`);
      heading.textContent = selection.toString() || `Heading ${level}`;
      range.deleteContents();
      range.insertNode(heading);
      selection.removeAllRanges();
      onChange(editorRef.current?.innerHTML || '');
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImage = () => {
    if (onImageInsert && editorRef.current) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      const position = range?.startOffset || 0;
      onImageInsert(position);
    } else {
      const url = prompt('Enter image URL:');
      if (url) {
        execCommand('insertImage', url);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Editor</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Toolbar */}
        <div className="border rounded-t-md p-2 bg-muted/30 flex flex-wrap gap-1">
          {/* Text Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          {/* Headings */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertHeading(2)}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertHeading(3)}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          {/* Lists */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('insertUnorderedList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('insertOrderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          {/* Insert Elements */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertLink}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertImage}
            title="Insert Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('formatBlock', '<blockquote>')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('formatBlock', '<pre>')}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[500px] p-4 border border-t-0 rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary prose prose-sm max-w-none"
          style={{
            overflowY: 'auto'
          }}
        />

        {/* Helper Text */}
        <p className="text-sm text-muted-foreground mt-2">
          Use the toolbar to format your content. HTML tags are supported.
        </p>
      </CardContent>
    </Card>
  );
};
