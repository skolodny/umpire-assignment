import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { listAssignments, respondToAssignment, respondByToken, getIcalUrl } from "../api";

interface Assignment {
  id: number;
  game_id: number;
  umpire_id: number;
  status: string;
  assigned_at: string;
  responded_at: string | null;
  game: {
    id: number;
    title: string;
    date: string;
    start_time: string;
    end_time: string | null;
    location: string | null;
    division: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#22c55e",
  declined: "#ef4444",
  expired: "#9ca3af",
};

export default function AssignmentsTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const fetchAssignments = useCallback(async () => {
    const r = await listAssignments();
    setAssignments(r.data);
    setLoading(false);
  }, []);

  // Handle email deep-link: ?action=accept&token=...
  useEffect(() => {
    const action = searchParams.get("action");
    const token = searchParams.get("token");
    if (action && token) {
      respondByToken(token, action)
        .then(() => fetchAssignments())
        .catch(console.error);
    } else {
      fetchAssignments();
    }
  }, [searchParams, fetchAssignments]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAssignments, 30_000);
    return () => clearInterval(interval);
  }, [fetchAssignments]);

  const handleRespond = async (id: number, action: "accept" | "decline") => {
    await respondToAssignment(id, action);
    await fetchAssignments();
  };

  const pendingCount = assignments.filter((a) => a.status === "pending").length;

  if (loading) return <div className="tab-content">Loading…</div>;

  return (
    <div className="tab-content">
      <h2>My Assignments</h2>
      {pendingCount > 0 && (
        <div className="notification-banner">
          ⚠️ You have {pendingCount} pending assignment{pendingCount > 1 ? "s" : ""} awaiting your response.
        </div>
      )}
      {assignments.length === 0 && <p className="empty">No assignments yet.</p>}
      <div className="assignment-list">
        {assignments.map((a) => (
          <div key={a.id} className="assignment-card">
            <div className="assignment-header">
              <h3>{a.game.title}</h3>
              <span
                className="status-badge"
                style={{ backgroundColor: STATUS_COLORS[a.status] }}
              >
                {a.status}
              </span>
            </div>
            <div className="assignment-details">
              <span>📅 {a.game.date}</span>
              <span>🕐 {a.game.start_time.slice(0, 5)}{a.game.end_time ? ` – ${a.game.end_time.slice(0, 5)}` : ""}</span>
              {a.game.location && <span>📍 {a.game.location}</span>}
              {a.game.division && <span>🏆 {a.game.division}</span>}
            </div>
            {a.status === "pending" && (
              <div className="assignment-actions">
                <button className="btn-success" onClick={() => handleRespond(a.id, "accept")}>
                  Accept
                </button>
                <button className="btn-danger" onClick={() => handleRespond(a.id, "decline")}>
                  Decline
                </button>
              </div>
            )}
            {a.status === "accepted" && (
              <div className="assignment-actions">
                <a
                  href={getIcalUrl(a.id)}
                  className="btn-secondary"
                  download={`assignment-${a.id}.ics`}
                >
                  📥 Download iCal
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
