"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunMoon } from "lucide-react";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 text-sm">
      <SunMoon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        suppressHydrationWarning
        disabled={!mounted}
        value={mounted ? theme : "system"}
        onChange={(event) => setTheme(event.target.value)}
        className="min-h-11 min-w-0 bg-transparent pr-1 outline-offset-2"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
