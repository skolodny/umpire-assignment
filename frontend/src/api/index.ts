import axios, { type InternalAxiosRequestConfig } from "axios";
import { supabase } from "../lib/supabaseClient";

export const API_BASE = import.meta.env.VITE_API_URL || "https://umpire-assignment.onrender.com";

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

// On 401, attempt a Supabase token refresh and retry the original request once.
// This handles the case where the stored access token has expired between visits.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        const newToken = session.access_token;
        localStorage.setItem("token", newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// Auth
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
