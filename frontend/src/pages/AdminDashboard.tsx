
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Chip } from "@heroui/react";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 bg-slate-900 text-white px-6 h-14">
        <span className="text-lg font-bold flex-1">
          ⚾ Umpire Assignment{" "}
          <Chip color="danger" size="sm" className="align-middle ml-1">Admin</Chip>
        </span>
        <span className="text-sm text-slate-400">Hi, {user?.name}</span>
        <Button variant="outline" size="sm" onPress={handleLogout}>Sign Out</Button>
      </header>
      <nav className="flex bg-slate-800 px-6">
        <NavLink to="/admin/games" className={({ isActive }) => `px-5 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? "text-white border-blue-500" : "text-slate-400 border-transparent hover:text-white"}`}>
          Games
        </NavLink>
        <NavLink to="/admin/umpires" className={({ isActive }) => `px-5 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? "text-white border-blue-500" : "text-slate-400 border-transparent hover:text-white"}`}>
          Umpires
        </NavLink>
      </nav>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
