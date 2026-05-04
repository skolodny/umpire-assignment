import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { getAvailability, createSlot, deleteSlot, editSlot } from "../api";
import { format } from "date-fns";
import type { EventImpl } from "@fullcalendar/core/internal";
import { Button, Modal, toast } from "@heroui/react";
import { TrashBin, FloppyDisk, Plus } from "@gravity-ui/icons";

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
    <Modal.Root isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Availability for {date}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 mb-2">
                {slots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-sm">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</span>
                    <Button isIconOnly variant="danger" size="sm" onPress={() => onDelete(s.id)}><TrashBin /></Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Start</label>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <label className="text-sm font-medium">End</label>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                {error && (
                  <div className="bg-red-50 text-red-600 p-2 rounded-lg text-sm">{error}</div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer className="flex gap-2 justify-end">
              <Button isIconOnly variant="primary" onPress={handleAdd}><Plus /></Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function EditModal({ event, onClose, onSave, onDelete }: { event: EventImpl; onClose: () => void; onSave: (start: string, end: string) => void; onDelete: (id: number) => void }) {
  // BUG FIX: Use extendedProps (which carry the actual slot times) instead of
  // event.start / event.end (which are calendar Date objects at midnight for all-day events)
  const props = event.extendedProps as { start_time?: string; end_time?: string };
  const [start, setStart] = useState(props.start_time?.slice(0, 5) ?? "09:00");
  const [end, setEnd] = useState(props.end_time?.slice(0, 5) ?? "17:00");
  const [error, setError] = useState("");

  const handleUpdate = () => {
    if (start >= end) {
      setError("Start time must be before end time");
      return;
    }
    setError("");
    onSave(start, end);
  };

  return (
    <Modal.Root isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                Edit Availability for {event.start ? format(event.start, "yyyy-MM-dd") : ""}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-2">
              <label className="text-sm font-medium">Start</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
              <label className="text-sm font-medium">End</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
              {error && (
                <div className="bg-red-50 text-red-600 p-2 rounded-lg text-sm">{error}</div>
              )}
            </Modal.Body>
            <Modal.Footer className="flex gap-2 justify-end">
              <Button isIconOnly variant="primary" onPress={handleUpdate}><FloppyDisk /></Button>
              <Button isIconOnly variant="danger" onPress={() => onDelete(Number(event.id))}><TrashBin /></Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
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

  // Include start_time/end_time in extendedProps so EditModal can use actual times
  const calendarEvents = slots.map((s) => ({
    id: String(s.id),
    title: `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
    date: s.date,
    color: "#22c55e",
    extendedProps: { start_time: s.start_time, end_time: s.end_time },
  }));

  const handleDateClick = (info: DateClickArg) => {
    setSelectedDate(info.dateStr);
  };

  const handleEventClick = (info: EventClickArg) => {
    setSelectedEvent(info.event);
  };

  const handleDatesSet = (info: DatesSetArg) => {
    setCurrentMonth(format(info.view.currentStart, "yyyy-MM"));
  };

  const handleSaveSlot = async (start: string, end: string) => {
    if (!selectedDate) return;
    const date = selectedDate;
    setSelectedDate(null);
    const loadingId = toast("Saving changes...", { isLoading: true, timeout: 0});
    try {
      await createSlot({ date, start_time: start, end_time: end });
      toast.close(loadingId);
      toast.success("Availability slot created");
    } catch {
      toast.close(loadingId);
      toast.danger("Failed to create availability slot", { description: "Please try again" });
    }
    await fetchSlots();
  };

  const handleDeleteSlot = async (id: number) => {
    setSelectedEvent(null);
    const loadingId = toast("Deleting slot...", { isLoading: true, timeout: 0});
    try {
      await deleteSlot(id);
      toast.close(loadingId);
      toast.success("Availability slot deleted");
    } catch {
      toast.close(loadingId);
      toast.danger("Failed to delete availability slot", { description: "Please try again" });
    }
    await deleteSlot(id);
    await fetchSlots();
  };

  const handleEditSaveSlot = async (start: string, end: string) => {
    if (!selectedEvent) return;
    const slotId = Number(selectedEvent.id);
    setSelectedEvent(null);
    const loadingId = toast("Saving changes...", { isLoading: true, timeout: 0});
    try {
    await editSlot(slotId, { start_time: start, end_time: end });
      toast.close(loadingId);
      toast.success("Availability slot updated");
    } catch {
      toast.close(loadingId);
      toast.danger("Failed to update availability slot", { description: "Please try again" });
    }
    await fetchSlots();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">My Availability</h2>
      <p className="text-sm text-slate-500">Click a day to add or remove availability windows.</p>
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
