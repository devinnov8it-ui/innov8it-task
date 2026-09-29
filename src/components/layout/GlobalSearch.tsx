"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FileText, FolderKanban, MessageSquareText, Search, UserRound } from "lucide-react";

type SearchResults = {
  tasks: { id: string; title: string; status: string; priority: string }[];
  projects: { id: string; name: string; status: string }[];
  people: { id: string; name: string | null; email: string; role: string }[];
  comments: { id: string; content: string; taskId: string; taskTitle?: string; attachmentUrl: string | null }[];
  files: { id: string; attachmentUrl: string | null; taskId: string; taskTitle?: string }[];
};

const emptyResults: SearchResults = { tasks: [], projects: [], people: [], comments: [], files: [] };

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = () => {
      inputRef.current?.focus();
      setOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        focusSearch();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("global-search-focus", focusSearch);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("global-search-focus", focusSearch);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(emptyResults);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (response.ok) setResults(await response.json() as SearchResults);
      } catch {
        if (!controller.signal.aborted) setResults(emptyResults);
      }
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const total = results.tasks.length + results.projects.length + results.people.length + results.comments.length + results.files.length;
  const close = () => setOpen(false);

  return (
    <div className="relative hidden w-full max-w-sm lg:block">
      <div className="flex h-11 items-center gap-2 rounded-lg border bg-background/60 px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"><Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search tasks, projects, people..." aria-label="Global search" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">/</kbd></div>
  {open && query.trim().length >= 2 && <div className="absolute left-0 right-0 top-13 z-50 max-h-[min(34rem,calc(100vh-7rem))] overflow-y-auto rounded-xl border bg-card p-2 shadow-2xl"><SearchGroup title="Tasks" icon={FileText}>{results.tasks.map((task) => <Link key={task.id} href={`/dashboard/tasks/${task.id}`} onClick={close} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted"><span className="min-w-0 flex-1 truncate">{task.title}</span><span className="text-[10px] text-muted-foreground">{task.status.replace("_", " ")}</span></Link>)}</SearchGroup><SearchGroup title="Projects" icon={FolderKanban}>{results.projects.map((project) => <Link key={project.id} href={`/dashboard/projects#project-${project.id}`} onClick={close} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted"><span className="min-w-0 flex-1 truncate">{project.name}</span><span className="text-[10px] text-muted-foreground">{project.status}</span></Link>)}</SearchGroup><SearchGroup title="People" icon={UserRound}>{results.people.map((person) => <Link key={person.id} href="/dashboard/settings" onClick={close} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted"><span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{(person.name ?? person.email).charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1 truncate">{person.name || person.email}</span><span className="text-[10px] text-muted-foreground">{person.role}</span></Link>)}</SearchGroup><SearchGroup title="Comments" icon={MessageSquareText}>{results.comments.map((comment) => <Link key={comment.id} href={`/dashboard/tasks/${comment.taskId}#comments`} onClick={close} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted"><span className="min-w-0 flex-1 truncate">{comment.content}</span><span className="max-w-32 truncate text-[10px] text-muted-foreground">{comment.taskTitle}</span></Link>)}</SearchGroup><SearchGroup title="Files" icon={FileText}>{results.files.map((file) => <a key={file.id} href={file.attachmentUrl ?? "#"} target="_blank" rel="noreferrer" onClick={close} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted"><span className="min-w-0 flex-1 truncate">{file.attachmentUrl}</span><span className="text-[10px] text-muted-foreground">{file.taskTitle}</span></a>)}</SearchGroup>{total === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</p>}</div>}
    </div>
  );
}

function SearchGroup({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: ReactNode }) {
  return <section className="border-b py-1 last:border-b-0"><div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{title}</div>{children}</section>;
}
