"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
function SignOutMenuItem() {
  return (
    <SignOutButton redirectUrl="/">
      <button
        type="button"
        data-pending-task-exit
        className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-sm hover:bg-muted"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </button>
    </SignOutButton>
  );
}
export function UserMenu({ name, email, avatar }: { name: string; email: string; avatar?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";
  const trigger = (
    <button
      type="button"
      disabled={!mounted}
      aria-label="Open account menu"
      className="flex min-h-11 items-center gap-2 rounded-lg p-1.5 hover:bg-muted"
    >
      {avatar ? <span aria-hidden="true" className="size-8 rounded-full border bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(avatar)})` }} /> : <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials}</span>}
      <span className="hidden max-w-32 truncate text-sm font-medium xl:block">
        {name}
      </span>
      <ChevronDown
        className="hidden size-4 text-muted-foreground sm:block"
        aria-hidden="true"
      />
    </button>
  );

  if (!mounted) return trigger;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-2 shadow-lg"
        >
          <DropdownMenu.Label className="px-3 py-3">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="mb-1 h-px bg-border" />
          <DropdownMenu.Item asChild onSelect={(event) => event.preventDefault()}>
            <SignOutMenuItem />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
