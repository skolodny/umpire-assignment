import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const handleSignIn = async (provider: string = "google") => {
    await supabase.auth.signInWithOAuth({
      provider: provider as Parameters<typeof supabase.auth.signInWithOAuth>[0]["provider"],
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}oauth/callback`,
      },
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Umpire Assignment</h1>
        <h2>Sign In</h2>
        <button className="btn-primary" onClick={() => handleSignIn("google")}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

