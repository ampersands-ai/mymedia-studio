import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SplashCursor } from "./components/SplashCursor";
import { Analytics } from "./components/Analytics";
import { GlobalHeader } from "./components/GlobalHeader";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Create from "./pages/Create";
import CustomCreation from "./pages/CustomCreation";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AIModelsManager from "./pages/admin/AIModelsManager";
import TemplatesManager from "./pages/admin/TemplatesManager";
import UsersManager from "./pages/admin/UsersManager";
import { useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  const showCursor = !location.pathname.startsWith("/dashboard");
  const isDashboardRoute = location.pathname.startsWith("/dashboard");

  return (
    <>
      {showCursor && <SplashCursor />}
      <Analytics />
      {user && isDashboardRoute && <GlobalHeader />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="create" element={<Create />} />
          <Route path="custom-creation" element={<CustomCreation />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="models" element={<AIModelsManager />} />
          <Route path="templates" element={<TemplatesManager />} />
          <Route path="users" element={<UsersManager />} />
        </Route>
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
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
