import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { SalesChat } from "@/components/SalesChat";

const SalesChatGate = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/aetheris-iq") || pathname.startsWith("/aetheris-ai") || pathname === "/iq") return null;
  // Hide the site-wide Nexus bubble inside the new rep/partner portal —
  // the Coach tab there is now the unified Advisor + Coach + Trainer + Nexus chat.
  if (pathname.startsWith("/portal/new") || pathname.startsWith("/partner-portal/new")) return null;
  // Admin surface has its own Operator Assistant; don't stack two floating chats.
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;
  return <SalesChat />;
};
import { BookMeetingGate } from "@/components/BookMeetingGate";
import { LimitedOfferPopup } from "@/components/LimitedOfferPopup";
import { PageViewTracker } from "@/components/PageViewTracker";
import { RetargetingPixel } from "@/components/RetargetingPixel";
import { AuthProvider } from "@/contexts/AuthContext";

import { FloatingWorkbench } from "@/components/workbench/FloatingWorkbench";
import { ToolBuyBar } from "@/components/ToolBuyBar";


// Eager: home + 404 (always needed)
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

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
const HeadToHeadPage = lazy(() => import("./pages/HeadToHeadPage"));
const ReciprocationPage = lazy(() => import("./pages/ReciprocationPage"));
const GoldenReportPage = lazy(() => import("./pages/GoldenReportPage"));
const TechSolutionsPage = lazy(() => import("./pages/TechSolutionsPage"));
const ToolInfoPage = lazy(() => import("./pages/ToolInfoPage"));
const DiagnosticQuizPage = lazy(() => import("./pages/DiagnosticQuizPage"));
const CareersTestPage = lazy(() => import("./pages/CareersTestPage"));
const CareersLicensePage = lazy(() => import("./pages/CareersLicensePage"));
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

