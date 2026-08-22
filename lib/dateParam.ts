import { format, isValid, parse } from "date-fns";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

/** Parses a `?date=YYYY-MM-DD` search param as a local-midnight Date, defaulting to today. */
export function parseDateParam(value?: string): Date {
  if (!value) return new Date();
  const parsed = parse(value, DATE_PARAM_FORMAT, new Date());
  return isValid(parsed) ? parsed : new Date();
}

export function formatDateParam(date: Date): string {
  return format(date, DATE_PARAM_FORMAT);
}
