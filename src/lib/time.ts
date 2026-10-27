export const APP_TIME_ZONE = "Asia/Manila";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: APP_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});
const dateTimeInputFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: APP_TIME_ZONE,
});

export function formatPhilippineDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatPhilippineDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatPhilippineTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

export function getPhilippineDateTimeInputValue(value: string | Date) {
  const parts = Object.fromEntries(
    dateTimeInputFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function philippineDateTimeToUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new TypeError("Expected a valid Manila date and time.");
  }
  const date = new Date(`${value}:00+08:00`);
  if (Number.isNaN(date.getTime()) || getPhilippineDateTimeInputValue(date) !== value) {
    throw new TypeError("Expected a valid Manila date and time.");
  }
  return date.toISOString();
}

export function getPhilippineDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getPhilippineTodayKey() {
  return getPhilippineDateKey(new Date());
}

export function philippineDateToUtcStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new TypeError("Expected a valid Manila date.");
  }
  return new Date(Date.UTC(year, month - 1, day, -8)).toISOString();
}
