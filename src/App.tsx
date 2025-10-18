import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { Analytics } from "./components/Analytics";
import { App as CapacitorApp } from '@capacitor/app';
import { setStatusBarStyle, isNativePlatform } from "@/utils/capacitor-utils";
import { initPostHog } from "@/lib/posthog";
import { usePostHog } from "@/hooks/usePostHog";

// Lazy load pages for better performance
const IndexV2 = lazy(() => import("./pages/IndexV2"));
const Auth = lazy(() => import("./pages/Auth"));
const Create = lazy(() => import("./pages/Create"));
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  // Initialize PostHog
  useEffect(() => {
    initPostHog();
  }, []);

  // Use PostHog tracking
  usePostHog();

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
    <div className="safe-area-container">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse text-foreground">Loading...</div>
        </div>
      }>
        <Analytics />
            <Routes>
              <Route path="/" element={<IndexV2 />} />
              <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="create" element={<Create />} />
            <Route path="custom-creation" element={<CustomCreation />} />
            <Route path="history" element={<History />} />
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
          </Route>
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/community" element={<Community />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/features" element={<Features />} />
          <Route path="/templates" element={<Templates />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
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
