import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Provider } from "@supabase/supabase-js";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: Provider = "google") => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}oauth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Umpire Assignment</h1>
        <h2>Sign In</h2>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn-primary" onClick={() => handleSignIn("google")}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

