import { UserProfile } from "@clerk/nextjs";
import { cookies } from "next/headers";
import { saveCalendarPreference } from "./actions";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [cookieStore, params] = await Promise.all([cookies(), searchParams]);
  const preference = cookieStore.get("admin-week-start")?.value;
  const weekStart = preference === "Monday" ? "Monday" : "Sunday";

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Portal controls</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your admin account and portal preferences.</p>
      </header>
      {params.notice === "saved" && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Preference saved.</p>}
      {params.error === "preference" && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">Choose a valid first day of the week.</p>}
      <section className="rounded-lg border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose which day begins each week in the task calendar.</p>
        <form action={saveCalendarPreference} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Week starts on
            <select name="weekStart" defaultValue={weekStart} className="min-h-10 min-w-40 rounded-md border bg-background px-3">
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
            </select>
          </label>
          <button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Save preference</button>
        </form>
      </section>
      <section className="rounded-lg border bg-card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Admin account</h2>
        <UserProfile routing="hash" />
      </section>
    </div>
  );
}
