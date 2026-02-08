import Link from "next/link";
import { History, ChevronDown, MessageSquare, LayoutTemplate, Cpu, Sparkles, BookOpen } from "lucide-react";
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
  const { isFeatureEnabled, isPageEnabled } = useFeatureFlags();
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
        className="w-[340px] p-5 bg-card/95 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 z-[100]"
      >
        <div className="grid grid-cols-3 gap-3">
          {/* History */}
          <Link
            href="/dashboard/history"
            onClick={() => setOpenDropdown(null)}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group h-[88px] w-[88px]"
          >
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <History className="h-4 w-4" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs text-foreground">History</p>
            </div>
          </Link>

          {/* Prompts */}
          <Link
            href="/dashboard/prompts"
            onClick={() => setOpenDropdown(null)}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group h-[88px] w-[88px]"
          >
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs text-foreground">Prompts</p>
            </div>
          </Link>

          {/* Templates */}
          {(isFeatureEnabled('templates') || isAdmin) && (
            <Link
              href="/dashboard/templates"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group h-[88px] w-[88px]"
            >
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Templates</p>
              </div>
            </Link>
          )}

          {/* Models */}
          <Link
            href="/models"
            onClick={() => setOpenDropdown(null)}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group h-[88px] w-[88px]"
          >
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs text-foreground">Models</p>
            </div>
          </Link>

          {/* Features */}
          {isPageEnabled('features') && (
            <Link
              href="/features"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group h-[88px] w-[88px]"
            >
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Features</p>
              </div>
            </Link>
          )}

          {/* Blog */}
          <Link
            href="/blog"
            onClick={() => setOpenDropdown(null)}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group h-[88px] w-[88px]"
          >
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs text-foreground">Blog</p>
            </div>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
