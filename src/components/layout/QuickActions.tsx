"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Command, MailPlus, Plus, Search, X } from "lucide-react";

const actions = [
  { label: "Create task", shortcut: "N", href: "/dashboard/tasks#new-task", icon: Plus },
  { label: "Create project", shortcut: "P", href: "/dashboard/projects#new-project", icon: Plus },
  { label: "Invite member", shortcut: "I", href: "/dashboard/settings#invite-member", icon: MailPlus },
] as const;

export function QuickActions() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (event.key === "Escape") {
        setOpen(false);
        setPaletteOpen(false);
        return;
      }
      if (typing) return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        window.location.href = "/dashboard/tasks#new-task";
      } else if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        window.location.href = "/dashboard/projects#new-project";
      } else if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        window.location.href = "/dashboard/settings#invite-member";
      } else if (event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        if (event.key === "/") window.dispatchEvent(new Event("global-search-focus"));
        else setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (paletteOpen) inputRef.current?.focus();
  }, [paletteOpen]);

  const filteredActions = actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      {paletteOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/45 p-4 pt-[16vh] backdrop-blur-sm" onClick={() => setPaletteOpen(false)}><div role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-3 border-b px-4"><Search className="size-4 text-muted-foreground" aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions..." aria-label="Search actions" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" /><kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd></div><div className="p-2">{filteredActions.map(({ label, shortcut, href, icon: Icon }) => <Link key={label} href={href} onClick={() => setPaletteOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted"><Icon className="size-4 text-primary" aria-hidden="true" /><span className="flex-1">{label}</span><kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">{shortcut}</kbd></Link>)}{filteredActions.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No actions found.</p>}</div></div></div>}

      {open && <div className="fixed bottom-24 right-4 z-40 w-56 rounded-xl border bg-card p-2 shadow-xl sm:right-6"><div className="flex items-center justify-between px-3 py-2"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</span><button type="button" aria-label="Close quick actions" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden="true" /></button></div>{actions.map(({ label, shortcut, href, icon: Icon }) => <Link key={label} href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted"><Icon className="size-4 text-primary" aria-hidden="true" /><span className="flex-1">{label}</span><kbd className="text-[10px] text-muted-foreground">{shortcut}</kbd></Link>)}</div>}

      <button type="button" aria-label="Open quick actions" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="fixed bottom-6 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-1 hover:shadow-2xl sm:right-6"><Plus className={`size-6 transition-transform ${open ? "rotate-45" : ""}`} aria-hidden="true" /></button>
      <button type="button" aria-label="Open command palette" onClick={() => setPaletteOpen(true)} className="fixed bottom-6 left-4 z-30 hidden items-center gap-2 rounded-lg border bg-card/85 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm hover:border-primary/40 sm:flex"><Command className="size-3.5" aria-hidden="true" />Command palette <kbd className="rounded border px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></button>
    </>
  );
}
