import { useState, useEffect } from "react";
import { listUmpires } from "../api";

interface Umpire {
  id: number;
  name: string;
  email: string;
  divisions: string[];
}

const DIVISION_LABELS: Record<string, string> = {
  rookies: "Rookies",
  int_i: "Int I",
  int_ii: "Int II",
};

export default function AdminUmpiresTab() {
  const [umpires, setUmpires] = useState<Umpire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUmpires().then((r) => {
      setUmpires(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="tab-content">Loading…</div>;

  return (
    <div className="tab-content">
      <h2>Umpire Management</h2>
      {umpires.length === 0 && <p className="empty">No umpires registered yet.</p>}
      <div className="umpire-table-wrap">
        <table className="umpire-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Division Preferences</th>
            </tr>
          </thead>
          <tbody>
            {umpires.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  {u.divisions.length === 0 ? (
                    <span className="empty">None set</span>
                  ) : (
                    u.divisions.map((d) => (
                      <span key={d} className="division-tag">{DIVISION_LABELS[d] || d}</span>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
