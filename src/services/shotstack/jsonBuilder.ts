import { aspectRatioConfig } from '@/config/captionStyles';
import { CaptionStyle } from '@/types/video';

interface ShotstackEdit {
  timeline: {
    soundtrack?: {
      src: string;
      effect?: string;
      volume?: number;
    };
    background?: string;
    fonts?: Array<{ src: string }>;
    tracks: Track[];
  };
  output: {
    format: string;
    fps?: number;
    size: {
      width: number;
      height: number;
    };
  };
}

interface Track {
  clips: Clip[];
}

interface Clip {
  asset: Asset;
  start: number | string;
  length: number | string;
  fit?: string;
  scale?: number;
  opacity?: number | OpacityAnimation[];
  transition?: {
    in?: string;
    out?: string;
  };
  effect?: string;
  offset?: {
    x?: number | OffsetAnimation[];
    y?: number | OffsetAnimation[];
  };
  position?: string;
  alias?: string;
  transform?: {
    rotate?: {
      angle?: number | RotateAnimation[];
    };
    skew?: {
      x?: number | SkewAnimation[];
      y?: number | SkewAnimation[];
    };
  };
}

interface Asset {
  type: 'video' | 'audio' | 'image' | 'text' | 'caption' | 'luma' | 'shape' | 'text-to-speech';
  src?: string;
  
  // Text assets
  text?: string;
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'center' | 'bottom';
  };
  font?: {
    color?: string;
    family?: string;
    size?: number; // NUMBER not string!
    lineHeight?: number;
    weight?: number;
  };
  stroke?: {
    color?: string;
    width?: number;
  };
  background?: {
    color?: string;
    padding?: number;
    borderRadius?: number;
    opacity?: number;
  };
  width?: number;
  height?: number;
  
  // Caption-specific
  voice?: string;
  
  // Shape assets
  shape?: 'line' | 'rectangle' | 'circle';
  fill?: {
    color?: string;
    opacity?: number;
  };
  line?: {
    length?: number;
    thickness?: number;
  };
  rectangle?: {
    width?: number;
    height?: number;
    cornerRadius?: number;
  };
  circle?: {
    radius?: number;
  };
  
  // Chromakey
  chromaKey?: {
    color: string;
    threshold?: number;
    halo?: number;
  };
}

// Animation interfaces
interface OpacityAnimation {
  from: number;
  to: number;
  start: number;
  length: number;
  interpolation?: 'linear' | 'bezier';
  easing?: string;
}

interface OffsetAnimation {
  from: number;
  to: number;
  start: number;
  length: number;
  interpolation?: 'linear' | 'bezier';
  easing?: string;
}

interface RotateAnimation {
  from: number;
  to: number;
  start: number;
  length: number;
  interpolation?: 'linear' | 'bezier';
  easing?: string;
}

interface SkewAnimation {
  from: number;
  to: number;
  start: number;
  length: number;
  interpolation?: 'linear' | 'bezier';
  easing?: string;
}

export class ShotstackJsonBuilder {
  private edit: ShotstackEdit;
  constructor(aspectRatio: string = '4:5') {
    const config = aspectRatioConfig[aspectRatio as keyof typeof aspectRatioConfig];
    
    this.edit = {
      timeline: {
        tracks: []
      },
      output: {
        format: 'mp4',
        fps: 30,
        size: {
          width: config.width,
          height: config.height
        }
      }
    };
  }

  setBackgroundColor(color: string): this {
    this.edit.timeline.background = color;
    return this;
  }

  addCustomFont(fontUrl: string): this {
    if (!this.edit.timeline.fonts) {
      this.edit.timeline.fonts = [];
    }
    this.edit.timeline.fonts.push({ src: fontUrl });
    return this;
  }

  addSoundtrack(audioUrl: string, volume: number = 1, effect?: string): this {
    this.edit.timeline.soundtrack = {
      src: audioUrl,
      effect: effect || 'fadeInFadeOut',
      volume
    };
    return this;
  }

  addVideoClip(videoUrl: string, options: {
    start?: number | string;
    length?: number | string;
    fit?: string;
    scale?: number;
    effect?: string;
    transition?: {
      in?: string;
      out?: string;
    };
    chromaKey?: {
      color: string;
      threshold?: number;
      halo?: number;
    };
  } = {}): this {
    const videoTrack: Track = {
      clips: [{
        asset: {
          type: 'video',
          src: videoUrl,
          chromaKey: options.chromaKey
        },
        start: options.start !== undefined ? options.start : 0,
        length: options.length !== undefined ? options.length : 'auto',
        fit: options.fit || 'cover',
        scale: options.scale || 1,
        effect: options.effect,
        transition: options.transition || {
          in: 'fade',
          out: 'fade'
        }
      }]
    };

    this.edit.timeline.tracks.push(videoTrack);
    return this;
  }

