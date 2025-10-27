import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { forceUnregisterServiceWorker } from "./lib/serviceWorker";

// Force cleanup of any legacy service worker and caches before boot
forceUnregisterServiceWorker().catch(() => {});

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

const root = createRoot(container);
root.render(<App />);

(window as any).__APP_MOUNTED = true;
