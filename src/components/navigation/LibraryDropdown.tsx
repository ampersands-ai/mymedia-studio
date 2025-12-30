import { Link } from "react-router-dom";
import { History, ChevronDown, MessageSquare, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNavDropdown } from "./NavDropdownContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LibraryDropdownProps {
  align?: "start" | "center" | "end";
}

export const LibraryDropdown = ({ align = "center" }: LibraryDropdownProps) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin } = useAdminRole();
  const { openDropdown, setOpenDropdown } = useNavDropdown();

  return (
    <DropdownMenu open={openDropdown === "library"} onOpenChange={(open) => {
      if (open) {
        setOpenDropdown("library");
      } else if (openDropdown === "library") {
        setOpenDropdown(null);
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-base px-6 py-2.5 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300 gap-2 border-2 border-purple-400/50"
          onPointerDown={(e) => {
            if (openDropdown !== "library") {
              e.preventDefault();
              setOpenDropdown("library");
            }
          }}
        >
          <History className="h-5 w-5" />
          <span>Library</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={align} 
        className="w-72 p-4 bg-card/95 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 z-[100]"
      >
        <Link
          to="/dashboard/history"
          className="flex items-center gap-4 p-4 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 mb-2 group"
        >
          <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <History className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-foreground">History</p>
            <p className="text-sm text-muted-foreground">View your creations</p>
          </div>
        </Link>
        <Link
          to="/dashboard/prompts"
          className="flex items-center gap-4 p-4 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 mb-2 group"
        >
          <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-foreground">Prompts</p>
            <p className="text-sm text-muted-foreground">Saved prompt library</p>
          </div>
        </Link>
        {(isFeatureEnabled('templates') || isAdmin) && (
          <Link
            to="/dashboard/templates"
            className="flex items-center gap-4 p-4 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group"
          >
            <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">Templates</p>
              <p className="text-sm text-muted-foreground">Pre-built workflows</p>
            </div>
          </Link>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
