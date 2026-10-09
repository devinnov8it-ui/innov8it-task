"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Search, UserRoundPen, UserRoundX, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { deleteAdminUser, updateAdminUser } from "@/features/admin/actions";

export type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  created_at: string;
};

const roleStyles = {
  OWNER: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold",
  ADMIN: "border-primary/30 bg-primary/10 text-primary",
  MEMBER: "border-border bg-muted/40 text-muted-foreground",
} as const;

export function AdminUsersManager({
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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filteredUsers = users.filter((user) => {
    const matchesQuery = `${user.name ?? ""} ${user.email}`.toLowerCase().includes(deferredQuery);
    return matchesQuery && (roleFilter === "ALL" || user.role === roleFilter);
  });

  const dismissDelete = () => {
    setDeleteTarget(null);
    setConfirmation("");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Administration</p>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">Edit profile details and access roles for system accounts.</p>
        </div>
        <p className="text-sm text-muted-foreground">{filteredUsers.length} of {users.length} accounts</p>
      </header>

      {notice && <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-700 dark:text-green-300">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <section aria-label="User directory" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email"
              aria-label="Search users"
              className="min-h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter users by role"
            className="min-h-11 rounded-md border bg-background px-3 text-sm sm:w-44"
          >
            <option value="ALL">All roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Account</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th>
                <th scope="col" className="px-4 py-3 font-medium">Created</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const protectedOwner = user.role === "OWNER" && currentUserRole !== "OWNER";
                const canEdit = !protectedOwner;
                const canDelete = !isSelf && !protectedOwner;
                return (
                  <UserRows
                    key={user.id}
                    user={user}
                    isSelf={isSelf}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canGrantOwner={currentUserRole === "OWNER"}
                    editing={editingId === user.id}
                    onEdit={() => setEditingId(editingId === user.id ? null : user.id)}
                    onDelete={() => { setDeleteTarget(user); setConfirmation(""); }}
                  />
                );
              })}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No matching accounts.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog.Root open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) dismissDelete(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">Delete account?</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                  This permanently deletes the Supabase and Clerk account for {deleteTarget?.email}. This can also remove workspaces and tasks they own.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close dialog" className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-muted"><X className="size-4" aria-hidden="true" /></button>
              </Dialog.Close>
            </div>
            <form action={deleteAdminUser} className="mt-5 space-y-4">
              <input type="hidden" name="userId" value={deleteTarget?.id ?? ""} />
              <label className="block space-y-2">
                <span className="text-sm font-medium">Type the account email to confirm</span>
                <input
                  name="confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
                  required
                />
              </label>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild><button type="button" className="min-h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted">Cancel</button></Dialog.Close>
                <button
                  type="submit"
                  disabled={!deleteTarget || confirmation !== deleteTarget.email}
                  className="min-h-10 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete account
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function UserRows({
  user,
  isSelf,
  canEdit,
  canDelete,
  canGrantOwner,
  editing,
  onEdit,
  onDelete,
}: {
  user: ManagedUser;
  isSelf: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canGrantOwner: boolean;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr>
        <td className="px-4 py-3">
          <p className="font-medium">{user.name?.trim() || "Unnamed user"}{isSelf ? <span className="ml-2 text-xs text-muted-foreground">You</span> : null}</p>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${roleStyles[user.role]}`}>{user.role}</span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(user.created_at))}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            {canEdit && <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-muted"><UserRoundPen className="size-3.5" aria-hidden="true" />{editing ? "Close" : "Edit"}</button>}
            {canDelete && <button type="button" onClick={onDelete} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-destructive/25 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/5"><UserRoundX className="size-3.5" aria-hidden="true" />Delete</button>}
            {!canEdit && <span className="py-2 text-xs text-muted-foreground">Owner protected</span>}
            {isSelf && <span className="py-2 text-xs text-muted-foreground">Current account</span>}
          </div>
        </td>
      </tr>
      {editing && canEdit && (
        <tr>
          <td colSpan={4} className="bg-muted/15 px-4 py-4">
            <form action={updateAdminUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input type="hidden" name="userId" value={user.id} />
              <label className="space-y-1.5">
                <span className="text-xs font-medium">Display name</span>
                <input name="name" required maxLength={100} defaultValue={user.name ?? ""} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium">Email (identity)</span>
                <input value={user.email} readOnly aria-label="Account email, read only" className="min-h-10 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium">Avatar URL</span>
                <input name="avatar" type="url" maxLength={2000} defaultValue={user.avatar ?? ""} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm" />
              </label>
              <div className="flex items-end gap-3">
                {isSelf ? (
                  <label className="min-w-0 flex-1 space-y-1.5">
                    <span className="text-xs font-medium">Role</span>
                    <input type="hidden" name="role" value={user.role} />
                    <input value={`${user.role} (your role)`} readOnly className="min-h-10 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground" />
                  </label>
                ) : (
                  <label className="min-w-0 flex-1 space-y-1.5">
                    <span className="text-xs font-medium">Role</span>
                    <select name="role" defaultValue={user.role} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm">
                      {canGrantOwner && <option value="OWNER">Owner</option>}
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  </label>
                )}
                <button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Save</button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
