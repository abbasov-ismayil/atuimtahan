import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import ExamPage from "./pages/ExamPage";
import ShufflePage from "./pages/ShufflePage";
import TicketPage from "./pages/TicketPage";
import ScorePage from "./pages/ScorePage";
import MyExamsPage from "./pages/MyExamsPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, profile } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  // Admins skip onboarding
  if (!isAdmin && profile && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
                <Route path="/exam" element={<RequireAuth><ExamPage /></RequireAuth>} />
                <Route path="/shuffle" element={<RequireAuth><ShufflePage /></RequireAuth>} />
                <Route path="/ticket" element={<RequireAuth><TicketPage /></RequireAuth>} />
                <Route path="/score" element={<RequireAuth><ScorePage /></RequireAuth>} />
                <Route path="/my-exams" element={<RequireAuth><MyExamsPage /></RequireAuth>} />
                <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
              </Route>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
