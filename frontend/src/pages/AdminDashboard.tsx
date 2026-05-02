
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="logo">⚾ Umpire Assignment <span className="admin-badge">Admin</span></span>
        <span className="user-info">Hi, {user?.name}</span>
        <button className="btn-ghost" onClick={handleLogout}>Sign Out</button>
      </header>
      <nav className="dashboard-nav">
        <NavLink to="/admin/games" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Games
        </NavLink>
        <NavLink to="/admin/umpires" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Umpires
        </NavLink>
      </nav>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