const LeakLanderPage = lazy(() => import("./pages/LeakLanderPage"));
const ResumeForensicsPage = lazy(() => import("./pages/ResumeForensicsPage"));
const RepPortalPage = lazy(() => import("./pages/RepPortalPage"));
const TestPortalPage = lazy(() => import("./pages/TestPortalPage"));
const DetectiveModePage = lazy(() => import("./pages/DetectiveModePage"));
const EcosystemPage = lazy(() => import("./pages/EcosystemPage"));
const PortalPage = lazy(() => import("./pages/PortalPage"));
const NewPortalPage = lazy(() => import("./pages/NewPortalPage"));
const LinkedInPlaybookPage = lazy(() => import("./pages/LinkedInPlaybookPage"));
const LeakReportPage = lazy(() => import("./pages/LeakReportPage"));
const NewsPostPage = lazy(() => import("./pages/NewsPostPage"));
const CredentialsPage = lazy(() => import("./pages/CredentialsPage"));
const ImplementationPage = lazy(() => import("./pages/ImplementationPage"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const LocationPage = lazy(() => import("./pages/LocationPage"));
const ExtensionPage = lazy(() => import("./pages/ExtensionPage"));
const BrandVoiceExtensionPage = lazy(() => import("./pages/BrandVoiceExtensionPage"));
const OperatorAppPage = lazy(() => import("./pages/OperatorAppPage"));
const MobileAppPage = lazy(() => import("./pages/MobileAppPage"));
const AppRouter = lazy(() => import("./app/AppRouter"));
const AuthorityArticlePage = lazy(() => import("./pages/AuthorityArticlePage"));
const GlossaryPage = lazy(() => import("./pages/GlossaryPage"));
const ForensicReportAskPage = lazy(() => import("./pages/ForensicReportAskPage"));
const NexusIQPage = lazy(() => import("./pages/NexusIQPage"));
const AetherisNexusPage = lazy(() => import("./pages/AetherisNexusPage"));
const CaseStudiesPage = lazy(() => import("./pages/CaseStudiesPage"));
const RepToolLinkPage = lazy(() => import("./pages/RepToolLinkPage"));
const ChaosScanPage = lazy(() => import("./pages/ChaosScanPage"));
const ToolsShopRedeemPage = lazy(() => import("./pages/ToolsShopRedeemPage"));
const ToolsShopReturnPage = lazy(() => import("./pages/ToolsShopReturnPage"));
const TryToolPage = lazy(() => import("./pages/TryToolPage"));

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
            {/* Admin routes, isolated from AuthProvider for instant PIN-only login */}
            <Route path="/staff" element={<StaffEntry />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AuthProvider>
                  <AdminDashboard />
                  <FloatingWorkbench />
                </AuthProvider>
              }
            />

            {/* Revenue Recovery Engine, isolated SaaS area */}
            <Route path="/app/*" element={<AppRouter />} />
            {/* All other routes use the shared AuthProvider */}
            <Route
              path="/*"
              element={
                <AuthProvider>
                  <PageViewTracker />
                  <RetargetingPixel />
                  <FloatingWorkbench />
                  <ToolBuyBar />



                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<LeakLanderPage />} />
                      <Route path="/home" element={<Navigate to="/" replace />} />
                      <Route path="/services" element={<ServicesPage />} />
                      <Route path="/catalog" element={<Navigate to="/diagnostic" replace />} />
                      <Route path="/bundles" element={<Navigate to="/diagnostic" replace />} />
                      <Route path="/why-us" element={<WhyUsPage />} />
                      <Route path="/about" element={<Navigate to="/" replace />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/blog" element={<BlogPage />} />
                      <Route path="/blog/:slug" element={<BlogPostPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/resources" element={<ResourcesPage />} />
                      <Route path="/assessment" element={<AssessmentPage />} />
                      <Route path="/ai-implementation-checklist" element={<AIChecklistPage />} />
                      <Route path="/ai-checklist" element={<AIChecklistPage />} />
                      <Route path="/scan" element={<ScanPage />} />
                      <Route path="/chaos-scan" element={<ChaosScanPage />} />
                      <Route path="/head-to-head" element={<HeadToHeadPage />} />
                      <Route path="/vs" element={<Navigate to="/head-to-head" replace />} />
                      <Route path="/reciprocation" element={<ReciprocationPage />} />
                      <Route path="/gift" element={<Navigate to="/reciprocation" replace />} />
                      <Route path="/golden-report" element={<GoldenReportPage />} />
                      <Route path="/golden" element={<Navigate to="/golden-report" replace />} />
                      <Route path="/business-diagnostic" element={<DiagnosticQuizPage />} />
                      <Route path="/careers" element={<CareersPage />} />
                      <Route path="/careers/test" element={<CareersTestPage />} />
                      <Route path="/careers-test" element={<CareersTestPage />} />
                      <Route path="/careers/license" element={<CareersLicensePage />} />
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
                      <Route path="/nexus-iq" element={<NexusIQPage />} />
                      <Route path="/aetheris-ai" element={<AetherisNexusPage />} />
                      <Route path="/aetheris-ai/:threadId" element={<AetherisNexusPage />} />
                      <Route path="/aetheris-iq" element={<AetherisNexusPage />} />
                      <Route path="/aetheris-iq/:threadId" element={<AetherisNexusPage />} />
                      <Route path="/iq" element={<Navigate to="/aetheris-iq" replace />} />
                      <Route path="/t/:repCode/:toolSlug" element={<RepToolLinkPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/subscriber-onboarding" element={<SubscriberOnboardingPage />} />
                      <Route path="/my-subscription" element={<MySubscriptionPage />} />
                      <Route path="/industries" element={<IndustriesPage />} />
                      <Route path="/case-studies" element={<CaseStudiesPage />} />
                      <Route path="/ai-for-:slug" element={<VerticalLandingPage />} />
                      <Route path="/crm-demo" element={<CrmDemoPage />} />
                      <Route path="/capabilities" element={<CapabilitiesPage />} />
                      <Route path="/leak-audit" element={<Navigate to="/diagnostic" replace />} />
                      <Route path="/lander" element={<LeakLanderPage />} />
                      <Route path="/resume-forensics" element={<ResumeForensicsPage />} />
                      <Route path="/rep-portal" element={<RepPortalPage />} />
                      <Route path="/test-portal" element={<TestPortalPage />} />
                      <Route path="/demo" element={<Navigate to="/test-portal" replace />} />
                      <Route path="/demo-portal" element={<Navigate to="/test-portal" replace />} />
                      <Route path="/portal-demo" element={<Navigate to="/test-portal" replace />} />
                      <Route path="/sandbox" element={<Navigate to="/test-portal" replace />} />
                      <Route path="/detective" element={<DetectiveModePage />} />
                      <Route path="/detective-mode" element={<DetectiveModePage />} />
                      <Route path="/ecosystem" element={<EcosystemPage />} />
                      <Route path="/team" element={<Navigate to="/ecosystem" replace />} />
                      <Route path="/tools" element={<Navigate to="/ecosystem" replace />} />
                      <Route path="/tools-shop" element={<Navigate to="/" replace />} />
                      <Route path="/tools-shop/redeem" element={<ToolsShopRedeemPage />} />
                      <Route path="/tools-shop/return" element={<ToolsShopReturnPage />} />
                      <Route path="/try/:toolId" element={<TryToolPage />} />
                      <Route path="/tech-solutions" element={<TechSolutionsPage />} />
                      <Route path="/tech" element={<Navigate to="/tech-solutions" replace />} />

                      {/* Reps now log into the new portal by default. Old portal preserved for admins only at /portal/legacy. */}
                      <Route path="/portal" element={<NewPortalPage />} />
                      <Route path="/portal/new" element={<Navigate to="/portal" replace />} />
                      <Route path="/portal/legacy" element={<PortalPage />} />
                      <Route path="/partner-portal" element={<NewPortalPage />} />
                      <Route path="/partner-portal/new" element={<Navigate to="/partner-portal" replace />} />
                      <Route path="/partner-portal/legacy" element={<PortalPage />} />
                      <Route path="/playbook/linkedin" element={<LinkedInPlaybookPage />} />
                      <Route path="/leak-report/:prospectId" element={<LeakReportPage />} />
                      <Route path="/news" element={<NewsPage />} />
                      <Route path="/news/:slug" element={<NewsPostPage />} />
                      <Route path="/methodology" element={<MethodologyPage />} />
                      <Route path="/credentials" element={<Navigate to="/" replace />} />
                      <Route path="/diagnostic" element={<DiagnosticPage />} />
                      <Route path="/implementation" element={<ImplementationPage />} />
                      <Route path="/indianapolis" element={<LocationPage />} />
                      <Route path="/indiana" element={<LocationPage />} />
                      <Route path="/extension" element={<ExtensionPage />} />
                      <Route path="/brand-voice-extension" element={<BrandVoiceExtensionPage />} />
                      <Route path="/brand-voice" element={<Navigate to="/brand-voice-extension" replace />} />
                      <Route path="/mobile-app" element={<MobileAppPage />} />
                      <Route path="/operator-app" element={<OperatorAppPage />} />
                      {/* AI Authority Playbook — Tier-1 pillars + Tier-2 question articles + glossary */}
                      <Route path="/glossary" element={<GlossaryPage />} />
                      <Route path="/revenue-forensics" element={<AuthorityArticlePage />} />
                      <Route path="/revenue-leak" element={<AuthorityArticlePage />} />
                      <Route path="/revenue-score" element={<AuthorityArticlePage />} />
                      <Route path="/framework" element={<AuthorityArticlePage />} />
                      <Route path="/vs-agencies" element={<AuthorityArticlePage />} />
                      <Route path="/how-to-find-revenue-leaks" element={<AuthorityArticlePage />} />
                      <Route path="/revenue-audit-cost" element={<AuthorityArticlePage />} />
                      <Route path="/why-am-i-not-closing-leads" element={<AuthorityArticlePage />} />
                      <Route path="/lead-followup-timing" element={<AuthorityArticlePage />} />
                      <Route path="/b2b-conversion-benchmark" element={<AuthorityArticlePage />} />
                      <Route path="/tracking-pixels" element={<AuthorityArticlePage />} />
                      <Route path="/bad-crm-data" element={<AuthorityArticlePage />} />
                      <Route path="/most-common-revenue-leaks" element={<AuthorityArticlePage />} />
                      <Route path="/revenue-leak-calculator" element={<AuthorityArticlePage />} />
                      <Route path="/marketing-audit-vs-revenue-audit" element={<AuthorityArticlePage />} />
                      <Route path="/competitor-analysis" element={<AuthorityArticlePage />} />
                      <Route path="/above-the-fold" element={<AuthorityArticlePage />} />
                      <Route path="/report/:scanId/ask" element={<ForensicReportAskPage />} />
                       {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>

                  <SalesChatGate />
                  <BookMeetingGate />
                  <LimitedOfferPopup />
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
