import { Suspense, lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { SmartLoader } from "@/components/ui/smart-loader";
import { TokenDisputes } from "@/pages/admin/TokenDisputes";

// Lazy load routes for better performance
const IndexV2 = lazy(() => import("@/pages/IndexV2"));
const VideoStudio = lazy(() => import("@/pages/VideoStudio"));
const Auth = lazy(() => import("@/pages/Auth"));
const Templates = lazy(() => import("@/pages/Templates"));
const TemplateLanding = lazy(() => import("@/pages/TemplateLanding"));
const Create = lazy(() => import("@/pages/Create"));
const CreateWorkflow = lazy(() => import("@/pages/CreateWorkflow"));
const CustomCreation = lazy(() => import("@/pages/CustomCreation"));
const Playground = lazy(() => import("@/pages/Playground"));
const History = lazy(() => import("@/pages/dashboard/History"));
const Settings = lazy(() => import("@/pages/Settings"));
const SharedContent = lazy(() => import("@/pages/SharedContent"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Features = lazy(() => import("@/pages/Features"));
const About = lazy(() => import("@/pages/About"));
const Blog = lazy(() => import("@/pages/Blog"));
const Community = lazy(() => import("@/pages/Community"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Admin routes
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const TemplatesManager = lazy(() => import("@/pages/admin/TemplatesManager"));
const AIModelsManager = lazy(() => import("@/pages/admin/AIModelsManager"));
const UsersManager = lazy(() => import("@/pages/admin/UsersManager"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const TemplateAnalytics = lazy(() => import("@/pages/admin/TemplateAnalytics"));
const AllGenerations = lazy(() => import("@/pages/admin/AllGenerations"));
const VideoJobs = lazy(() => import("@/pages/admin/VideoJobs"));
const ThresholdBreach = lazy(() => import("@/pages/admin/ThresholdBreach"));
const TemplateCategoriesManager = lazy(() => import("@/pages/admin/TemplateCategoriesManager"));
const TemplateLandingManager = lazy(() => import("@/pages/admin/TemplateLandingManager"));
const TemplateLandingEditor = lazy(() => import("@/pages/admin/TemplateLandingEditor"));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<SmartLoader />}>
              <Routes>
                <Route path="/" element={<IndexV2 />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/template/:slug" element={<TemplateLanding />} />
                <Route path="/create" element={<Create />} />
                <Route path="/create-workflow" element={<CreateWorkflow />} />
                <Route path="/custom/:templateId" element={<CustomCreation />} />
                <Route path="/playground" element={<Playground />} />
                <Route path="/dashboard/history" element={<History />} />
                <Route path="/dashboard/video-studio" element={<VideoStudio />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/shared/:shareId" element={<SharedContent />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/features" element={<Features />} />
                <Route path="/about" element={<About />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/community" element={<Community />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/templates" element={<TemplatesManager />} />
                <Route path="/admin/models" element={<AIModelsManager />} />
                <Route path="/admin/users" element={<UsersManager />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/template-analytics" element={<TemplateAnalytics />} />
                <Route path="/admin/generations" element={<AllGenerations />} />
                <Route path="/admin/video-jobs" element={<VideoJobs />} />
                <Route path="/admin/token-disputes" element={<TokenDisputes />} />
                <Route path="/admin/threshold-breach" element={<ThresholdBreach />} />
                <Route path="/admin/categories" element={<TemplateCategoriesManager />} />
                <Route path="/admin/template-landings" element={<TemplateLandingManager />} />
                <Route path="/admin/template-landing/:id" element={<TemplateLandingEditor />} />
                
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
