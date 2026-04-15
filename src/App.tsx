import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FloatingContact } from "@/components/FloatingContact";
import { SalesChat } from "@/components/SalesChat";
import { ConsentBanner } from "@/components/ConsentBanner";
import { PageViewTracker } from "@/components/PageViewTracker";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import ServicesPage from "./pages/ServicesPage";
import WhyUsPage from "./pages/WhyUsPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import TermsPage from "./pages/TermsPage";
import ResourcesPage from "./pages/ResourcesPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AssessmentPage from "./pages/AssessmentPage";
import ScanPage from "./pages/ScanPage";
import NotFound from "./pages/NotFound";
import DiagnosticQuizPage from "./pages/DiagnosticQuizPage";
import CareersPage from "./pages/CareersPage";
import UnsubscribePage from "./pages/UnsubscribePage";
import MarketingStudioPage from "./pages/MarketingStudioPage";
import MarketingStrategistPage from "./pages/MarketingStrategistPage";
import AIConsultantPage from "./pages/AIConsultantPage";
import SalesCompassPage from "./pages/SalesCompassPage";
import CheckoutReturn from "./pages/CheckoutReturn";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PageViewTracker />
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
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/business-diagnostic" element={<DiagnosticQuizPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/marketing-studio" element={<MarketingStudioPage />} />
            <Route path="/marketing-strategist" element={<MarketingStrategistPage />} />
            <Route path="/ai-consultant" element={<AIConsultantPage />} />
            <Route path="/sales-compass" element={<SalesCompassPage />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingContact />
          <SalesChat />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
