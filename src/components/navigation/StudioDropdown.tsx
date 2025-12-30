import { Link } from "react-router-dom";
import { Sparkles, ChevronDown, Video, Clapperboard, LayoutTemplate, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAdminRole } from "@/hooks/useAdminRole";
import { CREATION_GROUPS } from "@/constants/creation-groups";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudioDropdownProps {
  align?: "start" | "center" | "end";
}

export const StudioDropdown = ({ align = "center" }: StudioDropdownProps) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin } = useAdminRole();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="bg-gradient-to-r from-primary-yellow to-primary-orange text-neutral-900 font-bold text-base px-6 py-2.5 rounded-full shadow-lg shadow-primary-orange/30 hover:shadow-xl hover:shadow-primary-orange/40 hover:scale-105 transition-all duration-300 gap-2 border-2 border-primary-orange/50"
        >
          <Sparkles className="h-5 w-5" />
          <span>Studio</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={align} 
        className="w-[420px] p-5 bg-card/95 backdrop-blur-xl border-2 border-primary-orange/30 rounded-2xl shadow-2xl shadow-primary-orange/20 z-[100]"
      >
        {/* Creation Groups Grid */}
        <div className="mb-4">
          <p className="text-xs font-bold text-primary-orange uppercase tracking-wider mb-3 px-1">Generate Content</p>
          <div className="grid grid-cols-2 gap-2">
            {CREATION_GROUPS.map((group) => {
              const IconComponent = group.Icon;
              return (
                <Link
                  key={group.id}
                  to={`/dashboard/custom-creation?group=${group.id}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group",
                    group.id === "prompt_to_audio" && "col-span-2"
                  )}
                >
                  <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{group.subtitle}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/50 my-3" />

        {/* More Tools */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">More Tools</p>
          <div className="grid grid-cols-2 gap-2">
            {(isFeatureEnabled('faceless_videos') || isAdmin) && (
              <Link
                to="/dashboard/video-studio"
                className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
              >
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Faceless Videos</span>
              </Link>
            )}
            <Link
              to="/video-editor"
              className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
            >
              <Clapperboard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Video Editor</span>
            </Link>
            {(isFeatureEnabled('storyboard') || isAdmin) && (
              <Link
                to="/dashboard/storyboard"
                className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
              >
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Storyboard</span>
              </Link>
            )}
            {(isFeatureEnabled('templates') || isAdmin) && (
              <Link
                to="/dashboard/templates"
                className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
              >
                <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Templates</span>
              </Link>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
