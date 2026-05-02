import { API_BASE } from "../api";

export default function LoginPage() {
  const handleSignIn = (provider: string = "google") => {
    window.location.href = `${API_BASE}/oauth/consent?provider=${provider}`;
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

