import Link from "next/link";
import { FolderKanban, ListChecks, Medal, TriangleAlert, UsersRound } from "lucide-react";

type AdminMember = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  created_at: string;
};

type AdminOverviewProps = {
  members: AdminMember[];
  taskLeaderboard: { id: string; name: string | null; email: string; completedTasks: number }[];
  stats: { people: number; projects: number; openTasks: number; overdueTasks: number };
  dataError: boolean;
};

const roleStyles = {
  OWNER: "border-amber-300 bg-amber-50 text-amber-800",
  ADMIN: "border-teal-200 bg-teal-50 text-teal-800",
  MEMBER: "border-border bg-muted text-muted-foreground",
} as const;

export function AdminOverview({ members, taskLeaderboard, stats, dataError }: AdminOverviewProps) {
  const metrics = [
    { label: "People", value: stats.people, description: "Registered accounts", icon: UsersRound, tone: "text-teal-700" },
    { label: "Projects", value: stats.projects, description: "Not archived", icon: FolderKanban, tone: "text-sky-700" },
    { label: "Open tasks", value: stats.openTasks, description: "Across the system", icon: ListChecks, tone: "text-amber-700" },
    { label: "Overdue", value: stats.overdueTasks, description: "Open and past due", icon: TriangleAlert, tone: "text-rose-700" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">System controls</p>
        <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">A live overview of people, projects, and task health.</p>
      </header>
      {dataError && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">Some admin data could not be loaded; displayed totals may be incomplete.</p>}
      <section aria-label="System metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, description, icon: Icon, tone }) => (
          <article key={label} className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className={`size-5 ${tone}`} aria-hidden="true" /></div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>
      <section className="rounded-lg border bg-card">
        <header className="flex items-center gap-3 border-b px-5 py-4">
          <Medal className="size-5 text-amber-600" aria-hidden="true" />
          <div><h2 className="font-semibold">Task leaderboard</h2><p className="mt-1 text-sm text-muted-foreground">Top people by completed tasks, all time.</p></div>
        </header>
        {taskLeaderboard.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No completed assigned tasks yet.</p> : (
          <ol className="divide-y px-5">
            {taskLeaderboard.map((person, index) => (
              <li key={person.id} className="flex items-center gap-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name?.trim() || "Unnamed user"}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{person.completedTasks} <span className="font-normal text-muted-foreground">{person.completedTasks === 1 ? "task" : "tasks"}</span></span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="rounded-lg border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div><h2 className="font-semibold">Recently added people</h2><p className="mt-1 text-sm text-muted-foreground">Latest accounts and access roles.</p></div>
          <Link href="/admin/users" className="inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Manage users</Link>
        </header>
        {members.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No member profiles are available.</p> : (
          <div className="overflow-x-auto px-5 pb-2">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="py-3 pr-4 font-medium">Account</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Joined</th></tr></thead>
              <tbody className="divide-y">{members.map((member) => <tr key={member.id}>
                <td className="py-3 pr-4"><p className="font-medium">{member.name?.trim() || "Unnamed user"}</p><p className="mt-1 text-xs text-muted-foreground">{member.email}</p></td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${roleStyles[member.role]}`}>{member.role}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(member.created_at))}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
