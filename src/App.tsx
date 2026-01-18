import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { MediaProvider } from "./contexts/MediaContext";
import { Analytics } from "./components/Analytics";
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { setStatusBarStyle, isNativePlatform } from "@/utils/capacitor-utils";
import { usePostHog } from "@/hooks/usePostHog";
import { CookieConsentBanner } from "@/components/gdpr/CookieConsentBanner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { reportWebVitals, monitorPerformance } from "@/lib/webVitals";
import { queryClient } from "@/lib/queryClient";
import { useRoutePreload } from "./hooks/useRoutePreload";
import { logger } from "@/lib/logger";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Lazy load pages for better performance
const IndexV2 = lazy(() => import("./pages/IndexV2"));
const IndexMinimal = lazy(() => import("./pages/IndexMinimal"));
const CreateMinimal = lazy(() => import("./pages/CreateMinimal"));
const StoryboardMinimal = lazy(() => import("./pages/StoryboardMinimal"));
const Auth = lazy(() => import("./pages/Auth"));

const CreateWorkflow = lazy(() => import("./pages/CreateWorkflow"));
const CustomCreation = lazy(() => import("./pages/CustomCreation"));
const Settings = lazy(() => import("./pages/Settings"));
const History = lazy(() => import("./pages/dashboard/History"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Community = lazy(() => import("./pages/Community"));
const About = lazy(() => import("./pages/About"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Help = lazy(() => import("./pages/Help"));
const Features = lazy(() => import("./pages/Features"));
const Templates = lazy(() => import("./pages/Templates"));
const PromptLibrary = lazy(() => import("./pages/PromptLibrary"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VideoStudio = lazy(() => import("./pages/VideoStudio"));
const MusicStudioPage = lazy(() => import("./pages/MusicStudioPage"));
const StoryboardPage = lazy(() => import("./pages/StoryboardPage"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const AdminLayout = lazy(() => import("./layouts/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AIModelsDashboard = lazy(() => import("./pages/admin/AIModelsDashboard"));
const TemplatesManager = lazy(() => import("./pages/admin/TemplatesManager"));
const UsersManager = lazy(() => import("./pages/admin/UsersManager"));
const UserGenerations = lazy(() => import("./pages/admin/UserGenerations"));
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
const TestModelGroupPage = lazy(() => import("./pages/admin/TestModelGroupPage"));
const SharedContent = lazy(() => import("./pages/SharedContent"));
const UserLogs = lazy(() => import("./pages/admin/UserLogs"));
const EmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const EmailHistory = lazy(() => import("./pages/admin/EmailHistory").then(m => ({ default: m.EmailHistory })));
const AdvancedAnalytics = lazy(() => import("./pages/admin/AdvancedAnalytics").then(m => ({ default: m.AdvancedAnalytics })));
const CreateBlog = lazy(() => import("./pages/admin/CreateBlog"));
const ComprehensiveModelTester = lazy(() => import("./pages/admin/ComprehensiveModelTester"));
const VaultSetup = lazy(() => import("./pages/admin/VaultSetup"));
const ModelPricing = lazy(() => import("./pages/admin/ModelPricing"));
const FeatureSettings = lazy(() => import("./pages/admin/FeatureSettings"));
const SecurityDashboard = lazy(() => import("./pages/admin/SecurityDashboard"));
const CinematicTest = lazy(() => import("./pages/CinematicTest"));
const ModelDirectory = lazy(() => import("./pages/ModelDirectory"));
const ModelLanding = lazy(() => import("./pages/ModelLanding"));
const ModelPagesManager = lazy(() => import("./pages/admin/ModelPagesManager"));
const ModelPageEditor = lazy(() => import("./pages/admin/ModelPageEditor"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ModerationDocs = lazy(() => import("./pages/ModerationDocs"));
const ModerationDashboard = lazy(() => import("./pages/admin/ModerationDashboard"));
const AnimationPage = lazy(() => import("./pages/AnimationPage"));
const VideoEditorPage = lazy(() => import("./pages/VideoEditorPage"));
const AnimationEditorPage = lazy(() => import("./pages/AnimationEditorPage"));
const BackgroundLibrary = lazy(() => import("./pages/BackgroundLibrary"));
const BackgroundGenerator = lazy(() => import("./pages/BackgroundGenerator"));
const DebugPanel = lazy(() => import("./components/dev/DebugPanel").then(m => ({ default: m.DebugPanel })));
const RouteErrorBoundary = lazy(() => import("./components/error/RouteErrorBoundary").then(m => ({ default: m.RouteErrorBoundary })));
const AppContent = () => {
  // Initialize PostHog only if consent was given (handled by CookieConsentBanner)
  // PostHog initialization moved to CookieConsentBanner for GDPR compliance

  // Use PostHog tracking (will only work if initialized)
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

    const setupAppStateListener = async () => {
      try {
        appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          logger.debug('Capacitor app state changed', {
            component: 'App',
            isActive,
            operation: 'appStateListener'
          });
        });
      } catch (err) {
        logger.error('Failed to setup app state listener', err as Error, {
          component: 'App',
          operation: 'setupAppStateListener'
        });
      }
    };

    setupAppStateListener();

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
            <div className="flex items-center gap-3 animate-pulse">
              <span className="font-black text-2xl md:text-3xl text-foreground">
                artifio.ai
              </span>
            </div>
          </div>
        }>
          <Analytics />
          {import.meta.env.DEV && <DebugPanel />}
              <Routes>
                <Route path="/" element={<RouteErrorBoundary routeName="Home"><CinematicTest /></RouteErrorBoundary>} />
                <Route path="/old-home" element={<RouteErrorBoundary routeName="Old Home"><IndexV2 /></RouteErrorBoundary>} />
          <Route path="/minimal" element={<RouteErrorBoundary routeName="Home Minimal"><IndexMinimal /></RouteErrorBoundary>} />
          <Route path="/create-minimal" element={<RouteErrorBoundary routeName="Create Minimal"><CreateMinimal /></RouteErrorBoundary>} />
          <Route path="/storyboard-minimal" element={<RouteErrorBoundary routeName="Storyboard Minimal"><StoryboardMinimal /></RouteErrorBoundary>} />
                <Route path="/auth" element={<RouteErrorBoundary routeName="Auth"><Auth /></RouteErrorBoundary>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              
              <Route path="create-workflow" element={<RouteErrorBoundary routeName="Dashboard > Create Workflow"><CreateWorkflow /></RouteErrorBoundary>} />
              <Route path="custom-creation" element={<RouteErrorBoundary routeName="Dashboard > Custom Creation"><CustomCreation /></RouteErrorBoundary>} />
              <Route path="templates" element={<RouteErrorBoundary routeName="Dashboard > Templates"><Templates /></RouteErrorBoundary>} />
              <Route path="history" element={<RouteErrorBoundary routeName="Dashboard > History"><History /></RouteErrorBoundary>} />
              <Route path="video-studio" element={<RouteErrorBoundary routeName="Dashboard > Video Studio"><VideoStudio /></RouteErrorBoundary>} />
              <Route path="music-studio" element={<RouteErrorBoundary routeName="Dashboard > Music Studio"><MusicStudioPage /></RouteErrorBoundary>} />
              <Route path="storyboard" element={<RouteErrorBoundary routeName="Dashboard > Storyboard"><StoryboardPage /></RouteErrorBoundary>} />
              <Route path="settings" element={<RouteErrorBoundary routeName="Dashboard > Settings"><Settings /></RouteErrorBoundary>} />
              <Route path="prompts" element={<RouteErrorBoundary routeName="Dashboard > Prompt Library"><PromptLibrary /></RouteErrorBoundary>} />
              <Route path="video-editor" element={<RouteErrorBoundary routeName="Dashboard > Video Editor"><VideoEditorPage /></RouteErrorBoundary>} />
              <Route path="backgrounds" element={<RouteErrorBoundary routeName="Dashboard > Background Library"><BackgroundLibrary /></RouteErrorBoundary>} />
              <Route path="generator" element={<RouteErrorBoundary routeName="Dashboard > Background Generator"><BackgroundGenerator /></RouteErrorBoundary>} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<RouteErrorBoundary routeName="Admin > Dashboard"><AdminDashboard /></RouteErrorBoundary>} />
              <Route path="models" element={<RouteErrorBoundary routeName="Admin > AI Models"><AIModelsDashboard /></RouteErrorBoundary>} />
              <Route path="templates" element={<RouteErrorBoundary routeName="Admin > Templates"><TemplatesManager /></RouteErrorBoundary>} />
              <Route path="users" element={<RouteErrorBoundary routeName="Admin > Users"><UsersManager /></RouteErrorBoundary>} />
              <Route path="users/:userId/generations" element={<RouteErrorBoundary routeName="Admin > User Generations"><UserGenerations /></RouteErrorBoundary>} />
              <Route path="generations" element={<RouteErrorBoundary routeName="Admin > Generations"><AllGenerations /></RouteErrorBoundary>} />
              <Route path="disputes" element={<RouteErrorBoundary routeName="Admin > Token Disputes"><TokenDisputes /></RouteErrorBoundary>} />
              <Route path="analytics" element={<RouteErrorBoundary routeName="Admin > Analytics"><AnalyticsDashboard /></RouteErrorBoundary>} />
              <Route path="threshold-breach" element={<RouteErrorBoundary routeName="Admin > Threshold Breach"><ThresholdBreach /></RouteErrorBoundary>} />
              <Route path="webhook-monitor" element={<RouteErrorBoundary routeName="Admin > Webhook Monitor"><WebhookMonitor /></RouteErrorBoundary>} />
              <Route path="test-model-group" element={<RouteErrorBoundary routeName="Admin > Test Model Group"><TestModelGroupPage /></RouteErrorBoundary>} />
              <Route path="comprehensive-model-tester" element={<RouteErrorBoundary routeName="Admin > Comprehensive Model Tester"><ComprehensiveModelTester /></RouteErrorBoundary>} />
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
              <Route path="blog/create" element={<RouteErrorBoundary routeName="Admin > Create Blog"><CreateBlog /></RouteErrorBoundary>} />
              <Route path="vault-setup" element={<RouteErrorBoundary routeName="Admin > Vault Setup"><VaultSetup /></RouteErrorBoundary>} />
              <Route path="model-pricing" element={<RouteErrorBoundary routeName="Admin > Model Pricing"><ModelPricing /></RouteErrorBoundary>} />
              <Route path="feature-settings" element={<RouteErrorBoundary routeName="Admin > Feature Settings"><FeatureSettings /></RouteErrorBoundary>} />
              <Route path="security" element={<RouteErrorBoundary routeName="Admin > Security"><SecurityDashboard /></RouteErrorBoundary>} />
              <Route path="moderation" element={<RouteErrorBoundary routeName="Admin > Moderation"><ModerationDashboard /></RouteErrorBoundary>} />
              <Route path="model-pages" element={<RouteErrorBoundary routeName="Admin > Model Pages"><ModelPagesManager /></RouteErrorBoundary>} />
              <Route path="model-pages/:id" element={<RouteErrorBoundary routeName="Admin > Model Page Editor"><ModelPageEditor /></RouteErrorBoundary>} />
            </Route>
            <Route path="/pricing" element={<RouteErrorBoundary routeName="Pricing"><Pricing /></RouteErrorBoundary>} />
            <Route path="/privacy" element={<RouteErrorBoundary routeName="Privacy"><Privacy /></RouteErrorBoundary>} />
            <Route path="/terms" element={<RouteErrorBoundary routeName="Terms"><Terms /></RouteErrorBoundary>} />
            <Route path="/community" element={<RouteErrorBoundary routeName="Community"><Community /></RouteErrorBoundary>} />
            <Route path="/about" element={<RouteErrorBoundary routeName="About"><About /></RouteErrorBoundary>} />
            <Route path="/blog" element={<RouteErrorBoundary routeName="Blog List"><BlogList /></RouteErrorBoundary>} />
            <Route path="/blog/:slug" element={<RouteErrorBoundary routeName="Blog Post"><BlogPost /></RouteErrorBoundary>} />
            <Route path="/faq" element={<RouteErrorBoundary routeName="FAQ"><FAQ /></RouteErrorBoundary>} />
            <Route path="/help" element={<RouteErrorBoundary routeName="Help"><Help /></RouteErrorBoundary>} />
            <Route path="/features" element={<RouteErrorBoundary routeName="Features"><Features /></RouteErrorBoundary>} />
            <Route path="/templates" element={<Navigate to="/dashboard/templates" replace />} />
            <Route path="/custom-creation" element={<Navigate to="/dashboard/custom-creation" replace />} />
            <Route path="/templates/:category/:slug" element={<RouteErrorBoundary routeName="Template Landing"><TemplateLanding /></RouteErrorBoundary>} />
            <Route path="/models" element={<RouteErrorBoundary routeName="Model Directory"><ModelDirectory /></RouteErrorBoundary>} />
            <Route path="/models/:slug" element={<RouteErrorBoundary routeName="Model Landing"><ModelLanding /></RouteErrorBoundary>} />
            <Route path="/share/:token" element={<RouteErrorBoundary routeName="Shared Content"><SharedContent /></RouteErrorBoundary>} />
            <Route path="/verify-email" element={<RouteErrorBoundary routeName="Verify Email"><VerifyEmail /></RouteErrorBoundary>} />
            <Route path="/forgot-password" element={<RouteErrorBoundary routeName="Forgot Password"><ForgotPassword /></RouteErrorBoundary>} />
            <Route path="/reset-password" element={<RouteErrorBoundary routeName="Reset Password"><ResetPassword /></RouteErrorBoundary>} />
            <Route path="/moderation-docs" element={<RouteErrorBoundary routeName="Moderation Docs"><ModerationDocs /></RouteErrorBoundary>} />
            <Route path="/animation-page" element={<ProtectedRoute><RouteErrorBoundary routeName="Animation Page"><AnimationPage /></RouteErrorBoundary></ProtectedRoute>} />
            <Route path="/animation-editor" element={<ProtectedRoute><RouteErrorBoundary routeName="Animation Editor"><AnimationEditorPage /></RouteErrorBoundary></ProtectedRoute>} />
            <Route path="/backgrounds" element={<Navigate to="/dashboard/backgrounds" replace />} />
            <Route path="/generator" element={<Navigate to="/dashboard/generator" replace />} />
            <Route path="/cinematic-test" element={<Navigate to="/" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<RouteErrorBoundary routeName="404 Not Found"><NotFound /></RouteErrorBoundary>} />
          </Routes>
          <CookieConsentBanner />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      {import.meta.env.DEV && <ReactQueryDevtools />}
      <AuthProvider>
        <MediaProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </MediaProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
