import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { getAvailability, createSlot, deleteSlot, editSlot } from "../api";
import { format } from "date-fns";
import type { EventImpl } from "@fullcalendar/core/internal";

interface Slot {
  id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface SlotModalProps {
  date: string;
  slots: Slot[];
  onClose: () => void;
  onSave: (start: string, end: string) => void;
  onDelete: (id: number) => void;
}

function SlotModal({ date, slots, onClose, onSave, onDelete }: SlotModalProps) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (start >= end) {
      setError("Start time must be before end time");
      return;
    }
    setError("");
    onSave(start, end);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Availability for {date}</h3>
        <div className="slot-list">
          {slots.length === 0 && <p className="empty">No slots yet</p>}
          {slots.map((s) => (
            <div key={s.id} className="slot-item">
              <span>{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</span>
              <button className="btn-danger-sm" onClick={() => onDelete(s.id)}>✕</button>
            </div>
          ))}
        </div>
        <div className="slot-form">
          <label>Start</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <label>End</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          {error && <div className="error-msg">{error}</div>}
          <div className="modal-actions">
            <button className="btn-primary" onClick={handleAdd}>Add Slot</button>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ event, onClose, onSave, onDelete }: { event: EventImpl; onClose: () => void; onSave: (start: string, end: string) => void; onDelete: (id: number) => void }) {
  const [start, setStart] = useState(event.start ? format(event.start, "HH:mm") : "09:00");
  const [end, setEnd] = useState(event.end ? format(event.end, "HH:mm") : "17:00");
  const [error, setError] = useState("");

  const handleUpdate = () => {
    if (start >= end) {
      setError("Start time must be before end time");
      return;
    }
    setError("");
    onSave(start, end);
  };

  return (<div className="modal-overlay" onClick={onClose}>
  <div className="modal" onClick={(e) => e.stopPropagation()}>
    <h3>Edit Availability for {event.start ? format(event.start, "yyyy-MM-dd") : ""}</h3>

    <div className="slot-form">
      <label>Start</label>
      <input
        type="time"
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />

      <label>End</label>
      <input
        type="time"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />

      {error && <div className="error-msg">{error}</div>}

      <div className="modal-actions">
        <button className="btn-primary" onClick={handleUpdate}>
          Save Changes
        </button>
        <button className="btn-danger" onClick={() => onDelete(Number(event.id))}>
          Delete Slot
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  </div>
</div>)
}
export default function AvailabilityTab() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventImpl | null>(null);

  const fetchSlots = useCallback(async () => {
    const r = await getAvailability(undefined, currentMonth);
    setSlots(r.data);
  }, [currentMonth]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const slotsForDate = selectedDate
    ? slots.filter((s) => s.date === selectedDate)
    : [];

  const calendarEvents = slots.map((s) => ({
    id: String(s.id),
    title: `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
    date: s.date,
    color: "#22c55e",
  }));

  const handleDateClick = (info: DateClickArg) => {
    setSelectedDate(info.dateStr);
  };

  const handleEventClick = (info: EventClickArg) => {
    setSelectedEvent(info.event)
  };

  const handleDatesSet = (info: DatesSetArg) => {
    setCurrentMonth(format(info.view.currentStart, "yyyy-MM"));
  };

  const handleSaveSlot = async (start: string, end: string) => {
    if (!selectedDate) return;
    await createSlot({ date: selectedDate, start_time: start, end_time: end });
    await fetchSlots();
  };

  const handleDeleteSlot = async (id: number) => {
    await deleteSlot(id);
    await fetchSlots();
  };

  const handleEditSaveSlot = async (start: string, end: string) => {
    if (!selectedEvent) return;
    await editSlot(Number(selectedEvent.id), { start_time: start, end_time: end });
    setSelectedEvent(null);
    await fetchSlots();
  }

  return (
    <div className="tab-content">
      <h2>My Availability</h2>
      <p className="hint">Click a day to add or remove availability windows.</p>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        datesSet={handleDatesSet}
        height="auto"
      />
      {selectedDate && (
        <SlotModal
          date={selectedDate}
          slots={slotsForDate}
          onClose={() => setSelectedDate(null)}
          onSave={handleSaveSlot}
          onDelete={handleDeleteSlot}
        />
      )}
      {selectedEvent && (
        <EditModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={handleEditSaveSlot}
          onDelete={handleDeleteSlot}
        />
      )}
    </div>
  );
}
