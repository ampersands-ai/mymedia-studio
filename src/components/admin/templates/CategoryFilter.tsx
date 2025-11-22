import { Button } from "@/components/ui/button";
import { ALL_CATEGORIES } from "@/lib/admin/template-filtering";

interface CategoryFilterProps {
  categories: string[];
  categoryCounts: Record<string, number>;
  selectedCategories: string[];
  onToggle: (category: string) => void;
  totalCount: number;
}

/**
 * Horizontal scrolling category filter buttons
 */
export function CategoryFilter({
  categories,
  categoryCounts,
  selectedCategories,
  onToggle,
  totalCount,
}: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <Button
        variant={selectedCategories.includes(ALL_CATEGORIES) ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToggle(ALL_CATEGORIES)}
        className={selectedCategories.includes(ALL_CATEGORIES) ? 'border-2 border-black' : 'border-2'}
      >
        {ALL_CATEGORIES} ({totalCount})
      </Button>
      {categories.map(category => (
        <Button
          key={category}
          variant={selectedCategories.includes(category) ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToggle(category)}
          className={selectedCategories.includes(category) ? 'border-2 border-black' : 'border-2'}
        >
          {category} ({categoryCounts[category]})
        </Button>
      ))}
    </div>
  );
}
