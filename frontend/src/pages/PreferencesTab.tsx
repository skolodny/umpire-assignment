import { useState, useEffect } from "react";
import { getPreferences, setPreferences } from "../api";

type Division = "rookies" | "int_i" | "int_ii";

const LABELS: Record<Division, string> = {
  rookies: "Rookies",
  int_i: "Int I",
  int_ii: "Int II",
};

function applyAutoSelect(prev: Set<Division>, toggled: Division, checked: boolean): Set<Division> {
  const next = new Set(prev);
  if (checked) {
    next.add(toggled);
    // Int II requires Int I and Rookies
    if (toggled === "int_ii") {
      next.add("int_i");
      next.add("rookies");
    }
    // Int I requires Rookies
    if (toggled === "int_i") {
      next.add("rookies");
    }
    // Rookies requires Int I (they are always paired)
    if (toggled === "rookies") {
      next.add("int_i");
    }
  } else {
    next.delete(toggled);
    // Unchecking Int II: only remove Int II
    // Unchecking Int I: remove Int II (requires it) and Rookies (paired)
    if (toggled === "int_i") {
      next.delete("int_ii");
      next.delete("rookies");
    }
    // Unchecking Rookies: remove Int I and Int II (both require Rookies)
    if (toggled === "rookies") {
      next.delete("int_i");
      next.delete("int_ii");
    }
  }
  return next;
}

export default function PreferencesTab() {
  const [selected, setSelected] = useState<Set<Division>>(new Set());
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPreferences().then((r) => {
      setSelected(new Set(r.data.divisions as Division[]));
      setLoading(false);
    });
  }, []);

  const toggle = (div: Division, checked: boolean) => {
    setSaved(false);
    setSelected((prev) => applyAutoSelect(prev, div, checked));
  };

  const handleSave = async () => {
    await setPreferences(Array.from(selected));
    setSaved(true);
  };

  if (loading) return <div className="tab-content">Loading…</div>;

  return (
    <div className="tab-content">
      <h2>Division Preferences</h2>
      <p className="hint">
        Select which divisions you are willing to umpire. Higher divisions automatically include lower ones.
      </p>
      <div className="pref-list">
        {(["rookies", "int_i", "int_ii"] as Division[]).map((div) => (
          <label key={div} className="pref-row">
            <input
              type="checkbox"
              checked={selected.has(div)}
              onChange={(e) => toggle(div, e.target.checked)}
            />
            <span>{LABELS[div]}</span>
          </label>
        ))}
      </div>
      <button className="btn-primary" onClick={handleSave}>
        Save Preferences
      </button>
      {saved && <span className="success-msg">Saved!</span>}
    </div>
  );
}
