import { Navigate } from "react-router-dom";

// Auth temporarily disabled — anyone hitting /app/login is sent straight to the dashboard.
const AppLogin = () => <Navigate to="/app/dashboard" replace />;

export default AppLogin;

