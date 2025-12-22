// Animation Primitives - CSS keyframe animations
import type { EnterAnimation, EmphasisAnimation, ExitAnimation } from '../editor/types';

// Enter Animations
export const enterAnimations: Record<EnterAnimation, string> = {
  none: '',
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  slideInLeft: `
    @keyframes slideInLeft {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
  slideInRight: `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
  slideInUp: `
    @keyframes slideInUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  slideInDown: `
    @keyframes slideInDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  zoomIn: `
    @keyframes zoomIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
  bounceIn: `
    @keyframes bounceIn {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.2); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
  `,
  flipIn: `
    @keyframes flipIn {
      from { transform: perspective(400px) rotateY(90deg); opacity: 0; }
      to { transform: perspective(400px) rotateY(0); opacity: 1; }
    }
  `,
  rotateIn: `
    @keyframes rotateIn {
      from { transform: rotate(-180deg) scale(0); opacity: 0; }
      to { transform: rotate(0) scale(1); opacity: 1; }
    }
  `,
};

// Emphasis Animations
export const emphasisAnimations: Record<EmphasisAnimation, string> = {
  none: '',
  pulse: `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `,
  shake: `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
  `,
  bounce: `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
  `,
  swing: `
    @keyframes swing {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(15deg); }
      40% { transform: rotate(-10deg); }
      60% { transform: rotate(5deg); }
      80% { transform: rotate(-5deg); }
    }
  `,
  tada: `
    @keyframes tada {
      0%, 100% { transform: scale(1) rotate(0); }
      10%, 20% { transform: scale(0.9) rotate(-3deg); }
      30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
      40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
    }
  `,
  heartbeat: `
    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      14% { transform: scale(1.3); }
      28% { transform: scale(1); }
      42% { transform: scale(1.3); }
      70% { transform: scale(1); }
    }
  `,
  rubberBand: `
    @keyframes rubberBand {
      0%, 100% { transform: scaleX(1); }
      30% { transform: scaleX(1.25) scaleY(0.75); }
      40% { transform: scaleX(0.75) scaleY(1.25); }
      50% { transform: scaleX(1.15) scaleY(0.85); }
      65% { transform: scaleX(0.95) scaleY(1.05); }
      75% { transform: scaleX(1.05) scaleY(0.95); }
    }
  `,
  flash: `
    @keyframes flash {
      0%, 50%, 100% { opacity: 1; }
      25%, 75% { opacity: 0; }
    }
  `,
  float: `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-15px); }
    }
  `,
  glow: `
    @keyframes glow {
      0%, 100% { filter: drop-shadow(0 0 5px currentColor); }
      50% { filter: drop-shadow(0 0 20px currentColor) drop-shadow(0 0 30px currentColor); }
    }
  `,
  wiggle: `
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
      75% { transform: rotate(-3deg); }
    }
  `,
};

// Exit Animations
export const exitAnimations: Record<ExitAnimation, string> = {
  none: '',
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  slideOutLeft: `
    @keyframes slideOutLeft {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(-100%); opacity: 0; }
    }
  `,
  slideOutRight: `
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `,
  slideOutUp: `
    @keyframes slideOutUp {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(-100%); opacity: 0; }
    }
  `,
  slideOutDown: `
    @keyframes slideOutDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100%); opacity: 0; }
    }
  `,
  zoomOut: `
    @keyframes zoomOut {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0); opacity: 0; }
    }
  `,
  bounceOut: `
    @keyframes bounceOut {
      0% { transform: scale(1); opacity: 1; }
      25% { transform: scale(0.95); }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(0); opacity: 0; }
    }
  `,
  flipOut: `
    @keyframes flipOut {
      from { transform: perspective(400px) rotateY(0); opacity: 1; }
      to { transform: perspective(400px) rotateY(90deg); opacity: 0; }
    }
  `,
  rotateOut: `
    @keyframes rotateOut {
      from { transform: rotate(0) scale(1); opacity: 1; }
      to { transform: rotate(180deg) scale(0); opacity: 0; }
    }
  `,
};

// Animation options for dropdowns
export const ENTER_OPTIONS: { value: EnterAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideInLeft', label: 'Slide In Left' },
  { value: 'slideInRight', label: 'Slide In Right' },
  { value: 'slideInUp', label: 'Slide In Up' },
  { value: 'slideInDown', label: 'Slide In Down' },
  { value: 'zoomIn', label: 'Zoom In' },
  { value: 'bounceIn', label: 'Bounce In' },
  { value: 'flipIn', label: 'Flip In' },
  { value: 'rotateIn', label: 'Rotate In' },
];

export const EMPHASIS_OPTIONS: { value: EmphasisAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'shake', label: 'Shake' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'swing', label: 'Swing' },
  { value: 'tada', label: 'Tada' },
  { value: 'heartbeat', label: 'Heartbeat' },
  { value: 'rubberBand', label: 'Rubber Band' },
  { value: 'flash', label: 'Flash' },
  { value: 'float', label: 'Float' },
  { value: 'glow', label: 'Glow' },
  { value: 'wiggle', label: 'Wiggle' },
];

export const EXIT_OPTIONS: { value: ExitAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fadeOut', label: 'Fade Out' },
  { value: 'slideOutLeft', label: 'Slide Out Left' },
  { value: 'slideOutRight', label: 'Slide Out Right' },
  { value: 'slideOutUp', label: 'Slide Out Up' },
  { value: 'slideOutDown', label: 'Slide Out Down' },
  { value: 'zoomOut', label: 'Zoom Out' },
  { value: 'bounceOut', label: 'Bounce Out' },
  { value: 'flipOut', label: 'Flip Out' },
  { value: 'rotateOut', label: 'Rotate Out' },
];

// Get animation name from type
export const getAnimationName = (
  animation: EnterAnimation | EmphasisAnimation | ExitAnimation
): string => {
  return animation === 'none' ? '' : animation;
};

// Generate CSS for an element's current animation state
export const getElementAnimationStyle = (
  element: {
    enterAt: number;
    exitAt: number;
    enterAnimation: EnterAnimation;
    emphasisAnimation: EmphasisAnimation;
    exitAnimation: ExitAnimation;
    enterDuration?: number;
    emphasisDuration?: number;
    exitDuration?: number;
  },
  currentTime: number,
  sceneStartTime: number
): React.CSSProperties => {
  const localTime = currentTime - sceneStartTime;
  const enterDuration = element.enterDuration || 0.5;
  const exitDuration = element.exitDuration || 0.5;
  const emphasisDuration = element.emphasisDuration || 1;
  
  const enterStart = element.enterAt;
  const enterEnd = enterStart + enterDuration;
  const exitStart = element.exitAt - exitDuration;
  const exitEnd = element.exitAt;

  // Not visible yet
  if (localTime < enterStart) {
    return { opacity: 0, visibility: 'hidden' };
  }

  // Already exited
  if (localTime >= exitEnd) {
    return { opacity: 0, visibility: 'hidden' };
  }

  // During enter animation
  if (localTime >= enterStart && localTime < enterEnd && element.enterAnimation !== 'none') {
    return {
      animation: `${element.enterAnimation} ${enterDuration}s ease-out forwards`,
    };
  }

  // During exit animation
  if (localTime >= exitStart && localTime < exitEnd && element.exitAnimation !== 'none') {
    return {
      animation: `${element.exitAnimation} ${exitDuration}s ease-in forwards`,
    };
  }

  // During emphasis (between enter and exit)
  if (localTime >= enterEnd && localTime < exitStart && element.emphasisAnimation !== 'none') {
    return {
      animation: `${element.emphasisAnimation} ${emphasisDuration}s ease-in-out infinite`,
    };
  }

  // Visible but no animation
  return { opacity: 1 };
};

// Inject all keyframes into document
export const injectAnimationStyles = (): void => {
  const styleId = 'artifio-animation-styles';
  
  if (document.getElementById(styleId)) return;
  
  const allKeyframes = [
    ...Object.values(enterAnimations),
    ...Object.values(emphasisAnimations),
    ...Object.values(exitAnimations),
  ].filter(Boolean).join('\n');
  
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = allKeyframes;
  document.head.appendChild(styleElement);
};
