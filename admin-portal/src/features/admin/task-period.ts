export type TaskExportPeriod = "day" | "week" | "month";

export function getTaskPeriodRange(period: string, date: string, weekStart: "Sunday" | "Monday" = "Sunday") {
  if (period !== "day" && period !== "week" && period !== "month") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const selected = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(selected.getTime()) || selected.toISOString().slice(0, 10) !== date) return null;

  let start: Date;
  let end: Date;
  if (period === "day") {
    start = selected;
    end = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), selected.getUTCDate() + 1));
  } else if (period === "week") {
    const weekOffset = (selected.getUTCDay() - (weekStart === "Monday" ? 1 : 0) + 7) % 7;
    start = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), selected.getUTCDate() - weekOffset));
    end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7));
  } else {
    start = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
    end = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 1));
  }

  return { from: start.toISOString(), before: end.toISOString() };
}
