import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePromptTemplates, useSavedPrompts, type PromptCategory } from "@/hooks/usePromptTemplates";
import { PromptTemplateCard, PromptCategoryTabs } from "@/components/prompts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { pageTitle } from '@/config/brand';

const PromptLibrary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<PromptCategory>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"templates" | "saved">("templates");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: templates = [], isLoading: loadingTemplates } = usePromptTemplates(category, debouncedSearch);
  const { data: savedPrompts = [], isLoading: loadingSaved } = useSavedPrompts(user?.id, category);

  const handleUsePrompt = (prompt: string) => {
    // Navigate to create page with prompt in URL state
    navigate("/create", { state: { prompt } });
  };

  useEffect(() => {
    document.title = pageTitle('Prompt Library');
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
          <BookOpen className="h-9 w-9" />
          PROMPT LIBRARY
        </h1>
        <p className="text-lg text-foreground/80 font-medium">
          Browse curated prompts or save your own favorites
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts..."
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <PromptCategoryTabs value={category} onChange={setCategory} />
      </div>

      {/* Templates vs Saved Toggle */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "templates" | "saved")} className="mb-6">
        <TabsList>
          <TabsTrigger value="templates">Curated Templates</TabsTrigger>
          <TabsTrigger value="saved">My Saved ({savedPrompts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          {loadingTemplates ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No prompts found for this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map((template) => (
                <PromptTemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUsePrompt}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {!user ? (
            <div className="text-center py-12 text-muted-foreground">
              Sign in to save and view your prompts.
            </div>
          ) : loadingSaved ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : savedPrompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              You haven't saved any prompts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedPrompts.map((saved) => (
                <PromptTemplateCard
                  key={saved.id}
                  template={{
                    id: saved.id,
                    prompt: saved.prompt,
                    category: saved.category,
                    title: saved.title,
                    tags: saved.tags,
                    use_count: null,
                    model_type: null,
                    quality_score: null,
                    is_active: true,
                    created_at: saved.created_at,
                  }}
                  onUse={handleUsePrompt}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromptLibrary;
