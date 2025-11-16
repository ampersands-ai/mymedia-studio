import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { MediaProvider } from "./contexts/MediaContext";
import { Analytics } from "./components/Analytics";
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { setStatusBarStyle, isNativePlatform } from "@/utils/capacitor-utils";
import { initPostHog } from "@/lib/posthog";
import { usePostHog } from "@/hooks/usePostHog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { reportWebVitals, monitorPerformance } from "@/lib/webVitals";
import { queryClient } from "@/lib/queryClient";
import { useRoutePreload } from "./hooks/useRoutePreload";
import { logger } from "@/lib/logger";

// Lazy load pages for better performance
const IndexV2 = lazy(() => import("./pages/IndexV2"));
const IndexMinimal = lazy(() => import("./pages/IndexMinimal"));
const CreateMinimal = lazy(() => import("./pages/CreateMinimal"));
const StoryboardMinimal = lazy(() => import("./pages/StoryboardMinimal"));
const Auth = lazy(() => import("./pages/Auth"));
const Create = lazy(() => import("./pages/Create"));
const CreateWorkflow = lazy(() => import("./pages/CreateWorkflow"));
const CustomCreation = lazy(() => import("./pages/CustomCreation"));
const Settings = lazy(() => import("./pages/Settings"));
const History = lazy(() => import("./pages/dashboard/History"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Community = lazy(() => import("./pages/Community"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Features = lazy(() => import("./pages/Features"));
const Templates = lazy(() => import("./pages/Templates"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VideoStudio = lazy(() => import("./pages/VideoStudio"));
const StoryboardPage = lazy(() => import("./pages/StoryboardPage"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const AdminLayout = lazy(() => import("./layouts/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AIModelsManager = lazy(() => import("./pages/admin/AIModelsManager"));
const TemplatesManager = lazy(() => import("./pages/admin/TemplatesManager"));
const UsersManager = lazy(() => import("./pages/admin/UsersManager"));
const AllGenerations = lazy(() => import("./pages/admin/AllGenerations"));
const TokenDisputes = lazy(() => import("./pages/admin/TokenDisputes").then(m => ({ default: m.TokenDisputes })));
const AnalyticsDashboard = lazy(() => import("./pages/admin/Analytics"));
const ThresholdBreach = lazy(() => import("./pages/admin/ThresholdBreach"));
const VideoJobs = lazy(() => import("./pages/admin/VideoJobs"));
const TemplateLanding = lazy(() => import("./pages/TemplateLanding"));
const TemplateLandingManager = lazy(() => import("./pages/admin/TemplateLandingManager"));
const TemplateLandingEditor = lazy(() => import("./pages/admin/TemplateLandingEditor"));
const TemplateCategoriesManager = lazy(() => import("./pages/admin/TemplateCategoriesManager"));
const TemplateAnalytics = lazy(() => import("./pages/admin/TemplateAnalytics"));
const MigrateStoryboards = lazy(() => import("./pages/admin/MigrateStoryboards"));
const CinematicPromptsManager = lazy(() => import("./pages/admin/CinematicPromptsManager"));
const WebhookMonitor = lazy(() => import("./pages/admin/WebhookMonitor"));
const ModelHealthDashboard = lazy(() => import("./pages/admin/ModelHealthDashboard"));
const ComprehensiveModelTestPage = lazy(() => import("./pages/admin/ComprehensiveModelTestPage"));
const ModelHealthTestPage = lazy(() => import("./pages/admin/ModelHealthTestPage"));
const ModelAlerts = lazy(() => import("./pages/admin/ModelAlerts"));
const TestModelGroupPage = lazy(() => import("./pages/admin/TestModelGroupPage"));
const SharedContent = lazy(() => import("./pages/SharedContent"));
const UserLogs = lazy(() => import("./pages/admin/UserLogs"));
const EmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const EmailHistory = lazy(() => import("./pages/admin/EmailHistory").then(m => ({ default: m.EmailHistory })));
const AdvancedAnalytics = lazy(() => import("./pages/admin/AdvancedAnalytics").then(m => ({ default: m.AdvancedAnalytics })));
const DebugPanel = lazy(() => import("./components/dev/DebugPanel").then(m => ({ default: m.DebugPanel })));
const RouteErrorBoundary = lazy(() => import("./components/error/RouteErrorBoundary").then(m => ({ default: m.RouteErrorBoundary })));

const AppContent = () => {
  // Initialize PostHog
  useEffect(() => {
    initPostHog();
  }, []);

  // Use PostHog tracking
  usePostHog();

  // Preload critical routes based on auth status
  useRoutePreload();

  // Initialize performance monitoring
  useEffect(() => {
    reportWebVitals();
    monitorPerformance();
  }, []);

  // Initialize mobile app features
  useEffect(() => {
    if (!isNativePlatform()) return;

    // Set status bar style for mobile based on theme
    const isDark = document.documentElement.classList.contains('dark');
    setStatusBarStyle(isDark ? 'dark' : 'light');

    // Listen for app state changes
    let appStateListener: PluginListenerHandle | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      logger.debug('Capacitor app state changed', {
        component: 'App',
        isActive,
        operation: 'appStateListener'
      });
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
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-pulse text-foreground">Loading...</div>
          </div>
        }>
          <Analytics />
          {import.meta.env.DEV && <DebugPanel />}
              <Routes>
                <Route path="/" element={<RouteErrorBoundary routeName="Home"><IndexV2 /></RouteErrorBoundary>} />
          <Route path="/minimal" element={<RouteErrorBoundary routeName="Home Minimal"><IndexMinimal /></RouteErrorBoundary>} />
          <Route path="/create-minimal" element={<RouteErrorBoundary routeName="Create Minimal"><CreateMinimal /></RouteErrorBoundary>} />
          <Route path="/storyboard-minimal" element={<RouteErrorBoundary routeName="Storyboard Minimal"><StoryboardMinimal /></RouteErrorBoundary>} />
                <Route path="/auth" element={<RouteErrorBoundary routeName="Auth"><Auth /></RouteErrorBoundary>} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route path="create" element={<RouteErrorBoundary routeName="Dashboard > Create"><Create /></RouteErrorBoundary>} />
              <Route path="create-workflow" element={<RouteErrorBoundary routeName="Dashboard > Create Workflow"><CreateWorkflow /></RouteErrorBoundary>} />
              <Route path="custom-creation" element={<RouteErrorBoundary routeName="Dashboard > Custom Creation"><CustomCreation /></RouteErrorBoundary>} />
              <Route path="templates" element={<RouteErrorBoundary routeName="Dashboard > Templates"><Templates /></RouteErrorBoundary>} />
              <Route path="history" element={<RouteErrorBoundary routeName="Dashboard > History"><History /></RouteErrorBoundary>} />
              <Route path="video-studio" element={<RouteErrorBoundary routeName="Dashboard > Video Studio"><VideoStudio /></RouteErrorBoundary>} />
              <Route path="storyboard" element={<RouteErrorBoundary routeName="Dashboard > Storyboard"><StoryboardPage /></RouteErrorBoundary>} />
              <Route path="settings" element={<RouteErrorBoundary routeName="Dashboard > Settings"><Settings /></RouteErrorBoundary>} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<RouteErrorBoundary routeName="Admin > Dashboard"><AdminDashboard /></RouteErrorBoundary>} />
              <Route path="models" element={<RouteErrorBoundary routeName="Admin > AI Models"><AIModelsManager /></RouteErrorBoundary>} />
              <Route path="templates" element={<RouteErrorBoundary routeName="Admin > Templates"><TemplatesManager /></RouteErrorBoundary>} />
              <Route path="users" element={<RouteErrorBoundary routeName="Admin > Users"><UsersManager /></RouteErrorBoundary>} />
              <Route path="generations" element={<RouteErrorBoundary routeName="Admin > Generations"><AllGenerations /></RouteErrorBoundary>} />
              <Route path="disputes" element={<RouteErrorBoundary routeName="Admin > Token Disputes"><TokenDisputes /></RouteErrorBoundary>} />
              <Route path="analytics" element={<RouteErrorBoundary routeName="Admin > Analytics"><AnalyticsDashboard /></RouteErrorBoundary>} />
              <Route path="threshold-breach" element={<RouteErrorBoundary routeName="Admin > Threshold Breach"><ThresholdBreach /></RouteErrorBoundary>} />
              <Route path="webhook-monitor" element={<RouteErrorBoundary routeName="Admin > Webhook Monitor"><WebhookMonitor /></RouteErrorBoundary>} />
              <Route path="model-health" element={<RouteErrorBoundary routeName="Admin > Model Health"><ModelHealthDashboard /></RouteErrorBoundary>} />
              <Route path="model-health/test/:recordId" element={<RouteErrorBoundary routeName="Admin > Model Health Test"><ModelHealthTestPage /></RouteErrorBoundary>} />
              <Route path="model-health/comprehensive-test" element={<RouteErrorBoundary routeName="Admin > Comprehensive Test"><ComprehensiveModelTestPage /></RouteErrorBoundary>} />
              <Route path="model-alerts" element={<RouteErrorBoundary routeName="Admin > Model Alerts"><ModelAlerts /></RouteErrorBoundary>} />
              <Route path="test-model-group" element={<RouteErrorBoundary routeName="Admin > Test Model Group"><TestModelGroupPage /></RouteErrorBoundary>} />
              <Route path="video-jobs" element={<RouteErrorBoundary routeName="Admin > Video Jobs"><VideoJobs /></RouteErrorBoundary>} />
              <Route path="template-landing" element={<RouteErrorBoundary routeName="Admin > Template Landing"><TemplateLandingManager /></RouteErrorBoundary>} />
              <Route path="template-landing/:id" element={<RouteErrorBoundary routeName="Admin > Template Landing Editor"><TemplateLandingEditor /></RouteErrorBoundary>} />
              <Route path="template-categories" element={<RouteErrorBoundary routeName="Admin > Template Categories"><TemplateCategoriesManager /></RouteErrorBoundary>} />
              <Route path="template-analytics" element={<RouteErrorBoundary routeName="Admin > Template Analytics"><TemplateAnalytics /></RouteErrorBoundary>} />
              <Route path="migrate-storyboards" element={<RouteErrorBoundary routeName="Admin > Migrate Storyboards"><MigrateStoryboards /></RouteErrorBoundary>} />
              <Route path="cinematic-prompts" element={<RouteErrorBoundary routeName="Admin > Cinematic Prompts"><CinematicPromptsManager /></RouteErrorBoundary>} />
              <Route path="user-logs" element={<RouteErrorBoundary routeName="Admin > User Logs"><UserLogs /></RouteErrorBoundary>} />
              <Route path="email-settings" element={<RouteErrorBoundary routeName="Admin > Email Settings"><EmailSettings /></RouteErrorBoundary>} />
              <Route path="email-history" element={<RouteErrorBoundary routeName="Admin > Email History"><EmailHistory /></RouteErrorBoundary>} />
              <Route path="advanced-analytics" element={<RouteErrorBoundary routeName="Admin > Advanced Analytics"><AdvancedAnalytics /></RouteErrorBoundary>} />
            </Route>
            <Route path="/pricing" element={<RouteErrorBoundary routeName="Pricing"><Pricing /></RouteErrorBoundary>} />
            <Route path="/privacy" element={<RouteErrorBoundary routeName="Privacy"><Privacy /></RouteErrorBoundary>} />
            <Route path="/terms" element={<RouteErrorBoundary routeName="Terms"><Terms /></RouteErrorBoundary>} />
            <Route path="/community" element={<RouteErrorBoundary routeName="Community"><Community /></RouteErrorBoundary>} />
            <Route path="/about" element={<RouteErrorBoundary routeName="About"><About /></RouteErrorBoundary>} />
            <Route path="/blog" element={<RouteErrorBoundary routeName="Blog"><Blog /></RouteErrorBoundary>} />
            <Route path="/faq" element={<RouteErrorBoundary routeName="FAQ"><FAQ /></RouteErrorBoundary>} />
            <Route path="/features" element={<RouteErrorBoundary routeName="Features"><Features /></RouteErrorBoundary>} />
            <Route path="/templates" element={<Navigate to="/dashboard/templates" replace />} />
            <Route path="/templates/:category/:slug" element={<RouteErrorBoundary routeName="Template Landing"><TemplateLanding /></RouteErrorBoundary>} />
            <Route path="/share/:token" element={<RouteErrorBoundary routeName="Shared Content"><SharedContent /></RouteErrorBoundary>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<RouteErrorBoundary routeName="404 Not Found"><NotFound /></RouteErrorBoundary>} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    {import.meta.env.DEV && <ReactQueryDevtools />}
    <AuthProvider>
      <MediaProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </MediaProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
