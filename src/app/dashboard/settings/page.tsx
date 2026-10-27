import { AlertTriangle, UserRound } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { deleteAccount } from "@/features/auth/actions";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { InviteMemberForm } from "@/features/auth/components/InviteMemberForm";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const metadataName = user.user_metadata?.name;
  const name = typeof metadataName === "string" ? metadataName : "";
  const metadataAvatar = user.user_metadata?.avatar_url;
  const avatar = typeof metadataAvatar === "string" ? metadataAvatar : "";
  const deletionErrorCode = params.error?.startsWith("delete-")
    ? decodeURIComponent(params.error.slice("delete-".length)).replace(/[^a-zA-Z0-9_-]/g, "")
    : "";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace preferences</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your profile and how Innov8IT looks for you.</p>
      </div>

      {params.notice === "profile" && <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-700 dark:text-green-300">Profile updated.</p>}
      {params.error === "profile" && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">We could not update your profile. Check the name and try again.</p>}
      {params.error === "delete" && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">We could not delete your account. Nothing was changed.</p>}
      {params.error === "delete-config" && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">Account deletion is not configured. Add the server-only SUPABASE_SERVICE_ROLE_KEY and try again.</p>}
      {deletionErrorCode && deletionErrorCode !== "config" && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">Account deletion failed at the Supabase operation ({deletionErrorCode}). Check the server log for the full provider response.</p>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-5 text-primary" aria-hidden="true" />Profile</CardTitle></CardHeader>
        <CardContent>
          <ProfileForm userId={user.id} email={user.email ?? ""} initialName={name} initialAvatar={avatar} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle><p className="text-sm text-muted-foreground">Choose the theme used on this device.</p></CardHeader>
        <CardContent><ThemeToggle /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invite a member</CardTitle><p className="text-sm text-muted-foreground">Send a secure invitation to join your workspace.</p></CardHeader>
        <CardContent><InviteMemberForm /></CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-5" aria-hidden="true" />Delete account</CardTitle><p className="text-sm text-muted-foreground">Permanently delete your profile, workspaces, tasks, comments, and notifications. This cannot be undone.</p></CardHeader>
        <CardContent>
          <form action={deleteAccount} className="space-y-4">
            <label className="block space-y-2"><span className="text-sm font-medium">Type DELETE to confirm</span><input name="confirmation" required pattern="DELETE" title="Type DELETE to confirm account deletion" autoComplete="off" className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" /></label>
            <div className="flex justify-end"><button type="submit" className="min-h-11 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:opacity-90">Delete account</button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
