import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (email: string, name: string, password: string) =>
  api.post("/auth/register", { email, name, password });

export const login = (email: string, password: string) => {
  const form = new FormData();
  form.append("username", email);
  form.append("password", password);
  return api.post("/auth/login", form);
};

export const getMe = () => api.get("/auth/me");

// Availability
export const getAvailability = (userId?: number, month?: string) =>
  api.get("/availability", { params: { user_id: userId, month } });

export const createSlot = (data: { date: string; start_time: string; end_time: string }) =>
  api.post("/availability", data);

export const deleteSlot = (slotId: number) => api.delete(`/availability/${slotId}`);

// Preferences
export const getPreferences = () => api.get("/preferences");

export const setPreferences = (divisions: string[]) =>
  api.put("/preferences", { divisions });

// Games (admin)
export const listGames = (month?: string) =>
  api.get("/games", { params: { month } });

export const syncGames = () => api.post("/games/sync");

export const getEligibleUmpires = (gameId: number) =>
  api.get(`/games/${gameId}/eligible-umpires`);

// Assignments
export const createAssignment = (gameId: number, umpireId: number) =>
  api.post("/assignments", { game_id: gameId, umpire_id: umpireId });

export const listAssignments = () => api.get("/assignments");

export const respondToAssignment = (assignmentId: number, action: "accept" | "decline") =>
  api.patch(`/assignments/${assignmentId}`, { action });

export const respondByToken = (token: string, action: string) =>
  api.post("/assignments/respond-by-token", null, { params: { token, action } });

export const getIcalUrl = (assignmentId: number) =>
  `${API_BASE}/assignments/${assignmentId}/ical`;

// Umpires (admin)
export const listUmpires = () => api.get("/umpires");