  /**
   * Add multiple video clips sequentially
   */
  addVideoClips(videoUrls: string[], options: {
    clipDuration?: number;
    fit?: string;
    scale?: number;
    effect?: string;
    transition?: {
      in?: string;
      out?: string;
    };
  } = {}): this {
    const clips: Clip[] = videoUrls.map((videoUrl, index) => ({
      asset: {
        type: 'video',
        src: videoUrl
      },
      start: options.clipDuration ? index * options.clipDuration : 'auto',
      length: options.clipDuration || 'auto',
      fit: options.fit || 'cover',
      scale: options.scale || 1.05,
      effect: options.effect,
      transition: index > 0 ? (options.transition || { in: 'fade', out: 'fade' }) : undefined
    }));

    this.edit.timeline.tracks.push({ clips });
    return this;
  }

  /**
   * Add auto-generated captions from audio alias
   * This is the RECOMMENDED method - Shotstack handles all timing
   */
  addAutoCaptions(voiceoverAlias: string, style: CaptionStyle): this {
    const captionAsset: Asset = {
      type: 'caption',
      src: `alias://${voiceoverAlias}`,
      font: {
        color: style.textColor,
        size: style.fontSize, // NUMBER not string!
        family: style.fontFamily,
        weight: style.fontWeight === 'black' ? 900 : (style.fontWeight === 'bold' ? 700 : 400),
        lineHeight: 1.2
      },
      alignment: {
        horizontal: 'center',
        vertical: style.position as 'top' | 'center' | 'bottom'
      }
    };

    // Add stroke if specified
    if (style.strokeColor && style.strokeWidth) {
      captionAsset.stroke = {
        color: style.strokeColor,
        width: style.strokeWidth
      };
    }

    // Add background if not transparent
    if (style.backgroundColor && style.backgroundColor !== 'rgba(0,0,0,0)') {
      captionAsset.background = {
        color: style.backgroundColor,
        padding: 20,
        borderRadius: 10,
        opacity: 0.85
      };
    }

    const captionTrack: Track = {
      clips: [{
        asset: captionAsset,
        start: 0,
        length: 'end'
      }]
    };

    this.edit.timeline.tracks.push(captionTrack);
    return this;
  }

  /**
   * Add manual captions from SRT/VTT file
   */
  addManualCaptions(srtUrl: string, style?: CaptionStyle): this {
    const captionAsset: Asset = {
      type: 'caption',
      src: srtUrl
    };

    if (style) {
      captionAsset.font = {
        color: style.textColor,
        size: style.fontSize,
        family: style.fontFamily,
        weight: style.fontWeight === 'black' ? 900 : (style.fontWeight === 'bold' ? 700 : 400),
        lineHeight: 1.2
      };
      
      if (style.strokeColor && style.strokeWidth) {
        captionAsset.stroke = {
          color: style.strokeColor,
          width: style.strokeWidth
        };
      }
      
      if (style.backgroundColor && style.backgroundColor !== 'rgba(0,0,0,0)') {
        captionAsset.background = {
          color: style.backgroundColor,
          padding: 20,
          borderRadius: 10
        };
      }
      
      captionAsset.alignment = {
        horizontal: 'center',
        vertical: style.position as 'top' | 'center' | 'bottom'
      };
    }

    this.edit.timeline.tracks.push({
      clips: [{
        asset: captionAsset,
        start: 0,
        length: 'end'
      }]
    });

    return this;
  }

  /**
   * Add styled text overlay
   */
  addTextOverlay(text: string, options: {
    start?: number | string;
    length?: number | string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    backgroundPadding?: number;
    backgroundRadius?: number;
    alignH?: 'left' | 'center' | 'right';
    alignV?: 'top' | 'center' | 'bottom';
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
  } = {}): this {
    const textAsset: Asset = {
      type: 'text',
      text: text,
      font: {
        family: options.fontFamily || 'Montserrat ExtraBold',
        size: options.fontSize || 48,
        color: options.color || '#FFFFFF',
        weight: options.fontWeight || 700,
        lineHeight: 1.2
      },
      alignment: {
        horizontal: options.alignH || 'center',
        vertical: options.alignV || 'center'
      },
      width: options.width || Math.floor(this.edit.output.size.width * 0.8),
      height: options.height || 200
    };

    // Add stroke if specified
    if (options.strokeColor && options.strokeWidth) {
      textAsset.stroke = {
        color: options.strokeColor,
        width: options.strokeWidth
      };
    }

    // Add background if specified
    if (options.backgroundColor) {
      textAsset.background = {
        color: options.backgroundColor,
        padding: options.backgroundPadding || 20,
        borderRadius: options.backgroundRadius || 10
      };
    }

    const textClip: Clip = {
      asset: textAsset,
      start: options.start !== undefined ? options.start : 0,
      length: options.length !== undefined ? options.length : 'auto'
    };

    // Add offset if specified
    if (options.offsetX !== undefined || options.offsetY !== undefined) {
      textClip.offset = {
        x: options.offsetX || 0,
        y: options.offsetY || 0
      };
    }

    this.edit.timeline.tracks.push({
      clips: [textClip]
    });

    return this;
  }

