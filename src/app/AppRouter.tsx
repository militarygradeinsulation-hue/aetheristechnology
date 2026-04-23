import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLogin from "./pages/AppLogin";
import AppSignup from "./pages/AppSignup";
import AppDashboard from "./pages/AppDashboard";
import AppSettings from "./pages/AppSettings";

export const AppRouter = () => (
  <AuthProvider>
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="login" element={<AppLogin />} />
      <Route path="signup" element={<AppSignup />} />
      <Route path="dashboard" element={<AppDashboard />} />
      <Route path="settings" element={<AppSettings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </AuthProvider>
);

export default AppRouter;
