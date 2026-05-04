import { useState, useEffect } from "react";
import { listUmpires } from "../api";
import { Chip, Spinner } from "@heroui/react";

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

  if (loading) return <Spinner size='sm' />;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Umpire Management</h2>
      {umpires.length === 0 && <p className="text-slate-400 italic text-sm">No umpires registered yet.</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Division Preferences</th>
            </tr>
          </thead>
          <tbody>
            {umpires.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  {u.divisions.length === 0 ? (
                    <span className="text-slate-400 italic">None set</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.divisions.map((d) => (
                        <Chip key={d} color="accent" size="sm">{DIVISION_LABELS[d] || d}</Chip>
                      ))}
                    </div>
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
