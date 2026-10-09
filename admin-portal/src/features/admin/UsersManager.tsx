"use client";

import { Search, UserRoundPen, UserRoundX, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { deleteUser, updateUser } from "@/features/admin/actions";
import { useAdminPresence } from "@/components/AdminPresenceProvider";

export type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  created_at: string;
};

const roleStyles = {
  OWNER: "border-amber-300 bg-amber-50 text-amber-800",
  ADMIN: "border-teal-200 bg-teal-50 text-teal-800",
  MEMBER: "border-border bg-muted text-muted-foreground",
} as const;

export function UsersManager({
  users,
  currentUserId,
  currentUserRole,
  notice,
  error,
}: {
  users: ManagedUser[];
  currentUserId: string;
  currentUserRole: "OWNER" | "ADMIN";
  notice?: string;
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const { onlineUserIds, connected, error: presenceError } = useAdminPresence();
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredUsers = users.filter((user) => {
    const matchesSearch = `${user.name ?? ""} ${user.email}`.toLowerCase().includes(deferredSearch);
    return matchesSearch && (roleFilter === "ALL" || user.role === roleFilter);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Administration</p><h1 className="text-3xl font-semibold tracking-tight">Users</h1><p className="mt-2 text-sm text-muted-foreground">Edit profile details and access roles for system accounts.</p></div>
        <p className="text-sm text-muted-foreground">{filteredUsers.length} of {users.length} accounts</p>
      </header>
      {notice && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}
      {presenceError && <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">Live online status is unavailable right now.</p>}

      <section aria-label="User directory" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search users" className="min-h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter users by role" className="min-h-11 rounded-md border bg-background px-3 text-sm sm:w-44">
            <option value="ALL">All roles</option><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="MEMBER">Member</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Account</th><th scope="col" className="px-4 py-3 font-medium">Role</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Created</th><th scope="col" className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody className="divide-y">
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const protectedOwner = user.role === "OWNER" && currentUserRole !== "OWNER";
                const canEdit = !protectedOwner;
                const canDelete = !isSelf && !protectedOwner;
                return <UserRow
                  key={user.id}
                  user={user}
                  online={onlineUserIds.has(user.id)}
                  presenceReady={connected && !presenceError}
                  isSelf={isSelf}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canGrantOwner={currentUserRole === "OWNER"}
                  editing={editingId === user.id}
                  onEdit={() => setEditingId(editingId === user.id ? null : user.id)}
                  onDelete={() => { setDeleteTarget(user); setConfirmation(""); }}
                />;
              })}
              {filteredUsers.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No matching accounts.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="delete-title" className="text-lg font-semibold">Delete account?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">This permanently deletes the Clerk and Supabase account for {deleteTarget.email}. Workspaces and tasks they own may also be removed.</p></div>
              <button type="button" aria-label="Close dialog" onClick={() => setDeleteTarget(null)} className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-muted"><X className="size-4" aria-hidden="true" /></button>
            </div>
            <form action={deleteUser} className="mt-5 space-y-4">
              <input type="hidden" name="userId" value={deleteTarget.id} />
              <label className="block space-y-2"><span className="text-sm font-medium">Type the account email to confirm</span><input name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" /></label>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="min-h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted">Cancel</button><button type="submit" disabled={confirmation !== deleteTarget.email} className="min-h-10 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Delete account</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  online,
  presenceReady,
  isSelf,
  canEdit,
  canDelete,
  canGrantOwner,
  editing,
  onEdit,
  onDelete,
}: {
  user: ManagedUser;
  online: boolean;
  presenceReady: boolean;
  isSelf: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canGrantOwner: boolean;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return <>
    <tr>
      <td className="px-4 py-3"><p className="font-medium">{user.name?.trim() || "Unnamed user"}{isSelf && <span className="ml-2 text-xs text-muted-foreground">You</span>}</p><p className="mt-1 text-xs text-muted-foreground">{user.email}</p></td>
      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${roleStyles[user.role]}`}>{user.role}</span></td>
      <td className="px-4 py-3">
        {presenceReady
          ? <span className="inline-flex items-center gap-2 text-xs"><span aria-hidden="true" className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />{online ? "Active now" : "Inactive"}</span>
          : <span className="text-xs text-muted-foreground">Checking…</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(user.created_at))}</td>
      <td className="px-4 py-3"><div className="flex justify-end gap-2">
        {canEdit && <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-muted"><UserRoundPen className="size-3.5" aria-hidden="true" />{editing ? "Close" : "Edit"}</button>}
        {canDelete && <button type="button" onClick={onDelete} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-rose-300 px-2.5 text-xs font-medium text-rose-800 hover:bg-rose-50"><UserRoundX className="size-3.5" aria-hidden="true" />Delete</button>}
        {!canEdit && <span className="py-2 text-xs text-muted-foreground">Owner protected</span>}
        {isSelf && <span className="py-2 text-xs text-muted-foreground">Current account</span>}
      </div></td>
    </tr>
    {editing && canEdit && <tr><td colSpan={5} className="bg-muted/30 px-4 py-4">
      <form action={updateUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input type="hidden" name="userId" value={user.id} />
        <label className="space-y-1.5"><span className="text-xs font-medium">Display name</span><input name="name" required maxLength={100} defaultValue={user.name ?? ""} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
        <label className="space-y-1.5"><span className="text-xs font-medium">Account email (read-only)</span><input value={user.email} readOnly aria-label="Account email, read only" className="min-h-10 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground" /></label>
        <label className="space-y-1.5"><span className="text-xs font-medium">Avatar URL</span><input name="avatar" type="url" maxLength={2000} defaultValue={user.avatar ?? ""} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
        <div className="flex items-end gap-3">
          {isSelf ? <label className="min-w-0 flex-1 space-y-1.5"><span className="text-xs font-medium">Role</span><input type="hidden" name="role" value={user.role} /><input value={`${user.role} (your role)`} readOnly className="min-h-10 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground" /></label> : <label className="min-w-0 flex-1 space-y-1.5"><span className="text-xs font-medium">Role</span><select name="role" defaultValue={user.role} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm">{canGrantOwner && <option value="OWNER">Owner</option>}<option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select></label>}
          <button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Save</button>
        </div>
      </form>
    </td></tr>}
  </>;
}
