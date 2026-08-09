import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();

  const icon =
    mode === "light" ? (
      <Sun className="size-4" />
    ) : mode === "dark" ? (
      <Moon className="size-4" />
    ) : (
      <Monitor className="size-4" />
    );

  const label =
    mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System";

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60"
      title={`Theme: ${label} (click to cycle)`}
      aria-label={`Current theme: ${label}. Click to switch.`}
    >
      {icon}
      <span className="hidden sm:inline text-xs">{label}</span>
    </button>
  );
}
