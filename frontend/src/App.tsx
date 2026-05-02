
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import OAuthCallback from "./pages/OAuthCallback";
import UmpireDashboard from "./pages/UmpireDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AvailabilityTab from "./pages/AvailabilityTab";
import PreferencesTab from "./pages/PreferencesTab";
import AssignmentsTab from "./pages/AssignmentsTab";
import AdminGamesTab from "./pages/AdminGamesTab";
import AdminUmpiresTab from "./pages/AdminUmpiresTab";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UmpireDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="availability" replace />} />
          <Route path="availability" element={<AvailabilityTab />} />
          <Route path="preferences" element={<PreferencesTab />} />
          <Route path="assignments" element={<AssignmentsTab />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="games" replace />} />
          <Route path="games" element={<AdminGamesTab />} />
          <Route path="umpires" element={<AdminUmpiresTab />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
