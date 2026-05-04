import { useEffect, useRef, useState } from "react";
import { Label, ProgressBar } from "@heroui/react";
import { checkHealth } from "../api";

const POLL_INTERVAL = 3000;

export default function ServerWakeup({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    const check = async () => {
    try {
        await checkHealth();
        setReady(true);
        clearInterval(intervalRef.current!);
    } catch {
        // server not up yet, keep polling
    }
  };

  check();
  intervalRef.current = setInterval(check, POLL_INTERVAL);
  return () => clearInterval(intervalRef.current!);
}, []);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ProgressBar isIndeterminate aria-label="Waking up server" className="w-64">
        <Label>Waking up server...</Label>
        <ProgressBar.Track>
            <ProgressBar.Fill />
        </ProgressBar.Track>
        </ProgressBar>
      </div>
    );
  }

  return <>{children}</>;
}