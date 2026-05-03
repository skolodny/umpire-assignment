import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Provider } from "@supabase/supabase-js";
import { Button, Card } from "@heroui/react";
import { Icon } from "@iconify/react";

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
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-100">
      <Card className="w-full max-w-md p-10">
        <Card.Header className="flex-col items-start gap-1 pb-4">
          <Card.Title className="text-2xl font-bold">⚾ Umpire Assignment</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
            <Button className="w-full" variant="tertiary" onPress={() => handleSignIn("google")}>
              <Icon icon="devicon:google" />
              Sign in with Google
            </Button>
        </Card.Content>
      </Card>
    </div>
  );
}

