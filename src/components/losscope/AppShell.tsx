import { Link, useRouterState } from "@tanstack/react-router";
import { Scan, LayoutDashboard, Activity, ListChecks, FileText, Upload } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { hydrateLosscope, useLosscope } from "@/lib/losscope/store";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analysis", label: "Analyze Losses", icon: Activity },
  { to: "/recommendations", label: "Recommendations", icon: ListChecks },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { businessName, result } = useLosscope();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    hydrateLosscope();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">
        <span className="font-semibold">DEMO MODE</span> · {businessName} · 30 days of synthetic
        operational data · figures are estimates, not guarantees
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scan className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">LOSSCOPE AI</span>
          </Link>

          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/upload"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Upload className="size-3.5" /> Upload
            </Link>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{businessName}</div>
              <div className="text-xs text-muted-foreground">
                {result ? `Last 30 days · ${result.rowCount} rows` : "Last 30 days"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Losscope AI · Estimated potential recovery only — actual savings depend on implementation.
      </footer>
    </div>
  );
}