  /**
   * Add image overlay
   */
  addImageOverlay(imageUrl: string, options: {
    start: number | string;
    length: number | string;
    scale?: number;
    fit?: string;
    offsetX?: number;
    offsetY?: number;
    effect?: string;
    opacity?: number;
    transition?: {
      in?: string;
      out?: string;
    };
  }): this {
    const imageClip: Clip = {
      asset: {
        type: 'image',
        src: imageUrl
      },
      start: options.start,
      length: options.length,
      scale: options.scale || 1,
      fit: options.fit || 'cover',
      effect: options.effect,
      opacity: options.opacity || 1,
      transition: options.transition || {
        in: 'fade',
        out: 'fade'
      }
    };

    if (options.offsetX !== undefined || options.offsetY !== undefined) {
      imageClip.offset = {
        x: options.offsetX || 0,
        y: options.offsetY || 0
      };
    }

    this.edit.timeline.tracks.push({
      clips: [imageClip]
    });

    return this;
  }

  /**
   * Add multiple image clips sequentially
   */
  addImageClips(imageUrls: string[], options: {
    clipDuration?: number;
    fit?: string;
    scale?: number;
    effect?: string;
    transition?: {
      in?: string;
      out?: string;
    };
  } = {}): this {
    const clips: Clip[] = imageUrls.map((imageUrl, index) => ({
      asset: {
        type: 'image',
        src: imageUrl
      },
      start: options.clipDuration ? index * options.clipDuration : 'auto',
      length: options.clipDuration || 'auto',
      fit: options.fit || 'cover',
      scale: options.scale || 1.05,
      effect: options.effect,
      transition: index > 0 ? (options.transition || { in: 'fade', out: 'fade' }) : undefined
    }));

    this.edit.timeline.tracks.push({ clips });
    return this;
  }

  /**
   * Add voiceover track with alias (for auto-captions)
   */
  addVoiceoverWithAlias(audioUrl: string, alias: string): this {
    this.edit.timeline.tracks.push({
      clips: [{
        asset: {
          type: 'audio',
          src: audioUrl
        },
        start: 0,
        length: 'auto',
        alias: alias
      }]
    });

    return this;
  }

  /**
   * Add shape overlay (rectangle, circle, line)
   */
  addShape(shape: 'rectangle' | 'circle' | 'line', options: {
    start: number | string;
    length: number | string;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    // Rectangle
    width?: number;
    height?: number;
    cornerRadius?: number;
    // Circle
    radius?: number;
    // Line
    lineLength?: number;
    thickness?: number;
  }): this {
    const shapeAsset: Asset = {
      type: 'shape',
      shape: shape,
      fill: {
        color: options.fillColor || '#000000',
        opacity: options.fillOpacity || 1
      }
    };

    if (options.strokeColor && options.strokeWidth) {
      shapeAsset.stroke = {
        color: options.strokeColor,
        width: options.strokeWidth
      };
    }

    if (shape === 'rectangle') {
      shapeAsset.rectangle = {
        width: options.width || 300,
        height: options.height || 300,
        cornerRadius: options.cornerRadius || 0
      };
    } else if (shape === 'circle') {
      shapeAsset.circle = {
        radius: options.radius || 100
      };
    } else if (shape === 'line') {
      shapeAsset.line = {
        length: options.lineLength || 500,
        thickness: options.thickness || 5
      };
    }

    this.edit.timeline.tracks.push({
      clips: [{
        asset: shapeAsset,
        start: options.start,
        length: options.length
      }]
    });

    return this;
  }

  /**
   * Add luma matte for masking effects
   */
  addLumaMatte(lumaUrl: string, maskedClip: {
    type: 'video' | 'image';
    src: string;
    start: number | string;
    length: number | string;
  }): this {
    this.edit.timeline.tracks.push({
      clips: [
        {
          asset: {
            type: 'luma',
            src: lumaUrl
          },
          start: maskedClip.start,
          length: maskedClip.length
        },
        {
          asset: {
            type: maskedClip.type,
            src: maskedClip.src
          },
          start: maskedClip.start,
          length: maskedClip.length
        }
      ]
    });

    return this;
  }

  /**
   * Add animated clip with opacity/position/rotation animations
   */
  addAnimatedClip(asset: Asset, options: {
    start: number | string;
    length: number | string;
    opacityAnimation?: OpacityAnimation[];
    offsetXAnimation?: OffsetAnimation[];
    offsetYAnimation?: OffsetAnimation[];
    rotateAnimation?: RotateAnimation[];
  }): this {
    const clip: Clip = {
      asset: asset,
      start: options.start,
      length: options.length
    };

    if (options.opacityAnimation) {
      clip.opacity = options.opacityAnimation;
    }

    if (options.offsetXAnimation || options.offsetYAnimation) {
      clip.offset = {};
      if (options.offsetXAnimation) clip.offset.x = options.offsetXAnimation;
      if (options.offsetYAnimation) clip.offset.y = options.offsetYAnimation;
    }

    if (options.rotateAnimation) {
      clip.transform = {
        rotate: {
          angle: options.rotateAnimation
        }
      };
    }

    this.edit.timeline.tracks.push({
      clips: [clip]
    });

    return this;
  }

  build(): object {
    return this.edit;
  }

  toJSON(): string {
    return JSON.stringify(this.edit, null, 2);
  }
}
