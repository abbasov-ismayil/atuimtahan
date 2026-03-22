import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "@/components/layout/Layout";
import AuthPage from "./pages/AuthPage";

// Lazy load non-critical routes
const Index = lazy(() => import("./pages/Index"));
const ExamPage = lazy(() => import("./pages/ExamPage"));
const ShufflePage = lazy(() => import("./pages/ShufflePage"));
const TicketPage = lazy(() => import("./pages/TicketPage"));
const ScorePage = lazy(() => import("./pages/ScorePage"));
const MyExamsPage = lazy(() => import("./pages/MyExamsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
                  <Route path="/exam" element={<RequireAuth><ExamPage /></RequireAuth>} />
                  <Route path="/shuffle" element={<RequireAuth><ShufflePage /></RequireAuth>} />
                  <Route path="/ticket" element={<RequireAuth><TicketPage /></RequireAuth>} />
                  <Route path="/score" element={<RequireAuth><ScorePage /></RequireAuth>} />
                  <Route path="/my-exams" element={<RequireAuth><MyExamsPage /></RequireAuth>} />
                  <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
                  <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                </Route>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
