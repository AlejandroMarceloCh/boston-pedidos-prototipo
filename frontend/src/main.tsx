import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppStoreProvider } from "@/store/app-store";
import App from "./App.tsx";
import "./index.css";

// Las variables CSS las define Tailwind via fontFamily; acá solo confirmamos la base.
document.documentElement.style.setProperty(
  "--font-geist-sans",
  '"Geist Variable", system-ui, sans-serif'
);
document.documentElement.style.setProperty(
  "--font-geist-mono",
  '"Geist Mono Variable", ui-monospace, monospace'
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppStoreProvider>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter>
            <App />
            <Toaster
              position="bottom-right"
              richColors={false}
              closeButton={true}
              toastOptions={{
                style: {
                  borderRadius: "8px",
                  fontSize: "13px",
                },
              }}
            />
            <div aria-live="polite" aria-atomic="true" className="sr-only" id="sonner-announce" />
          </BrowserRouter>
        </TooltipProvider>
      </AppStoreProvider>
    </MotionConfig>
  </StrictMode>
);
