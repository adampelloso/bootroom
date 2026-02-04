"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHeaderDate(date: Date): string {
  return date
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toUpperCase();
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMondayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function buildCalendarDays(base: Date): Array<{ date: Date; inMonth: boolean }> {
  const first = startOfMonth(base);
  const startOffset = getMondayIndex(first);
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);

  const days: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push({ date: day, inMonth: day.getMonth() === base.getMonth() });
  }
  return days;
}

function parseDateSafe(str: string): Date | null {
  const d = new Date(str + "T12:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

export function DateNavigator({ currentDate }: { currentDate: string }) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const initial = useMemo(() => parseDateSafe(currentDate) ?? today, [currentDate]);
  const [selectedDate, setSelectedDate] = useState<Date>(initial);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(initial));

  useEffect(() => {
    const parsed = parseDateSafe(currentDate);
    if (parsed && !isSameDay(parsed, selectedDate)) {
      setSelectedDate(parsed);
      setViewMonth(startOfMonth(parsed));
    }
  }, [currentDate]);

  const headerDate = formatHeaderDate(selectedDate);
  const calendarDays = buildCalendarDays(viewMonth);
  const toDateParam = (d: Date) => d.toISOString().slice(0, 10);

  const shiftDate = (deltaDays: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + deltaDays);
      router.push(`/?date=${toDateParam(next)}`);
      return next;
    });
  };

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + delta);
      return startOfMonth(next);
    });
  };

  const openPicker = () => {
    setViewMonth(startOfMonth(selectedDate));
    setIsPickerOpen(true);
  };

  const closePicker = () => setIsPickerOpen(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => shiftDate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-light)]"
          style={{ background: "var(--bg-body)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={openPicker}
          aria-label="Choose date"
          className="flex items-center gap-2 rounded-full border border-[var(--border-light)] px-3 py-2 text-mono font-medium stat-value"
          style={{ fontSize: "14px", background: "var(--bg-body)" }}
        >
          <span>{headerDate}</span>
        </button>

        <button
          type="button"
          aria-label="Next day"
          onClick={() => shiftDate(1)}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-light)]"
          style={{ background: "var(--bg-body)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
        </button>
      </div>

      {isPickerOpen ? (
        <div className="fixed inset-0 z-[200] bg-[var(--bg-body)]">
          <div className="mx-auto flex h-full max-w-lg flex-col px-5 pb-8 pt-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={closePicker}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border-light)]"
                style={{ background: "var(--bg-surface)" }}
                aria-label="Close date picker"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="m6.41 5 12.19 12.19-1.41 1.41L5 6.41z" />
                  <path d="m18.59 5 1.41 1.41L6.41 20 5 18.59z" />
                </svg>
              </button>
              <div className="text-mono text-[11px] uppercase text-tertiary">
                Select date
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(today);
                  setViewMonth(startOfMonth(today));
                  setIsPickerOpen(false);
                  router.push(`/?date=${toDateParam(today)}`);
                }}
                className="text-mono text-[11px] uppercase font-medium"
              >
                Today
              </button>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border-light)]"
                style={{ background: "var(--bg-body)" }}
                aria-label="Previous month"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
              <div className="text-lg font-medium">{formatMonthYear(viewMonth)}</div>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border-light)]"
                style={{ background: "var(--bg-body)" }}
                aria-label="Next month"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                </svg>
              </button>
            </div>

            <div className="mt-8 grid grid-cols-7 gap-2 text-mono text-[11px] uppercase text-tertiary">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2 text-sm">
              {calendarDays.map(({ date, inMonth }) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date);
                      setIsPickerOpen(false);
                      router.push(`/?date=${toDateParam(date)}`);
                    }}
                    className="h-12 rounded-2xl transition-colors"
                    style={{
                      background: isSelected ? "#000" : "transparent",
                      color: isSelected ? "#fff" : "inherit",
                      border: isToday ? "1px solid var(--border-light)" : "1px solid transparent",
                      opacity: inMonth ? 1 : 0.35,
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-8 text-center text-xs text-tertiary">
              Tap a day to navigate. Swipe is not enabled yet.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
