import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import RequestAccess from "./pages/RequestAccess";
import CompleteAccount from "./pages/CompleteAccount";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import CreateUser from "./pages/CreateUser";
import InviteUser from "./pages/InviteUser";
import AdminApprovals from "./pages/AdminApprovals";
import OnboardingJourneys from "./pages/OnboardingJourneys";
import Settings from "./pages/Settings";
import Content from "./pages/Content";
import LeadSubmission from "./pages/LeadSubmission";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/request-access" element={<RequestAccess />} />
            <Route path="/complete-account" element={<CompleteAccount />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/create-user" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <Layout>
                  <CreateUser />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/invite-user" element={
              <ProtectedRoute requireApproval>
                <Layout>
                  <InviteUser />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/approvals" element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <AdminApprovals />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/onboarding-journeys" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <Layout>
                  <OnboardingJourneys />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/content" element={
              <ProtectedRoute>
                <Layout>
                  <Content />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/lead-submission" element={
              <ProtectedRoute>
                <Layout>
                  <LeadSubmission />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
