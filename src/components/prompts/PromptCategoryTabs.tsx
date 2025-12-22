import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PromptCategory } from "@/hooks/usePromptTemplates";
import { Image, Video, Music, Edit, Sparkles } from "lucide-react";

interface PromptCategoryTabsProps {
  value: PromptCategory;
  onChange: (category: PromptCategory) => void;
}

const categories: { value: PromptCategory; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <Sparkles className="h-4 w-4" /> },
  { value: "text_to_image", label: "Images", icon: <Image className="h-4 w-4" /> },
  { value: "text_to_video", label: "Text→Video", icon: <Video className="h-4 w-4" /> },
  { value: "image_to_video", label: "Image→Video", icon: <Video className="h-4 w-4" /> },
  { value: "text_to_audio", label: "Audio", icon: <Music className="h-4 w-4" /> },
  { value: "image_editing", label: "Editing", icon: <Edit className="h-4 w-4" /> },
];

export const PromptCategoryTabs = ({ value, onChange }: PromptCategoryTabsProps) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as PromptCategory)}>
      <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
        {categories.map((cat) => (
          <TabsTrigger
            key={cat.value}
            value={cat.value}
            className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {cat.icon}
            <span className="hidden sm:inline">{cat.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
