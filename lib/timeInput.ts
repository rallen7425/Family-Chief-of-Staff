/**
 * Tolerant free-text time parsing for TimePickerButton's "type to jump"
 * field. Kept out of the component so it can be unit-tested as pure logic.
 */

/** "16:00", "4pm", "4:30 pm", "430pm", "9", "0930" all resolve to HH:mm
 * (24h). Returns null for anything it can't confidently interpret. */
export function parseTimeInput(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;

  const ampm = s.endsWith("am") ? "am" : s.endsWith("pm") ? "pm" : null;
  const digits = ampm ? s.slice(0, -2) : s;

  let hh: number;
  let mm: number;

  if (digits.includes(":")) {
    const [hStr, mStr] = digits.split(":");
    hh = Number(hStr);
    mm = Number(mStr ?? "0");
  } else if (/^\d{3,4}$/.test(digits)) {
    hh = Number(digits.slice(0, digits.length - 2));
    mm = Number(digits.slice(-2));
  } else if (/^\d{1,2}$/.test(digits)) {
    hh = Number(digits);
    mm = 0;
  } else {
    return null;
  }

  if (Number.isNaN(hh) || Number.isNaN(mm) || mm < 0 || mm > 59) return null;

  if (ampm === "pm" && hh < 12) hh += 12;
  if (ampm === "am" && hh === 12) hh = 0;
  if (hh < 0 || hh > 23) return null;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** HH:mm (24h) -> "4:00 PM" for display. */
export function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
