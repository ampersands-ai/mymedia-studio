import type { SubtitlePreset } from "@/types/subtitle";

export const SUBTITLE_PRESETS: Record<string, SubtitlePreset> = {
  boldYellowClassic: {
    name: "Bold Yellow Classic",
    description: "Classic style with yellow highlights and black outline",
    settings: {
      style: 'classic',
      fontFamily: 'Oswald Bold',
      fontSize: 40,
      wordColor: '#FFFF00',
      lineColor: '#FFFFFF',
      boxColor: '#000000',
      outlineColor: '#000000',
      outlineWidth: 8,
      fontWeight: 'bold',
      fontColor: '#FFFF00',
      position: 'mid-bottom-center',
      allCaps: false,
      maxWordsPerLine: 4,
      shadowOffset: 0,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      textAlign: 'center',
      subtitlesModel: 'default',
      language: 'auto',
    }
  },
  boxedModern: {
    name: "Boxed Modern",
    description: "Modern boxed word style with black boxes",
    settings: {
      style: 'boxed-word',
      fontFamily: 'Montserrat Bold',
      fontSize: 40,
      boxColor: '#000000',
      lineColor: '#FFFFFF',
      wordColor: '#FFFF00',
      fontColor: '#FFFFFF',
      fontWeight: 'bold',
      position: 'mid-bottom-center',
      allCaps: false,
      maxWordsPerLine: 4,
      outlineWidth: 0,
      shadowOffset: 0,
      backgroundColor: '#000000',
      backgroundOpacity: 0.8,
      backgroundPadding: 20,
      backgroundRadius: 10,
      textAlign: 'center',
      subtitlesModel: 'default',
      language: 'auto',
    }
  },
  minimalWhite: {
    name: "Minimal White",
    description: "Clean progressive style with subtle shadow",
    settings: {
      style: 'classic-progressive',
      fontFamily: 'Roboto',
      fontSize: 40,
      lineColor: '#FFFFFF',
      wordColor: '#FFFFFF',
      boxColor: '#000000',
      fontColor: '#FFFFFF',
      fontWeight: 'normal',
      position: 'mid-bottom-center',
      outlineWidth: 0,
      allCaps: false,
      maxWordsPerLine: 4,
      shadowOffset: 10,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      textAlign: 'center',
      subtitlesModel: 'default',
      language: 'auto',
    }
  },
  highContrastBox: {
    name: "High Contrast Box",
    description: "Full line with black background box",
    settings: {
      style: 'boxed-line',
      fontFamily: 'Arial Bold',
      fontSize: 40,
      boxColor: '#000000',
      lineColor: '#FFFFFF',
      wordColor: '#FFFFFF',
      fontColor: '#FFFFFF',
      fontWeight: 'bold',
      position: 'mid-bottom-center',
      outlineWidth: 0,
      allCaps: false,
      maxWordsPerLine: 4,
      shadowOffset: 0,
      backgroundColor: '#000000',
      backgroundOpacity: 0.9,
      backgroundPadding: 25,
      backgroundRadius: 8,
      textAlign: 'center',
      subtitlesModel: 'default',
      language: 'auto',
    }
  },
  tiktokStyle: {
    name: "TikTok Style",
    description: "Viral TikTok captions - uppercase, boxed words",
    settings: {
      style: 'boxed-word',
      fontFamily: 'Montserrat Bold',
      fontSize: 40,
      boxColor: '#000000',
      lineColor: '#FFFFFF',
      wordColor: '#FFFFFF',
      fontColor: '#FFFFFF',
      fontWeight: 'bold',
      position: 'mid-center',
      maxWordsPerLine: 2,
      allCaps: true,
      outlineWidth: 0,
      shadowOffset: 0,
      backgroundColor: '#000000',
      backgroundOpacity: 0.85,
      backgroundPadding: 15,
      backgroundRadius: 12,
      textAlign: 'center',
      textTransform: 'uppercase',
      subtitlesModel: 'default',
      language: 'auto',
    }
  },
  netflixStyle: {
    name: "Netflix Style",
    description: "Traditional subtitle look",
    settings: {
      style: 'classic',
      fontFamily: 'Arial',
      fontSize: 40,
      lineColor: '#FFFFFF',
      wordColor: '#FFFFFF',
      boxColor: '#000000',
      fontColor: '#FFFFFF',
      fontWeight: 'normal',
      position: 'bottom-center',
      outlineWidth: 0,
      allCaps: false,
      maxWordsPerLine: 4,
      shadowOffset: 0,
      backgroundColor: '#000000',
      backgroundOpacity: 0.9,
      backgroundPadding: 20,
      backgroundRadius: 5,
      textAlign: 'center',
      subtitlesModel: 'default',
      language: 'auto',
    }
  }
};

export const FONT_FAMILIES = [
  "Arial",
  "Arial Bold",
  "Katibeh",
  "Lalezar",
  "Libre Baskerville",
  "Lobster",
  "Luckiest Guy",
  "Nanum Pen Script",
  "Nunito",
  "Pacifico",
  "Roboto",
  "Comic Neue",
  "Orelega One",
  "Oswald",
  "Oswald Bold",
  "Shrikhand",
  "Fredericka the Great",
  "Permanent Marker",
  "NotoSans Bold",
  "Montserrat Bold",
  "Inter Bold",
  "Simplified Chinese",
  "Traditional Chinese",
  "Japanese",
  "Korean",
  "Korean Bold"
];

export const SUBTITLE_STYLES = [
  {
    value: 'classic',
    label: 'Classic',
    description: 'Simple text overlay with word highlights',
    preview: 'Words appear highlighted'
  },
  {
    value: 'classic-progressive',
    label: 'Progressive',
    description: 'Words fade in progressively',
    preview: 'Smooth word transitions'
  },
  {
    value: 'classic-one-word',
    label: 'One Word',
    description: 'Display one word at a time',
    preview: 'Single word focus'
  },
  {
    value: 'boxed-line',
    label: 'Boxed Line',
    description: 'Full line with background box',
    preview: 'Boxed sentence'
  },
  {
    value: 'boxed-word',
    label: 'Boxed Word',
    description: 'Each word in separate box (TikTok style)',
    preview: 'Individual word boxes'
  }
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
