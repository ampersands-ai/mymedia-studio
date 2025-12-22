import { useState } from "react";
import { Check, FolderPlus, Plus, Heart, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCollections, useGenerationCollections, useCollectionMutations } from "@/hooks/useCollections";
import { CreateCollectionDialog } from "./CreateCollectionDialog";
import { cn } from "@/lib/utils";

interface CollectionSelectorProps {
  generationId: string;
  variant?: "default" | "compact";
  className?: string;
}

const getIconComponent = (icon: string | null, isDefault: boolean | null) => {
  if (isDefault) return Heart;
  switch (icon) {
    case "heart":
      return Heart;
    case "folder":
    default:
      return Folder;
  }
};

export const CollectionSelector = ({
  generationId,
  variant = "default",
  className,
}: CollectionSelectorProps) => {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { data: collections = [], isLoading } = useCollections(user?.id);
  const { data: generationCollections = [] } = useGenerationCollections(generationId);
  const { addToCollection, removeFromCollection } = useCollectionMutations();

  const handleToggleCollection = (collectionId: string) => {
    const isInCollection = generationCollections.includes(collectionId);
    
    if (isInCollection) {
      removeFromCollection.mutate({ collectionId, generationId });
    } else {
      addToCollection.mutate({ collectionId, generationId });
    }
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={variant === "compact" ? "icon" : "sm"}
            className={cn("gap-2", className)}
            disabled={isLoading}
          >
            <FolderPlus className="h-4 w-4" />
            {variant === "default" && <span>Add to Collection</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {collections.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              No collections yet
            </div>
          ) : (
            collections.map((collection) => {
              const IconComponent = getIconComponent(collection.icon, collection.is_default);
              const isInCollection = generationCollections.includes(collection.id);

              return (
                <DropdownMenuItem
                  key={collection.id}
                  onClick={() => handleToggleCollection(collection.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <IconComponent
                      className="h-4 w-4"
                      style={{ color: collection.color || undefined }}
                    />
                    <span className="truncate">{collection.name}</span>
                  </div>
                  {isInCollection && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setShowCreateDialog(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateCollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(collectionId) => {
          addToCollection.mutate({ collectionId, generationId });
        }}
      />
    </>
  );
};
