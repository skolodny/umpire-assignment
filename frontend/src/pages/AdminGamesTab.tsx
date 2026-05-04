import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core";
import { listGames, syncGames, getEligibleUmpires, createAssignment } from "../api";
import { format } from "date-fns";
import { Button, Modal } from "@heroui/react";

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
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [eligibleUmpires, setEligibleUmpires] = useState<EligibleUmpire[]>([]);
  const [selectedUmpireId, setSelectedUmpireId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchGames = useCallback(async () => {
    if (!dateRange) return;
    const r = await listGames(dateRange.start, dateRange.end);
    setGames(r.data);
  }, [dateRange]);

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
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(msg || "Sync failed");
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
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(msg || "Assignment failed");
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold flex-1">Games Calendar</h2>
        <Button variant="primary" isDisabled={syncing} onPress={handleSync}>
          {syncing ? "Syncing…" : "🔄 Sync Feed"}
        </Button>
      </div>
      {successMsg && (
        <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm">{successMsg}</div>
      )}
      <div className="flex gap-4 flex-wrap mb-2">
        {Object.entries(DIVISION_COLORS).map(([div, color]) => (
          <span key={div} className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
            {div}
          </span>
        ))}
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={calendarEvents}
        eventClick={handleGameClick}
        datesSet={(info: DatesSetArg) => {
          const start = format(info.view.activeStart, "yyyy-MM-dd");
          const end = format(info.view.activeEnd, "yyyy-MM-dd");
          setDateRange({ start, end });
        }}
        height="auto"
      />

      <Modal.Root
        isOpen={!!selectedGame}
        onOpenChange={(open) => { if (!open) setSelectedGame(null); }}
      >
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{selectedGame?.title}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-2">
                <p className="text-sm text-slate-600">
                  📅 {selectedGame?.date} at {selectedGame?.start_time.slice(0, 5)}
                </p>
                {selectedGame?.location && (
                  <p className="text-sm text-slate-600">📍 {selectedGame.location}</p>
                )}
                {selectedGame?.division && (
                  <p className="text-sm text-slate-600">🏆 Division: {selectedGame.division}</p>
                )}
                <hr className="my-2 border-slate-200" />
                <h4 className="text-sm font-semibold">Eligible Umpires</h4>
                {eligibleUmpires.length === 0 ? (
                  <p className="text-slate-400 italic text-sm">No eligible umpires available for this game.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {eligibleUmpires.map((u) => (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                          selectedUmpireId === u.id
                            ? "bg-blue-50 border-blue-400"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="umpire"
                          value={u.id}
                          checked={selectedUmpireId === u.id}
                          onChange={() => setSelectedUmpireId(u.id)}
                          className="accent-blue-500"
                        />
                        <span className="font-medium flex-1">{u.name}</span>
                        <span className="text-xs text-slate-400">{u.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer className="flex gap-2 justify-end">
                <Button
                  variant="primary"
                  isDisabled={!selectedUmpireId || assigning}
                  onPress={handleAssign}
                >
                  {assigning ? "Assigning…" : "Assign"}
                </Button>
                <Button variant="secondary" onPress={() => setSelectedGame(null)}>Cancel</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
