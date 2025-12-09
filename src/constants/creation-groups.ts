import { Palette, ImagePlus, Video, Film, Music, Mic, Repeat } from "lucide-react";

export const CREATION_GROUPS = [
  { 
    id: "image_editing" as const, 
    label: "Image to Image", 
    subtitle: "(Image Editing)",
    Icon: Palette, 
    description: "Modify existing images" 
  },
  { 
    id: "prompt_to_image" as const, 
    label: "Text to Image", 
    subtitle: "(no image reference)",
    Icon: ImagePlus, 
    description: "Generate images from text" 
  },
  { 
    id: "prompt_to_video" as const, 
    label: "Text to Video", 
    subtitle: "(no image reference)",
    Icon: Video, 
    description: "Generate videos from text" 
  },
  { 
    id: "image_to_video" as const, 
    label: "Image to Video", 
    subtitle: "(image referenced)",
    Icon: Film, 
    description: "Animate images into videos" 
  },
  { 
    id: "video_to_video" as const, 
    label: "Video to Video", 
    subtitle: "(video editing)",
    Icon: Repeat, 
    description: "Transform existing videos" 
  },
  { 
    id: "lip_sync" as const, 
    label: "Custom Avatar", 
    subtitle: "(audio to video)",
    Icon: Mic, 
    description: "Create talking avatar videos" 
  },
  { 
    id: "prompt_to_audio" as const, 
    label: "Audio Studio", 
    subtitle: "(sounds to songs)",
    Icon: Music, 
    description: "Generate audio from text" 
  },
] as const;

export type CreationGroup = "image_editing" | "prompt_to_image" | "prompt_to_video" | "image_to_video" | "video_to_video" | "lip_sync" | "prompt_to_audio";
