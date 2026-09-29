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

export function formatPhilippineDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatPhilippineDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
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
  return new Date(Date.UTC(year, month - 1, day, -8)).toISOString();
}
