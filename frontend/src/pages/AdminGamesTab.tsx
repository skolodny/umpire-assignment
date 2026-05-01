import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core";
import { listGames, syncGames, getEligibleUmpires, createAssignment } from "../api";
import { format } from "date-fns";

interface Game {
  id: number;
  external_uid: string;
  title: string;
  division: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
}

interface EligibleUmpire {
  id: number;
  name: string;
  email: string;
}

const DIVISION_COLORS: Record<string, string> = {
  rookies: "#60a5fa",
  int_i: "#f59e0b",
  int_ii: "#ef4444",
};

export default function AdminGamesTab() {
  const [games, setGames] = useState<Game[]>([]);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [eligibleUmpires, setEligibleUmpires] = useState<EligibleUmpire[]>([]);
  const [selectedUmpireId, setSelectedUmpireId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchGames = useCallback(async () => {
    const r = await listGames(currentMonth);
    setGames(r.data);
  }, [currentMonth]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await syncGames();
      await fetchGames();
      setSuccessMsg(`Synced: ${r.data.added} added, ${r.data.updated} updated`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleGameClick = async (info: EventClickArg) => {
    const gameId = (info.event.extendedProps as { gameId: number }).gameId;
    const game = games.find((g) => g.id === gameId);
    if (!game) return;
    setSelectedGame(game);
    setSelectedUmpireId(null);
    setEligibleUmpires([]);
    const r = await getEligibleUmpires(game.id);
    setEligibleUmpires(r.data);
  };

  const handleAssign = async () => {
    if (!selectedGame || !selectedUmpireId) return;
    setAssigning(true);
    try {
      await createAssignment(selectedGame.id, selectedUmpireId);
      setSuccessMsg("Assignment created and umpire notified via email!");
      setSelectedGame(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const calendarEvents = games.map((g) => ({
    id: String(g.id),
    title: g.title,
    date: g.date,
    color: g.division ? DIVISION_COLORS[g.division] || "#6b7280" : "#6b7280",
    extendedProps: { gameId: g.id },
  }));

  return (
    <div className="tab-content">
      <div className="tab-toolbar">
        <h2>Games Calendar</h2>
        <button className="btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing…" : "🔄 Sync Feed"}
        </button>
      </div>
      {successMsg && <div className="success-banner">{successMsg}</div>}
      <div className="legend">
        {Object.entries(DIVISION_COLORS).map(([div, color]) => (
          <span key={div} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: color }} />
            {div}
          </span>
        ))}
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        eventClick={handleGameClick}
        datesSet={(info: DatesSetArg) => setCurrentMonth(format(info.view.currentStart, "yyyy-MM"))}
        height="auto"
      />

      {selectedGame && (
        <div className="modal-overlay" onClick={() => setSelectedGame(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedGame.title}</h3>
            <p>📅 {selectedGame.date} at {selectedGame.start_time.slice(0, 5)}</p>
            {selectedGame.location && <p>📍 {selectedGame.location}</p>}
            {selectedGame.division && <p>🏆 Division: {selectedGame.division}</p>}
            <hr />
            <h4>Eligible Umpires</h4>
            {eligibleUmpires.length === 0 ? (
              <p className="empty">No eligible umpires available for this game.</p>
            ) : (
              <div className="umpire-select-list">
                {eligibleUmpires.map((u) => (
                  <label key={u.id} className={`umpire-option ${selectedUmpireId === u.id ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="umpire"
                      value={u.id}
                      checked={selectedUmpireId === u.id}
                      onChange={() => setSelectedUmpireId(u.id)}
                    />
                    <span>{u.name}</span>
                    <span className="umpire-email">{u.email}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={handleAssign}
                disabled={!selectedUmpireId || assigning}
              >
                {assigning ? "Assigning…" : "Assign"}
              </button>
              <button className="btn-secondary" onClick={() => setSelectedGame(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
