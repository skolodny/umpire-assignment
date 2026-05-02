import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getMe } from "../api";
import { useAuth } from "../context/AuthContext";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase will automatically parse the token from the URL hash or code
    // in the query string and update the session.
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (sessionError || !session) {
        setError("Authentication failed. Please try again.");
        return;
      }

      const accessToken = session.access_token;
      localStorage.setItem("token", accessToken);

      try {
        const r = await getMe();
        setAuth(accessToken, r.data);
        navigate(r.data.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      } catch {
        setError("Failed to load user profile. Please try again.");
      }
    });
  }, []); // runs once on mount — navigate and setAuth are stable refs

  if (error) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Umpire Assignment</h1>
          <div className="error-msg">{error}</div>
          <button className="btn-primary" onClick={() => navigate("/login")}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Umpire Assignment</h1>
        <div className="loading">Completing sign in…</div>
      </div>
    </div>
  );
}
