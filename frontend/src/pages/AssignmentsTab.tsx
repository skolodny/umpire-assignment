import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { listAssignments, respondToAssignment, respondByToken, getIcalUrl } from "../api";
import { Button, Card, Chip, Spinner } from "@heroui/react";

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

type StatusColor = "warning" | "success" | "danger" | "default";

const STATUS_CHIP_COLOR: Record<string, StatusColor> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  expired: "default",
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

  if (loading) return <Spinner size='sm' />;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">My Assignments</h2>
      {pendingCount > 0 && (
        <div className="bg-amber-50 text-amber-800 border border-amber-300 p-3 rounded-lg text-sm">
          ⚠️ You have {pendingCount} pending assignment{pendingCount > 1 ? "s" : ""} awaiting your response.
        </div>
      )}
      {assignments.length === 0 && <p className="text-slate-400 italic text-sm">No assignments yet.</p>}
      <div className="flex flex-col gap-3">
        {assignments.map((a) => (
          <Card key={a.id}>
            <Card.Header className="flex-row items-center justify-between pb-1">
          <Card.Title className="text-base">{a.game.title}</Card.Title>
              <Chip color={STATUS_CHIP_COLOR[a.status] ?? "default"} size="sm">
                {a.status}
              </Chip>
            </Card.Header>
            <Card.Content className="flex flex-col gap-2">
              <div className="flex gap-4 flex-wrap text-sm text-slate-500">
                <span>📅 {a.game.date}</span>
                <span>🕐 {a.game.start_time.slice(0, 5)}{a.game.end_time ? ` – ${a.game.end_time.slice(0, 5)}` : ""}</span>
                {a.game.location && <span>📍 {a.game.location}</span>}
                {a.game.division && <span>🏆 {a.game.division}</span>}
              </div>
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onPress={() => handleRespond(a.id, "accept")}>Accept</Button>
                  <Button variant="danger" size="sm" onPress={() => handleRespond(a.id, "decline")}>Decline</Button>
                </div>
              )}
              {a.status === "accepted" && (
                <div className="flex gap-2">
                  <a
                    href={getIcalUrl(a.id)}
                    download={`assignment-${a.id}.ics`}
                    className="inline-flex"
                  >
                    <Button variant="secondary" size="sm">📥 Download iCal</Button>
                  </a>
                </div>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
