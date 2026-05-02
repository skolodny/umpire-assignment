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
    // onAuthStateChange handles both implicit (hash) and PKCE (code exchange) flows.
    // INITIAL_SESSION may fire first (with no session) while the PKCE code is being
    // exchanged; SIGNED_IN fires once the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
        if (!session) return;

        const accessToken = session.access_token;
        localStorage.setItem("token", accessToken);

        try {
          const r = await getMe();
          setAuth(accessToken, r.data);
          navigate(r.data.role === "admin" ? "/admin" : "/dashboard", { replace: true });
        } catch {
          setError("Failed to load user profile. Please try again.");
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [navigate, setAuth]);

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
