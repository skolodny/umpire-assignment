import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getMe } from "../api";
import { useAuth } from "../context/AuthContext";
import { ProgressBar, Label } from "@heroui/react";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    // Surface any error returned by the OAuth provider in the redirect URL.
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error_description") || params.get("error");
    if (urlError) {
      setError(urlError);
      return;
    }

    // onAuthStateChange handles both implicit (hash) and PKCE (code exchange) flows.
    // INITIAL_SESSION may fire first (with no session) while the PKCE code is being
    // exchanged; SIGNED_IN fires once the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (handled.current) return;
        if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
        if (!session) return;

        handled.current = true;
        subscription.unsubscribe();

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
        <ProgressBar isIndeterminate aria-label="Completing sign in" className="w-64">
          <Label>Completing sign in…</Label>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>
    </div>
  );
}
