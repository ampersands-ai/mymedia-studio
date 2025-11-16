import { Palette, ImagePlus, Video, Film, Music } from "lucide-react";

export const CREATION_GROUPS = [
  { 
    id: "image_editing" as const, 
    label: "Image Editing/Image to Image", 
    Icon: Palette, 
    description: "Modify existing images" 
  },
  { 
    id: "prompt_to_image" as const, 
    label: "Text to Image", 
    Icon: ImagePlus, 
    description: "Generate images from text" 
  },
  { 
    id: "prompt_to_video" as const, 
    label: "Text to Video", 
    Icon: Video, 
    description: "Generate videos from text" 
  },
  { 
    id: "image_to_video" as const, 
    label: "Image to Video", 
    Icon: Film, 
    description: "Animate images into videos" 
  },
  { 
    id: "prompt_to_audio" as const, 
    label: "Audio Studio", 
    Icon: Music, 
    description: "Generate audio from text" 
  },
] as const;

export type CreationGroup = "image_editing" | "prompt_to_image" | "prompt_to_video" | "image_to_video" | "prompt_to_audio";
