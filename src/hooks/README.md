# /hooks

Custom React hooks for state management, data fetching, and side effects.

## Purpose

This directory contains reusable React hooks that encapsulate business logic, data fetching patterns, and common UI behaviors. Hooks are organized by domain to maintain separation of concerns.

## Categories

### Authentication & Authorization
- `useAuth` (via AuthContext) - User authentication state
- `useAdminRole` - Admin role detection and permissions
- `useErrorHandler` - Centralized error handling with toast notifications

### Data Fetching
- `useModels` - Fetch AI models from database
- `useAllModels` - Fetch all models including inactive
- `useTemplates` - Fetch workflow templates
- `useEnrichedTemplates` - Templates with model metadata
- `useUserCredits` - User token balance
- `useUserTokens` - Token usage history
- `useAzureVoices` - Voice options for TTS

### Generation & Workflows
- `useGeneration` - Core generation state and actions
- `useGenerationPolling` - Long-polling for generation status
- `useHybridGenerationPolling` - Realtime + polling fallback
- `useRealtimeGeneration` - Supabase realtime subscriptions
- `useWorkflowExecution` - Multi-step workflow execution
- `useCustomGeneration` - Custom model generation

### Media Handling
- `useImageUpload` - Image upload with validation
- `useAudioUpload` - Audio file upload
- `useDownload` - File download utilities
- `useImagePreloader` - Preload images for performance
- `useVideoPreload` - Video preloading

### Storyboard (subdirectory: `storyboard/`)
- `useStoryboardGeneration` - Storyboard creation flow
- `useStoryboardPolling` - Status polling for renders

### Admin (subdirectory: `admin/`)
- Admin-specific hooks for dashboard functionality

### UI & Utilities
- `useMobile` - Mobile device detection
- `useToast` - Toast notification system
- `useDebounce` - Debounced values
- `useInterval` - setInterval with cleanup
- `usePagination` - Pagination state management
- `useScrollY` - Scroll position tracking
- `useSEO` - Dynamic SEO metadata

## Usage Patterns

### Data Fetching with TanStack Query
```tsx
import { useModels } from '@/hooks/useModels';

function MyComponent() {
  const { data: models, isLoading, error } = useModels();
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;
  
  return <ModelList models={models} />;
}
```

### Error Handling
```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { execute } = useErrorHandler();
  
  const handleAction = async () => {
    await execute(
      async () => {
        // Your async operation
        await someApiCall();
      },
      {
        showSuccessToast: true,
        successMessage: 'Operation completed!',
        context: { component: 'MyComponent' }
      }
    );
  };
}
```

### Generation Flow
```tsx
import { useGeneration } from '@/hooks/useGeneration';

function GenerationPanel() {
  const { 
    generations, 
    startGeneration, 
    isGenerating,
    activeGenerations 
  } = useGeneration();
  
  const handleGenerate = async (prompt: string) => {
    await startGeneration({ 
      prompt, 
      model_id: 'selected-model' 
    });
  };
}
```

## Testing

Hook tests are located alongside the hook files with `.test.tsx` extension:
- `useGeneration.test.tsx`
- `useModels.test.tsx`
- `useWorkflowExecution.test.tsx`

Run tests:
```bash
npm run test -- --grep "use"
```

## Best Practices

1. **Keep hooks focused** - Each hook should do one thing well
2. **Use TypeScript** - All hooks should be fully typed
3. **Handle loading/error states** - Always return loading and error indicators
4. **Clean up effects** - Always clean up subscriptions and intervals
5. **Document dependencies** - List any external hooks or contexts required
