import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FloatingContact } from "@/components/FloatingContact";
import { ConsentBanner } from "@/components/ConsentBanner";
import { PageViewTracker } from "@/components/PageViewTracker";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FloatingContact />
        <ConsentBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
