import { Link } from "react-router-dom";
import { Sparkles, ChevronDown, Video, Scissors, BookOpen, ImagePlus, Film, Music, Palette, CircleUser, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNavDropdown } from "./NavDropdownContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudioDropdownProps {
  align?: "start" | "center" | "end";
}

export const StudioDropdown = ({ align = "center" }: StudioDropdownProps) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin } = useAdminRole();
  const { openDropdown, setOpenDropdown } = useNavDropdown();

  return (
    <DropdownMenu open={openDropdown === "studio"} onOpenChange={(open) => {
      if (open) {
        setOpenDropdown("studio");
      } else if (openDropdown === "studio") {
        setOpenDropdown(null);
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          className="bg-gradient-to-r from-primary-yellow to-primary-orange text-neutral-900 font-bold text-base px-6 py-2.5 rounded-full shadow-lg shadow-primary-orange/30 hover:shadow-xl hover:shadow-primary-orange/40 hover:scale-105 transition-all duration-300 gap-2 border-2 border-primary-orange/50"
          onPointerDown={(e) => {
            if (openDropdown !== "studio") {
              e.preventDefault();
              setOpenDropdown("studio");
            }
          }}
        >
          <Sparkles className="h-5 w-5" />
          <span>Studio</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={align} 
        className="w-[580px] p-5 bg-card/95 backdrop-blur-xl border-2 border-primary-orange/30 rounded-2xl shadow-2xl shadow-primary-orange/20 z-[100]"
      >
        <div className="grid grid-cols-5 gap-3 mb-4">
          {/* Image */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-primary-orange uppercase tracking-wider px-1">Image</p>
            <Link
              to="/dashboard/custom-creation?group=image_editing"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <Palette className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Image to Image</p>
              </div>
            </Link>
            <Link
              to="/dashboard/custom-creation?group=prompt_to_image"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <ImagePlus className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Text to Image</p>
              </div>
            </Link>
          </div>

          {/* Video */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-primary-orange uppercase tracking-wider px-1">Video</p>
            <Link
              to="/dashboard/custom-creation?group=prompt_to_video"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <Video className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Text to Video</p>
              </div>
            </Link>
            <Link
              to="/dashboard/custom-creation?group=image_to_video"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <Film className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Image to Video</p>
              </div>
            </Link>
            <Link
              to="/dashboard/custom-creation?group=video_to_video"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <Repeat className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Video to Video</p>
              </div>
            </Link>
            <Link
              to="/dashboard/custom-creation?group=lip_sync"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <CircleUser className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground text-[10px]">Custom Avatar</p>
                <p className="text-[8px] text-muted-foreground">(Lip Sync)</p>
              </div>
            </Link>
          </div>

          {/* Audio */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-primary-orange uppercase tracking-wider px-1">Audio</p>
            <Link
              to="/dashboard/custom-creation?group=prompt_to_audio"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <Music className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Audio Studio</p>
              </div>
            </Link>
          </div>

          {/* Editing */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-primary-orange uppercase tracking-wider px-1">Editing</p>
            <Link
              to="/dashboard/video-editor"
              onClick={() => setOpenDropdown(null)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                <Scissors className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs text-foreground">Video Stitching</p>
              </div>
            </Link>
          </div>

          {/* Storytelling */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-primary-orange uppercase tracking-wider px-1">Storytelling</p>
            {(isFeatureEnabled('faceless_videos') || isAdmin) && (
              <Link
                to="/dashboard/video-studio"
                onClick={() => setOpenDropdown(null)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                  <Video className="h-4 w-4" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs text-foreground">Faceless Videos</p>
                </div>
              </Link>
            )}
            {(isFeatureEnabled('storyboard') || isAdmin) && (
              <Link
                to="/dashboard/storyboard"
                onClick={() => setOpenDropdown(null)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs text-foreground">Storyboard</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
