import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLogin from "./pages/AppLogin";
import AppSignup from "./pages/AppSignup";
import AppDashboard from "./pages/AppDashboard";
import AppSettings from "./pages/AppSettings";
import AppReports from "./pages/AppReports";
import AppReportDetail from "./pages/AppReportDetail";
import AppHygieneScan from "./pages/AppHygieneScan";
import AppHygieneQueue from "./pages/AppHygieneQueue";
import AppHygieneHistory from "./pages/AppHygieneHistory";
import AppAuditHealth from "./pages/AppAuditHealth";

export const AppRouter = () => (
  <AuthProvider>
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="login" element={<AppLogin />} />
      <Route path="signup" element={<AppSignup />} />
      <Route path="dashboard" element={<AppDashboard />} />
      <Route path="reports" element={<AppReports />} />
      <Route path="reports/:id" element={<AppReportDetail />} />
      <Route path="hygiene" element={<Navigate to="/app/hygiene/scan" replace />} />
      <Route path="hygiene/scan" element={<AppHygieneScan />} />
      <Route path="hygiene/queue" element={<AppHygieneQueue />} />
      <Route path="hygiene/history" element={<AppHygieneHistory />} />
      <Route path="audit-health" element={<AppAuditHealth />} />
      <Route path="settings" element={<AppSettings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </AuthProvider>
);

export default AppRouter;
