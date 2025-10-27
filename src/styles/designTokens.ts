export const designTokens = {
  colors: {
    // Brand colors (artifio.ai)
    primary: {
      yellow: '#FDB022',
      orange: '#FB923C',
      gradient: 'linear-gradient(135deg, #FDB022 0%, #FB923C 100%)',
    },
    
    // StoryShort-inspired accents
    accent: {
      purple: '#8359FF',
      pink: '#FF7AC3',
      gradient: 'linear-gradient(90deg, #8359FF 0%, #FF7AC3 100%)',
    },
    
    // Neutral
    dark: '#16161E',
    darkSurface: '#1E1E26',
    light: '#F2F2F8',
    lightSurface: '#FFFFFF',
    
    // Glassmorphism
    glassLight: 'rgba(255, 255, 255, 0.7)',
    glassDark: 'rgba(30, 30, 38, 0.7)',
  },
  
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
    xxl: '64px',
    xxxl: '96px',
    section: '120px',
  },
  
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
    md: '0 4px 16px rgba(0, 0, 0, 0.12)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.16)',
    glow: '0 0 24px rgba(253, 176, 34, 0.3)',
    glowHover: '0 0 32px rgba(253, 176, 34, 0.5)',
  },
  
  typography: {
    h1: {
      fontSize: '64px',
      lineHeight: '1.1',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '48px',
      lineHeight: '1.2',
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '32px',
      lineHeight: '1.3',
      fontWeight: '600',
    },
    body: {
      fontSize: '18px',
      lineHeight: '1.6',
      fontWeight: '400',
    },
    small: {
      fontSize: '14px',
      lineHeight: '1.5',
    },
  },
  
  animations: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};
