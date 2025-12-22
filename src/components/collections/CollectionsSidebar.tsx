import { useState } from "react";
import { Folder, Heart, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useCollections } from "@/hooks/useCollections";
import { CreateCollectionDialog } from "./CreateCollectionDialog";
import { cn } from "@/lib/utils";

interface CollectionsSidebarProps {
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  className?: string;
}

const getIconComponent = (_icon: string | null, isDefault: boolean | null) => {
  if (isDefault) return Heart;
  return Folder;
};

export const CollectionsSidebar = ({
  selectedCollectionId,
  onSelectCollection,
  className,
}: CollectionsSidebarProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: collections = [], isLoading } = useCollections(user?.id);

  if (!user) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-3 py-2 h-auto"
          >
            <span className="font-bold text-sm">Collections</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-1 pt-1">
          {/* All Items option */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectCollection(null)}
            className={cn(
              "w-full justify-start gap-2 px-3",
              selectedCollectionId === null && "bg-primary/10 text-primary"
            )}
          >
            <Folder className="h-4 w-4" />
            <span>All Creations</span>
          </Button>

          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            collections.map((collection) => {
              const IconComponent = getIconComponent(collection.icon, collection.is_default);
              const isSelected = selectedCollectionId === collection.id;

              return (
                <Button
                  key={collection.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectCollection(collection.id)}
                  className={cn(
                    "w-full justify-between gap-2 px-3",
                    isSelected && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconComponent
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: collection.color || undefined }}
                    />
                    <span className="truncate">{collection.name}</span>
                  </div>
                  {collection.item_count !== undefined && collection.item_count > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {collection.item_count}
                    </Badge>
                  )}
                </Button>
              );
            })
          )}

          {/* Create new collection button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="w-full justify-start gap-2 px-3 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>New Collection</span>
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <CreateCollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
};
