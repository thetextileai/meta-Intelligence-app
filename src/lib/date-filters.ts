export const STORE_TIMEZONE = "Asia/Kolkata";
export const SELECTED_DATE_RANGE_COOKIE = "selected_date_range";
export const SELECTED_DATE_FROM_COOKIE = "selected_date_from";
export const SELECTED_DATE_TO_COOKIE = "selected_date_to";

/**
 * Resolves effective date range taking into account URL search parameters
 * and persistent user choice saved in cookies.
 */
export async function getEffectiveDatePreset(
  urlRange?: string | null,
  urlFrom?: string | null,
  urlTo?: string | null
): Promise<{ preset: string; from: string; to: string }> {
  let cookieRange: string | null = null;
  let cookieFrom: string | null = null;
  let cookieTo: string | null = null;

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieRange = cookieStore.get(SELECTED_DATE_RANGE_COOKIE)?.value || null;
    cookieFrom = cookieStore.get(SELECTED_DATE_FROM_COOKIE)?.value || null;
    cookieTo = cookieStore.get(SELECTED_DATE_TO_COOKIE)?.value || null;
  } catch {
    // cookies() unavailable in non-request contexts
  }

  const effectivePreset = urlRange || cookieRange || "today";
  const effectiveFrom = urlFrom || (effectivePreset === "custom" ? cookieFrom || "" : "");
  const effectiveTo = urlTo || (effectivePreset === "custom" ? cookieTo || "" : "");

  return {
    preset: effectivePreset,
    from: effectiveFrom,
    to: effectiveTo,
  };
}

export interface DateRangeResult {
  preset: string;
  label: string;
  startDate: Date;      // Absolute Date object representing start of range in UTC
  endDate: Date;        // Absolute Date object representing end of range in UTC
  startDateStr: string; // YYYY-MM-DD in Asia/Kolkata
  endDateStr: string;   // YYYY-MM-DD in Asia/Kolkata
  days: number;
}

/**
 * Format a Date object to YYYY-MM-DD in Asia/Kolkata (IST) timezone
 */
export function formatLocalDate(d: Date | string | number): string {
  const dateObj = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
}

/**
 * Format a Date object to readable localized string in Asia/Kolkata (IST) timezone
 * e.g. "Oct 15, 2026, 04:50 AM"
 */
export function formatISTDateTime(d: Date | string | number): string {
  const dateObj = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);
}

/**
 * Format a Date object to "MMM D" in Asia/Kolkata (IST) timezone
 * e.g. "Oct 15"
 */
export function formatISTMonthDay(d: Date | string | number): string {
  const dateObj = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    month: "short",
    day: "numeric",
  }).format(dateObj);
}

/**
 * Get date parts (year, month 1-12, day 1-31, dayOfWeek 0-6) in Asia/Kolkata timezone
 */
function getISTParts(d = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const y = parseInt(map.year, 10);
  const m = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);

  // Calculate day of week in IST
  const istDateObj = new Date(Date.UTC(y, m - 1, day));
  const dayOfWeek = istDateObj.getUTCDay(); // 0 is Sunday, 1 is Monday

  return { year: y, month: m, day, dayOfWeek };
}

/**
 * Create an absolute Date representing a specific moment in Asia/Kolkata (UTC + 5:30)
 */
export function createISTDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - IST_OFFSET_MS);
}

export function resolveDateRange(preset = "today", customFrom = "", customTo = ""): DateRangeResult {
  const now = new Date();
  const { year, month, day, dayOfWeek } = getISTParts(now);

  let start: Date;
  let end: Date = createISTDate(year, month, day, 23, 59, 59, 999);
  let label = "Today";

  if (preset === "today") {
    start = createISTDate(year, month, day, 0, 0, 0, 0);
    end = createISTDate(year, month, day, 23, 59, 59, 999);
    label = "Today";
  } else if (preset === "yesterday") {
    start = createISTDate(year, month, day - 1, 0, 0, 0, 0);
    end = createISTDate(year, month, day - 1, 23, 59, 59, 999);
    label = "Yesterday";
  } else if (preset === "last_3_days") {
    start = createISTDate(year, month, day - 2, 0, 0, 0, 0);
    label = "Last 3 Days";
  } else if (preset === "this_week") {
    const distanceToMonday = (dayOfWeek + 6) % 7;
    start = createISTDate(year, month, day - distanceToMonday, 0, 0, 0, 0);
    label = "This Week";
  } else if (preset === "last_7_days") {
    start = createISTDate(year, month, day - 6, 0, 0, 0, 0);
    label = "Last 7 Days";
  } else if (preset === "last_14_days") {
    start = createISTDate(year, month, day - 13, 0, 0, 0, 0);
    label = "Last 14 Days";
  } else if (preset === "this_month") {
    start = createISTDate(year, month, 1, 0, 0, 0, 0);
    label = "This Month";
  } else if (preset === "last_month") {
    start = createISTDate(year, month - 1, 1, 0, 0, 0, 0);
    end = createISTDate(year, month, 0, 23, 59, 59, 999);
    label = "Last Month";
  } else if (preset === "last_30_days") {
    start = createISTDate(year, month, day - 29, 0, 0, 0, 0);
    label = "Last 30 Days";
  } else if (preset === "all_data") {
    start = createISTDate(year, month, day - 180, 0, 0, 0, 0);
    label = "All Time (Maximum)";
  } else if (preset === "last_60_days" || preset === "this_year") {
    start = createISTDate(year, month, day - 59, 0, 0, 0, 0);
    label = "Last 60 Days (Shopify Limit)";
  } else if (preset === "custom" && customFrom && customTo) {
    try {
      const fromParts = customFrom.split("-").map(Number);
      const toParts = customTo.split("-").map(Number);
      start = createISTDate(fromParts[0], fromParts[1], fromParts[2], 0, 0, 0, 0);
      end = createISTDate(toParts[0], toParts[1], toParts[2], 23, 59, 59, 999);
      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      // Allow flexible historical custom range
      const maxHistory = createISTDate(year, month, day - 730, 0, 0, 0, 0);
      if (start < maxHistory) {
        start = maxHistory;
      }
      label = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: STORE_TIMEZONE })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: STORE_TIMEZONE })}`;
    } catch {
      start = createISTDate(year, month, day, 0, 0, 0, 0);
      end = createISTDate(year, month, day, 23, 59, 59, 999);
      label = "Today";
    }
  } else {
    // default: today
    start = createISTDate(year, month, day, 0, 0, 0, 0);
    end = createISTDate(year, month, day, 23, 59, 59, 999);
    label = "Today";
  }

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const startDateStr = formatLocalDate(start);
  const endDateStr = formatLocalDate(end);

  return {
    preset,
    label,
    startDate: start,
    endDate: end,
    startDateStr,
    endDateStr,
    days,
  };
}
