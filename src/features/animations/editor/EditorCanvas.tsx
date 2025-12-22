import React, { useRef, useCallback, useEffect } from 'react';
import { ElementInstruction, SceneInstruction, CaptionStyle } from './types';
import { BackgroundRenderer } from './BackgroundRenderer';
import { getElementAnimationStyle, injectAnimationStyles } from '../primitives';
import { cn } from '@/lib/utils';

interface EditorCanvasProps {
  scene: SceneInstruction;
  currentTime: number;
  sceneStartTime: number;
  selectedElementId: string | null;
  mode: 'edit' | 'preview';
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<ElementInstruction>) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  scene,
  currentTime,
  sceneStartTime,
  selectedElementId,
  mode,
  zoom,
  showGrid,
  snapToGrid,
  gridSize,
  onSelectElement,
  onUpdateElement,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    elementId: string;
    startX: number;
    startY: number;
    elementStartX: number;
    elementStartY: number;
  } | null>(null);

  useEffect(() => {
    injectAnimationStyles();
  }, []);

  const localTime = currentTime - sceneStartTime;

  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    if (mode === 'preview') return;
    e.stopPropagation();
    
    const element = scene.elements.find(el => el.id === elementId);
    if (!element) return;
    
    onSelectElement(elementId);
    
    dragRef.current = {
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      elementStartX: element.x,
      elementStartY: element.y,
    };
  }, [mode, scene.elements, onSelectElement]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const deltaX = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    
    let newX = dragRef.current.elementStartX + deltaX;
    let newY = dragRef.current.elementStartY + deltaY;
    
    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));
    
    // Snap to grid
    if (snapToGrid) {
      const gridPercent = (gridSize / 10); // Convert grid size to percentage
      newX = Math.round(newX / gridPercent) * gridPercent;
      newY = Math.round(newY / gridPercent) * gridPercent;
    }
    
    onUpdateElement(dragRef.current.elementId, { x: newX, y: newY });
  }, [snapToGrid, gridSize, onUpdateElement]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectElement(null);
    }
  }, [onSelectElement]);

  const renderElement = (element: ElementInstruction) => {
    const isSelected = element.id === selectedElementId;
    const animationStyle = mode === 'preview' 
      ? getElementAnimationStyle(element, currentTime, sceneStartTime)
      : {};
    
    // Check visibility based on timing
    if (mode === 'preview') {
      if (localTime < element.enterAt || localTime >= element.exitAt) {
        return null;
      }
    }

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x}%`,
      top: `${element.y}%`,
      transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg) scale(${element.scale || 1})`,
      opacity: element.opacity ?? 1,
      zIndex: element.zIndex || 1,
      cursor: mode === 'edit' ? 'move' : 'default',
      userSelect: 'none',
      ...animationStyle,
    };

    const content = renderElementContent(element);

    return (
      <div
        key={element.id}
        style={baseStyle}
        className={cn(
          'transition-shadow',
          isSelected && mode === 'edit' && 'ring-2 ring-primary ring-offset-2 ring-offset-transparent'
        )}
        onMouseDown={(e) => handleMouseDown(e, element.id)}
      >
        {content}
        {isSelected && mode === 'edit' && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded whitespace-nowrap">
            {element.type}
          </div>
        )}
      </div>
    );
  };

  const renderElementContent = (element: ElementInstruction) => {
    const style = element.style;

    switch (element.type) {
      case 'emoji':
        return (
          <span style={{ fontSize: style.fontSize || 48 }}>
            {element.content}
          </span>
        );

      case 'text':
        return (
          <div
            style={{
              fontSize: style.fontSize || 24,
              fontFamily: style.fontFamily || 'Inter',
              fontWeight: style.fontWeight || 'normal',
              color: style.color || '#ffffff',
              textAlign: style.textAlign || 'center',
              backgroundColor: style.backgroundColor,
              padding: style.backgroundColor ? '8px 16px' : 0,
              borderRadius: style.borderRadius || 0,
            }}
          >
            {element.content}
          </div>
        );

      case 'shape':
        return renderShape(element);

      case 'counter':
        return (
          <div
            style={{
              fontSize: style.fontSize || 48,
              fontFamily: style.fontFamily || 'Inter',
              fontWeight: 'bold',
              color: style.color || '#ffffff',
            }}
          >
            {element.content}
          </div>
        );

      case 'image':
        return (
          <img
            src={element.content}
            alt=""
            style={{
              width: element.width ? `${element.width}%` : 'auto',
              height: element.height ? `${element.height}%` : 'auto',
              maxWidth: '100%',
              borderRadius: style.borderRadius || 0,
            }}
            draggable={false}
          />
        );

      default:
        return null;
    }
  };

  const renderShape = (element: ElementInstruction) => {
    const style = element.style;
    const size = 80;
    const fill = style.fillColor || style.color || '#ffffff';
    const stroke = style.strokeColor || 'transparent';
    const strokeWidth = style.strokeWidth || 0;

    switch (style.shapeType) {
      case 'circle':
        return (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - strokeWidth}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 'rectangle':
        return (
          <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
            <rect
              x={strokeWidth / 2}
              y={strokeWidth / 2}
              width={size - strokeWidth}
              height={size * 0.6 - strokeWidth}
              rx={style.borderRadius || 0}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 'triangle':
        return (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <polygon
              points={`${size / 2},${strokeWidth} ${size - strokeWidth},${size - strokeWidth} ${strokeWidth},${size - strokeWidth}`}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 'star':
        const points = 5;
        const outerR = size / 2 - strokeWidth;
        const innerR = outerR * 0.4;
        const starPoints = [];
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / points) * i - Math.PI / 2;
          starPoints.push(`${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`);
        }
        return (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <polygon
              points={starPoints.join(' ')}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 'arrow':
        return (
          <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`}>
            <path
              d={`M 0 ${size / 4} L ${size * 0.7} ${size / 4} L ${size * 0.7} 0 L ${size} ${size / 4} L ${size * 0.7} ${size / 2} L ${size * 0.7} ${size / 4}`}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 'line':
        return (
          <svg width={size} height={4} viewBox={`0 0 ${size} 4`}>
            <line
              x1={0}
              y1={2}
              x2={size}
              y2={2}
              stroke={fill}
              strokeWidth={4}
            />
          </svg>
        );

      default:
        return null;
    }
  };

  const renderCaptions = () => {
    if (!scene.caption?.visible || scene.caption.words.length === 0) return null;

    const caption = scene.caption;
    const position = caption.position || 'bottom';
    
    const positionStyles: Record<string, string> = {
      top: 'top-8',
      center: 'top-1/2 -translate-y-1/2',
      bottom: 'bottom-8',
    };

    // Find current word for highlighting
    const currentWordIndex = caption.words.findIndex(
      w => localTime >= w.start && localTime < w.end
    );

    return (
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 text-center max-w-[80%]',
          positionStyles[position]
        )}
        style={{
          fontSize: caption.fontSize || 32,
          fontFamily: caption.fontFamily || 'Inter',
          color: caption.color || '#ffffff',
        }}
      >
        {renderCaptionWords(caption, currentWordIndex, localTime)}
      </div>
    );
  };

  const renderCaptionWords = (
    caption: NonNullable<SceneInstruction['caption']>,
    currentWordIndex: number,
    _localTime: number
  ) => {
    const style = caption.style as CaptionStyle;

    switch (style) {
      case 'karaoke':
        return caption.words.map((word, i) => (
          <span
            key={word.id}
            className={cn(
              'transition-colors duration-150 mx-1',
              i <= currentWordIndex ? 'text-current' : 'opacity-50'
            )}
            style={{
              color: i <= currentWordIndex ? caption.highlightColor : caption.color,
            }}
          >
            {word.word}
          </span>
        ));

      case 'bounce':
        return caption.words.map((word, i) => (
          <span
            key={word.id}
            className={cn('inline-block mx-1', i === currentWordIndex && 'animate-bounce')}
            style={{
              color: i === currentWordIndex ? caption.highlightColor : caption.color,
            }}
          >
            {word.word}
          </span>
        ));

      case 'wave':
        return caption.words.map((word, i) => (
          <span
            key={word.id}
            className="inline-block mx-1"
            style={{
              color: i === currentWordIndex ? caption.highlightColor : caption.color,
              transform: i === currentWordIndex ? 'translateY(-4px)' : 'translateY(0)',
              transition: 'transform 0.2s ease',
            }}
          >
            {word.word}
          </span>
        ));

      case 'highlight':
        return caption.words.map((word, i) => (
          <span
            key={word.id}
            className={cn('mx-1 px-1 rounded transition-colors duration-150')}
            style={{
              backgroundColor: i === currentWordIndex ? caption.highlightColor : 'transparent',
              color: i === currentWordIndex ? '#000000' : caption.color,
            }}
          >
            {word.word}
          </span>
        ));

      case 'typewriter':
        const visibleWords = caption.words.filter(w => localTime >= w.start);
        return visibleWords.map((word) => (
          <span key={word.id} className="mx-1">
            {word.word}
          </span>
        ));

      case 'static':
      default:
        return caption.words.map((word) => (
          <span key={word.id} className="mx-1">
            {word.word}
          </span>
        ));
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-muted/50 overflow-hidden">
      <div
        ref={canvasRef}
        className="relative bg-black shadow-2xl"
        style={{
          width: `${100 * zoom}%`,
          maxWidth: '100%',
          aspectRatio: '16 / 9',
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <BackgroundRenderer background={scene.background} />
        
        {/* Grid overlay */}
        {showGrid && mode === 'edit' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
          />
        )}
        
        {/* Elements */}
        <div className="absolute inset-0">
          {scene.elements.map(renderElement)}
        </div>
        
        {/* Captions */}
        {renderCaptions()}
      </div>
    </div>
  );
};
