import { FolderKanban, ListChecks, TriangleAlert, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhilippineDate } from "@/lib/time";

type AdminMember = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  created_at: string;
};

type AdminOverviewProps = {
  members: AdminMember[];
  stats: {
    memberCount: number;
    projectCount: number;
    openTaskCount: number;
    overdueTaskCount: number;
  };
  hasDataError: boolean;
};

const roleStyles = {
  OWNER: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold",
  ADMIN: "border-primary/30 bg-primary/10 text-primary",
  MEMBER: "border-border bg-muted/40 text-muted-foreground",
} as const;

export function AdminOverview({ members, stats, hasDataError }: AdminOverviewProps) {
  const metrics = [
    { label: "People", value: stats.memberCount, detail: "Registered accounts", icon: UsersRound, tone: "text-primary" },
    { label: "Projects", value: stats.projectCount, detail: "Not archived", icon: FolderKanban, tone: "text-brand-teal" },
    { label: "Open tasks", value: stats.openTaskCount, detail: "Across the system", icon: ListChecks, tone: "text-brand-gold" },
    { label: "Overdue", value: stats.overdueTaskCount, detail: "Open tasks past due", icon: TriangleAlert, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">System controls</p>
        <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">A live overview of people, projects, and task health.</p>
      </header>

      {hasDataError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Some administration data could not be loaded. Displayed totals may be incomplete.
        </p>
      )}

      <section aria-label="System metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className={`size-5 ${tone}`} aria-hidden="true" />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Recently added people</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Latest registered accounts and access roles.</p>
          </div>
          <span className="text-xs text-muted-foreground">{stats.memberCount} total</span>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No member profiles are available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-3 pr-4 font-medium">Person</th>
                    <th scope="col" className="px-4 py-3 font-medium">Role</th>
                    <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{member.name?.trim() || "Unnamed member"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{member.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${roleStyles[member.role]}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatPhilippineDate(member.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
