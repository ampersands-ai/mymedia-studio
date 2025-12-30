import { Link, useNavigate } from "react-router-dom";
import { Coins, Shield, ChevronDown, Sparkles, History, Video, BookOpen, LayoutTemplate, MessageSquare, Palette, ImagePlus, Film, Music, CircleUser, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUserCredits } from "@/hooks/useUserCredits";

import { MobileMenu } from "@/components/MobileMenu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import logoImage from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export const GlobalHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { availableCredits, isLoading } = useUserCredits();
  
  const creditBalance = isLoading ? null : availableCredits;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled 
        ? "backdrop-blur-xl bg-card/80 shadow-lg border-b border-border/30" 
        : "backdrop-blur-sm bg-black/20"
    )}>
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">

          {/* Left Side - Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <OptimizedImage 
              src={logoImage} 
              alt="artifio.ai logo" 
              width={32}
              height={32}
              className="h-6 md:h-8 object-contain"
              priority={true}
              isSupabaseImage={false}
            />
            <span className="text-xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              artifio.ai
            </span>
          </Link>

          {/* Center - Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user && (
              <>
              {/* Studio Dropdown - Grand pill button with all creation groups */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-primary-yellow to-primary-orange text-neutral-900 font-bold text-base shadow-lg shadow-primary-orange/30 hover:shadow-xl hover:shadow-primary-orange/40 hover:scale-105 transition-all duration-300">
                  <Sparkles className="h-5 w-5" />
                  Studio
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 p-4 bg-card/95 backdrop-blur-xl border-2 border-primary-orange/30 z-[60] shadow-2xl shadow-primary-orange/20 rounded-2xl">
                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Generate Content</DropdownMenuLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=image_editing")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Palette className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Image to Image</div>
                        <div className="text-[10px] text-muted-foreground">Image Editing</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=prompt_to_image")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <ImagePlus className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Text to Image</div>
                        <div className="text-[10px] text-muted-foreground">No reference</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=prompt_to_video")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Video className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Text to Video</div>
                        <div className="text-[10px] text-muted-foreground">No reference</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=image_to_video")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Film className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Image to Video</div>
                        <div className="text-[10px] text-muted-foreground">Image referenced</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=video_to_video")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Repeat className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Video to Video</div>
                        <div className="text-[10px] text-muted-foreground">Video editing</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=lip_sync")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <CircleUser className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Custom Avatar</div>
                        <div className="text-[10px] text-muted-foreground">Audio to video</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=prompt_to_audio")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto col-span-2">
                      <Music className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Audio Studio</div>
                        <div className="text-[10px] text-muted-foreground">Sounds to songs</div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="my-3" />
                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">More Tools</DropdownMenuLabel>
                  <div className="space-y-1">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/templates")} className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-primary-orange/10">
                      <LayoutTemplate className="h-5 w-5 text-primary-orange" />
                      <div>
                        <div className="font-semibold text-sm">Templates</div>
                        <div className="text-[10px] text-muted-foreground">Pre-built workflows</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/storyboard")} className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-primary-orange/10">
                      <BookOpen className="h-5 w-5 text-primary-orange" />
                      <div>
                        <div className="font-semibold text-sm">Storyboard</div>
                        <div className="text-[10px] text-muted-foreground">Visual storytelling</div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Library Dropdown - Grand pill button */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300">
                  <History className="h-5 w-5" />
                  Library
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 p-4 bg-card/95 backdrop-blur-xl border-2 border-purple-500/30 z-[60] shadow-2xl shadow-purple-500/20 rounded-2xl">
                  <div className="space-y-2">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/history")} className="cursor-pointer flex items-center gap-3 p-4 rounded-xl hover:bg-purple-500/10">
                      <History className="h-6 w-6 text-purple-500" />
                      <div>
                        <div className="font-semibold text-base">History</div>
                        <div className="text-xs text-muted-foreground">View your creations</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/prompts")} className="cursor-pointer flex items-center gap-3 p-4 rounded-xl hover:bg-purple-500/10">
                      <MessageSquare className="h-6 w-6 text-purple-500" />
                      <div>
                        <div className="font-semibold text-base">Prompts</div>
                        <div className="text-xs text-muted-foreground">Saved prompt library</div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            )}
          </nav>

          {/* Right Side - Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {!user && (
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 text-foreground hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md font-semibold"
              >
                Login
              </button>
            )}


            {creditBalance !== null && (
              <button
                onClick={() => navigate("/dashboard/settings", { state: { defaultTab: 'usage' } })}
                className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 flex items-center gap-2 hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md"
              >
                <Coins className="h-5 w-5 text-primary-orange" />
                <span className="font-bold text-base">
                  {creditBalance.toLocaleString()}
                </span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 flex items-center gap-2 hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md font-semibold"
              >
                <Shield className="h-5 w-5" />
                Admin
              </button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileMenu creditBalance={creditBalance ?? undefined} />
          </div>
        </div>
      </nav>
    </header>
  );
};
