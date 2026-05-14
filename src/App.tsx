import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { SalesChat } from "@/components/SalesChat";
import { BookMeetingGate } from "@/components/BookMeetingGate";
import { PageViewTracker } from "@/components/PageViewTracker";
import { RetargetingPixel } from "@/components/RetargetingPixel";
import { AuthProvider } from "@/contexts/AuthContext";

// Eager: home + 404 (always needed)
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import CareersPage from "./pages/CareersPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import IndustriesPage from "./pages/IndustriesPage";
import MethodologyPage from "./pages/MethodologyPage";
import NewsPage from "./pages/NewsPage";
import ResourcesPage from "./pages/ResourcesPage";

// Lazy: everything else (~1.5MB → split into per-route chunks)
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const WhyUsPage = lazy(() => import("./pages/WhyUsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const DeliverablePage = lazy(() => import("./pages/DeliverablePage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const StaffEntry = lazy(() => import("./pages/StaffEntry"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AssessmentPage = lazy(() => import("./pages/AssessmentPage"));
const AIChecklistPage = lazy(() => import("./pages/AIChecklistPage"));
const ScanPage = lazy(() => import("./pages/ScanPage"));
const DiagnosticQuizPage = lazy(() => import("./pages/DiagnosticQuizPage"));
const CareersTestPage = lazy(() => import("./pages/CareersTestPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const ContentGeneratorPage = lazy(() => import("./pages/ContentGeneratorPage"));
const SalesScriptsPage = lazy(() => import("./pages/SalesScriptsPage"));
const ContentCalendarPage = lazy(() => import("./pages/ContentCalendarPage"));
const FollowUpPlanPage = lazy(() => import("./pages/FollowUpPlanPage"));
const StrategicQuestionsPage = lazy(() => import("./pages/StrategicQuestionsPage"));
const BrandContradictionsPage = lazy(() => import("./pages/BrandContradictionsPage"));
const FrictionAuditPage = lazy(() => import("./pages/FrictionAuditPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SubscriberOnboardingPage = lazy(() => import("./pages/SubscriberOnboardingPage"));
const MySubscriptionPage = lazy(() => import("./pages/MySubscriptionPage"));
const VerticalLandingPage = lazy(() => import("./pages/VerticalLandingPage"));
const CrmDemoPage = lazy(() => import("./pages/CrmDemoPage"));
const CapabilitiesPage = lazy(() => import("./pages/CapabilitiesPage"));
const LeakAuditPage = lazy(() => import("./pages/LeakAuditPage"));
const ResumeForensicsPage = lazy(() => import("./pages/ResumeForensicsPage"));
const RepPortalPage = lazy(() => import("./pages/RepPortalPage"));
const PortalPage = lazy(() => import("./pages/PortalPage"));
const LinkedInPlaybookPage = lazy(() => import("./pages/LinkedInPlaybookPage"));
const LeakReportPage = lazy(() => import("./pages/LeakReportPage"));
const NewsPostPage = lazy(() => import("./pages/NewsPostPage"));
const CredentialsPage = lazy(() => import("./pages/CredentialsPage"));
const ImplementationPage = lazy(() => import("./pages/ImplementationPage"));
const AppRouter = lazy(() => import("./app/AppRouter"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // treat data fresh for 60s
      gcTime: 5 * 60_000,       // keep cached 5min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Admin routes — isolated from AuthProvider for instant PIN-only login */}
            <Route path="/staff" element={<StaffEntry />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AuthProvider>
                  <AdminDashboard />
                </AuthProvider>
              }
            />
            {/* Revenue Recovery Engine — isolated SaaS area */}
            <Route path="/app/*" element={<AppRouter />} />
            {/* All other routes use the shared AuthProvider */}
            <Route
              path="/*"
              element={
                <AuthProvider>
                  <PageViewTracker />
                  <RetargetingPixel />
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/services" element={<ServicesPage />} />
                      <Route path="/why-us" element={<WhyUsPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/blog" element={<BlogPage />} />
                      <Route path="/blog/:slug" element={<BlogPostPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/resources" element={<ResourcesPage />} />
                      <Route path="/assessment" element={<AssessmentPage />} />
                      <Route path="/ai-implementation-checklist" element={<AIChecklistPage />} />
                      <Route path="/ai-checklist" element={<AIChecklistPage />} />
                      <Route path="/scan" element={<ScanPage />} />
                      <Route path="/business-diagnostic" element={<DiagnosticQuizPage />} />
                      <Route path="/careers" element={<CareersPage />} />
                      <Route path="/careers/test" element={<CareersTestPage />} />
                      <Route path="/careers-test" element={<CareersTestPage />} />
                      <Route path="/unsubscribe" element={<UnsubscribePage />} />
                      <Route path="/checkout/return" element={<CheckoutReturn />} />
                      <Route path="/deliverable/:token" element={<DeliverablePage />} />
                      <Route path="/content-generator" element={<ContentGeneratorPage />} />
                      <Route path="/sales-scripts" element={<SalesScriptsPage />} />
                      <Route path="/content-calendar" element={<ContentCalendarPage />} />
                      <Route path="/follow-up-plan" element={<FollowUpPlanPage />} />
                      <Route path="/strategic-questions" element={<StrategicQuestionsPage />} />
                      <Route path="/brand-contradictions" element={<BrandContradictionsPage />} />
                      <Route path="/friction-audit" element={<FrictionAuditPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/subscriber-onboarding" element={<SubscriberOnboardingPage />} />
                      <Route path="/my-subscription" element={<MySubscriptionPage />} />
                      <Route path="/industries" element={<IndustriesPage />} />
                      <Route path="/ai-for-healthcare" element={<VerticalLandingPage />} />
                      <Route path="/ai-for-finance" element={<VerticalLandingPage />} />
                      <Route path="/ai-for-logistics" element={<VerticalLandingPage />} />
                      <Route path="/ai-for-construction" element={<VerticalLandingPage />} />
                      <Route path="/ai-for-manufacturing" element={<VerticalLandingPage />} />
                      <Route path="/ai-for-saas" element={<VerticalLandingPage />} />
                      <Route path="/crm-demo" element={<CrmDemoPage />} />
                      <Route path="/capabilities" element={<CapabilitiesPage />} />
                      <Route path="/leak-audit" element={<LeakAuditPage />} />
                      <Route path="/resume-forensics" element={<ResumeForensicsPage />} />
                      <Route path="/rep-portal" element={<RepPortalPage />} />
                      <Route path="/portal" element={<PortalPage />} />
                      <Route path="/partner-portal" element={<PortalPage />} />
                      <Route path="/playbook/linkedin" element={<LinkedInPlaybookPage />} />
                      <Route path="/leak-report/:prospectId" element={<LeakReportPage />} />
                      <Route path="/news" element={<NewsPage />} />
                      <Route path="/news/:slug" element={<NewsPostPage />} />
                      <Route path="/methodology" element={<MethodologyPage />} />
                      <Route path="/credentials" element={<Navigate to="/about" replace />} />
                      <Route path="/diagnostic" element={<DiagnosticPage />} />
                      <Route path="/implementation" element={<ImplementationPage />} />
                       {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>

                  <SalesChat />
                  <BookMeetingGate />
                </AuthProvider>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
