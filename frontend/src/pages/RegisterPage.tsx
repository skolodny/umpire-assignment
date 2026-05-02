import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Registration is now handled via OAuth — redirect to login
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
