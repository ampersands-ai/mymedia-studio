import type { SubtitlePreset } from "@/types/subtitle";

export const SUBTITLE_PRESETS: Record<string, SubtitlePreset> = {
  boldModern: {
    name: "Bold Modern",
    description: "High contrast with thick outline",
    settings: {
      fontFamily: "Montserrat Bold",
      fontSize: 160,
      fontColor: "#FFFFFF",
      fontWeight: "bold",
      textAlign: "center",
      textTransform: "uppercase",
      lineHeight: 1.2,
      letterSpacing: 0,
      backgroundColor: "#000000",
      backgroundOpacity: 0.8,
      backgroundPadding: 20,
      backgroundRadius: 10,
      outlineColor: "#000000",
      outlineWidth: 10,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowX: 0,
      shadowY: 0,
      position: "mid-bottom-center",
      offsetX: 0,
      offsetY: 0,
      maxWidth: 800,
      animation: "fade",
      animationDuration: 0.3,
      subtitlesModel: "default",
      language: "auto",
    }
  },
  minimalClean: {
    name: "Minimal Clean",
    description: "Simple white text with subtle shadow",
    settings: {
      fontFamily: "Inter Bold",
      fontSize: 120,
      fontColor: "#FFFFFF",
      fontWeight: "bold",
      textAlign: "center",
      textTransform: "none",
      lineHeight: 1.3,
      letterSpacing: 1,
      backgroundColor: "transparent",
      backgroundOpacity: 0,
      backgroundPadding: 0,
      backgroundRadius: 0,
      outlineWidth: 0,
      shadowColor: "#000000",
      shadowBlur: 15,
      shadowX: 2,
      shadowY: 2,
      position: "mid-bottom-center",
      offsetX: 0,
      offsetY: 0,
      maxWidth: 900,
      animation: "fade",
      animationDuration: 0.3,
      subtitlesModel: "default",
      language: "auto",
    }
  },
  classicYellow: {
    name: "Classic Yellow",
    description: "Traditional yellow text with black outline",
    settings: {
      fontFamily: "Arial",
      fontSize: 130,
      fontColor: "#FFFF00",
      fontWeight: "bold",
      textAlign: "center",
      textTransform: "none",
      lineHeight: 1.2,
      letterSpacing: 0,
      backgroundColor: "transparent",
      backgroundOpacity: 0,
      backgroundPadding: 0,
      backgroundRadius: 0,
      outlineColor: "#000000",
      outlineWidth: 6,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowX: 0,
      shadowY: 0,
      position: "mid-bottom-center",
      offsetX: 0,
      offsetY: 0,
      maxWidth: 800,
      animation: "none",
      animationDuration: 0,
      subtitlesModel: "default",
      language: "auto",
    }
  },
  netflixStyle: {
    name: "Netflix Style",
    description: "Clean white text on dark background",
    settings: {
      fontFamily: "Roboto",
      fontSize: 140,
      fontColor: "#FFFFFF",
      fontWeight: "normal",
      textAlign: "center",
      textTransform: "none",
      lineHeight: 1.2,
      letterSpacing: 0,
      backgroundColor: "#000000",
      backgroundOpacity: 0.9,
      backgroundPadding: 20,
      backgroundRadius: 5,
      outlineWidth: 0,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowX: 0,
      shadowY: 0,
      position: "bottom-center",
      offsetX: 0,
      offsetY: -50,
      maxWidth: 900,
      animation: "fade",
      animationDuration: 0.2,
      subtitlesModel: "default",
      language: "auto",
    }
  }
};

export const FONT_FAMILIES = [
  "Oswald Bold",
  "Montserrat Bold",
  "Inter Bold",
  "Roboto",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier",
  "Impact",
  "Comic Sans MS",
  "Verdana",
  "Trebuchet MS"
];

export const SUBTITLE_POSITIONS = [
  { value: "top-left", label: "Top Left", row: 0, col: 0 },
  { value: "top-center", label: "Top Center", row: 0, col: 1 },
  { value: "top-right", label: "Top Right", row: 0, col: 2 },
  { value: "mid-left-center", label: "Middle Left", row: 1, col: 0 },
  { value: "mid-center", label: "Middle Center", row: 1, col: 1 },
  { value: "mid-right-center", label: "Middle Right", row: 1, col: 2 },
  { value: "mid-bottom-center", label: "Mid Bottom", row: 2, col: 0 },
  { value: "bottom-left", label: "Bottom Left", row: 2, col: 1 },
  { value: "bottom-center", label: "Bottom Center", row: 2, col: 1 },
  { value: "bottom-right", label: "Bottom Right", row: 2, col: 2 }
];

export const ANIMATION_TYPES = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "zoom", label: "Zoom In" },
  { value: "bounce", label: "Bounce" }
];

export const LANGUAGES = [
  { value: "auto", label: "Auto Detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ru", label: "Russian" }
];

export const SUBTITLES_MODELS = [
  { value: "default", label: "Default" },
  { value: "whisper", label: "Whisper AI" },
  { value: "azure", label: "Azure" },
  { value: "google", label: "Google" }
];

export const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "100", label: "Thin (100)" },
  { value: "200", label: "Extra Light (200)" },
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi Bold (600)" },
  { value: "700", label: "Bold (700)" },
  { value: "800", label: "Extra Bold (800)" },
  { value: "900", label: "Black (900)" }
];
