/**
 * Critical CSS for above-the-fold content
 * This should be inlined in index.html <head> for fastest First Contentful Paint
 */

export const criticalCSS = `
  /* Critical reset */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Critical typography */
  body {
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: hsl(210 40% 98%);
    color: hsl(222 47% 11%);
  }

  /* Critical layout */
  #root {
    min-height: 100vh;
  }

  /* Loading spinner */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
  }

  /* Hero section (above-the-fold) */
  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Critical button styles */
  button {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
`;
