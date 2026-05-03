import { useState, useEffect } from "react";
import { getPreferences, setPreferences } from "../api";
import { Button, Checkbox } from "@heroui/react";

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

  if (loading) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Division Preferences</h2>
      <p className="text-sm text-slate-500">
        Select which divisions you are willing to umpire. Higher divisions automatically include lower ones.
      </p>
      <div className="flex flex-col gap-3">
        {(["rookies", "int_i", "int_ii"] as Division[]).map((div) => (
          <Checkbox
            key={div}
            isSelected={selected.has(div)}
            onChange={(checked) => toggle(div, checked)}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>{LABELS[div]}</Checkbox.Content>
          </Checkbox>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="primary" onPress={handleSave}>Save Preferences</Button>
        {saved && <span className="text-green-600 text-sm">Saved!</span>}
      </div>
    </div>
  );
}
