import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { Analytics } from "./components/Analytics";
import { App as CapacitorApp } from '@capacitor/app';
import { setStatusBarStyle, isNativePlatform } from "@/utils/capacitor-utils";
import { usePostHog } from "@/hooks/usePostHog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { reportWebVitals, monitorPerformance } from "@/lib/webVitals";
import { queryClient } from "@/lib/queryClient";
import { useRoutePreload } from "./hooks/useRoutePreload";

// Direct imports - no lazy loading to prevent "Loading app..." hang
import IndexV2 from "./pages/IndexV2";
import Auth from "./pages/Auth";
import Create from "./pages/Create";
import CreateWorkflow from "./pages/CreateWorkflow";
import CustomCreation from "./pages/CustomCreation";
import Settings from "./pages/Settings";
import History from "./pages/dashboard/History";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Community from "./pages/Community";
import About from "./pages/About";
import Blog from "./pages/Blog";
import FAQ from "./pages/FAQ";
import Features from "./pages/Features";
import Templates from "./pages/Templates";
import NotFound from "./pages/NotFound";
import VideoStudio from "./pages/VideoStudio";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AIModelsManager from "./pages/admin/AIModelsManager";
import TemplatesManager from "./pages/admin/TemplatesManager";
import UsersManager from "./pages/admin/UsersManager";
import AllGenerations from "./pages/admin/AllGenerations";
import { TokenDisputes } from "./pages/admin/TokenDisputes";
import AnalyticsDashboard from "./pages/admin/Analytics";
import ThresholdBreach from "./pages/admin/ThresholdBreach";
import VideoJobs from "./pages/admin/VideoJobs";
import TemplateLanding from "./pages/TemplateLanding";
import TemplateLandingManager from "./pages/admin/TemplateLandingManager";
import TemplateLandingEditor from "./pages/admin/TemplateLandingEditor";
import TemplateCategoriesManager from "./pages/admin/TemplateCategoriesManager";
import TemplateAnalytics from "./pages/admin/TemplateAnalytics";
import SharedContent from "./pages/SharedContent";

const AppContent = () => {
  // Use PostHog tracking (initialized in main.tsx)
  usePostHog();

  // Preload critical routes based on auth status
  useRoutePreload();

  // Initialize performance monitoring (initialized in main.tsx)
  useEffect(() => {
    reportWebVitals();
    monitorPerformance();
  }, []);

  // Initialize mobile app features
  useEffect(() => {
    if (!isNativePlatform()) return;

    // Set status bar style for mobile
    setStatusBarStyle('dark');

    // Listen for app state changes
    let appStateListener: any;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
    }).then(listener => {
      appStateListener = listener;
    });

    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="safe-area-container">
        <ScrollProgress />
        <Analytics />
        <Routes>
          <Route path="/" element={<IndexV2 />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="create" element={<Create />} />
            <Route path="create-workflow" element={<CreateWorkflow />} />
            <Route path="custom-creation" element={<CustomCreation />} />
            <Route path="templates" element={<Templates />} />
            <Route path="history" element={<History />} />
            <Route path="video-studio" element={<VideoStudio />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="models" element={<AIModelsManager />} />
            <Route path="templates" element={<TemplatesManager />} />
            <Route path="users" element={<UsersManager />} />
            <Route path="generations" element={<AllGenerations />} />
            <Route path="disputes" element={<TokenDisputes />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="threshold-breach" element={<ThresholdBreach />} />
            <Route path="video-jobs" element={<VideoJobs />} />
            <Route path="template-landing" element={<TemplateLandingManager />} />
            <Route path="template-landing/:id" element={<TemplateLandingEditor />} />
            <Route path="template-categories" element={<TemplateCategoriesManager />} />
            <Route path="template-analytics" element={<TemplateAnalytics />} />
          </Route>
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/community" element={<Community />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/features" element={<Features />} />
          <Route path="/templates" element={<Navigate to="/dashboard/templates" replace />} />
          <Route path="/templates/:category/:slug" element={<TemplateLanding />} />
          <Route path="/share/:token" element={<SharedContent />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    {import.meta.env.DEV && <ReactQueryDevtools />}
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
