import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, unregisterServiceWorker } from "./lib/serviceWorker";

// Register service worker (production only)
registerServiceWorker();

// Auto-unregister in dev mode
unregisterServiceWorker();

const container = document.getElementById("root")!;
if (container && container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
