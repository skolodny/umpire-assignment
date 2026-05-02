import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { getMe } from "../api";

interface User {
  id: number;
  email: string;
  name: string;
  role: "umpire" | "admin";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from Supabase on mount; fall back to localStorage token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        const t = session.access_token;
        localStorage.setItem("token", t);
        setToken(t);
        getMe()
          .then((r) => setUser(r.data))
          .catch(() => {
            localStorage.removeItem("token");
            setToken(null);
          })
          .finally(() => setLoading(false));
      } else {
        // Read from localStorage directly rather than the `token` state variable
        // to avoid capturing a stale closure (this effect has [] deps).
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
          getMe()
            .then((r) => setUser(r.data))
            .catch(() => {
              localStorage.removeItem("token");
              setToken(null);
            })
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      }
    });
  }, []);

  useEffect(() => {
    // Subscribe to Supabase auth state changes for token refresh / sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        const t = session.access_token;
        localStorage.setItem("token", t);
        setToken(t);
        getMe()
          .then((r) => setUser(r.data))
          .catch(() => {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
          });
      } else {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setAuth = (t: string, u: User) => {
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
