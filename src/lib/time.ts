const APP_TIME_ZONE = "Australia/Sydney";

function toValidDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDatePartsInTimeZone(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
}

export function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function formatISO(date: Date) {
  const { year, month, day } = formatDatePartsInTimeZone(date);
  return `${year}-${month}-${day}`;
}

export function getTodayISO() {
  return formatISO(new Date());
}

export function formatShortDate(value: string | Date) {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(date);
}

export function formatLongDate(value: string | Date) {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getOrdinalDay(day: number) {
  const mod10 = day % 10;
  const mod100 = day % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${day}st`;
  }

  if (mod10 === 2 && mod100 !== 12) {
    return `${day}nd`;
  }

  if (mod10 === 3 && mod100 !== 13) {
    return `${day}rd`;
  }

  return `${day}th`;
}

export function formatLongDateWithOrdinal(value: string | Date) {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(date);

  return `${month} ${getOrdinalDay(date.getDate())}, ${year}`;
}

export function formatDateTime(value: string | Date) {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function getDaysUntil(value: string | Date) {
  const target = toValidDate(value);
  const today = new Date();

  if (!target) {
    return 0;
  }

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
