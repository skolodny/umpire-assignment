
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UmpireDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="logo">⚾ Umpire Assignment</span>
        <span className="user-info">Hi, {user?.name}</span>
        <button className="btn-ghost" onClick={handleLogout}>Sign Out</button>
      </header>
      <nav className="dashboard-nav">
        <NavLink to="/dashboard/availability" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Availability
        </NavLink>
        <NavLink to="/dashboard/preferences" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Divisions
        </NavLink>
        <NavLink to="/dashboard/assignments" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Assignments
        </NavLink>
      </nav>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
