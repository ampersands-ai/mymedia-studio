# /components

Reusable React components organized by feature domain.

## Purpose

This directory contains all React components used throughout the application. Components are organized into subdirectories by feature area to maintain clear separation of concerns and make navigation intuitive.

## Directory Structure

### `ui/`
Shadcn/Radix-based primitive UI components (buttons, inputs, dialogs, etc.). These are the building blocks used by all other components.

### `auth/`
Authentication-related components:
- `TurnstileWidget` - Cloudflare Turnstile CAPTCHA
- Login/signup form components

### `admin/`
Admin dashboard components:
- `SchemaBuilder` - JSON schema editor for model parameters
- `WorkflowBuilder` - Visual workflow step editor
- `model-tester/` - Model testing utilities
- `templates/` - Template management
- `webhook/` - Webhook configuration

### `generation/`
Content generation UI:
- `GenerationPreview` - Display generated content
- `AspectRatioSelector` - Aspect ratio picker
- `ModelParameterForm` - Dynamic parameter inputs
- `ShareModal` - Social sharing
- `OutputGrid` - Gallery grid display

### `storyboard/`
AI video storyboard creation:
- Scene editors
- Timeline components
- Voice/music selectors

### `video/`
Video-specific components:
- Video players
- Video preview

### `blog/`
Blog/content components for SEO landing pages

### `homepage/`
Landing page sections

### `settings/`
User settings panels

### `error/`
Error handling UI:
- `ErrorBoundary` - React error boundaries
- Error display components

### Root Components
- `Footer.tsx` - Site footer
- `GlobalHeader.tsx` - Navigation header
- `Analytics.tsx` - Analytics integration
- `SessionWarning.tsx` - Session timeout warnings

## Component Patterns

### Standard Component Structure
```tsx
import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  variant?: 'default' | 'accent';
  className?: string;
  children?: React.ReactNode;
}

export function MyComponent({ 
  title, 
  variant = 'default',
  className,
  children 
}: MyComponentProps) {
  return (
    <div className={cn(
      "base-styles",
      variant === 'accent' && "accent-styles",
      className
    )}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
```

### Using Design System Tokens
```tsx
// ✅ CORRECT - Use semantic tokens
<div className="bg-background text-foreground border-border">
<Button className="bg-primary text-primary-foreground">

// ❌ WRONG - Direct colors
<div className="bg-white text-black border-gray-200">
<Button className="bg-purple-600 text-white">
```

### Form Components
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { someSchema } from '@/lib/validation-schemas';

function MyForm() {
  const form = useForm({
    resolver: zodResolver(someSchema),
    defaultValues: { /* ... */ }
  });
  
  return (
    <Form {...form}>
      <FormField name="fieldName" control={form.control} render={...} />
    </Form>
  );
}
```

## Testing

Component tests use React Testing Library and are located in `__tests__` subdirectories:
```
components/
  auth/
    __tests__/
      TurnstileWidget.test.tsx
```

Run component tests:
```bash
npm run test -- --grep "components"
```

## Best Practices

1. **Use TypeScript interfaces** - All props should be typed
2. **Support className prop** - Allow style customization
3. **Use design tokens** - Never hardcode colors
4. **Keep components small** - Extract subcomponents when needed
5. **Memoize when appropriate** - Use React.memo for expensive renders
6. **Handle loading/error states** - Show appropriate UI for all states
7. **Accessibility** - Include ARIA labels and semantic HTML
