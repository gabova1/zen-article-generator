import { Link, useLocation } from "wouter";
import { PenLine, History, BarChart3, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Генератор", icon: PenLine },
  { href: "/history", label: "История", icon: History },
  { href: "/stats", label: "Статистика", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden" data-testid="layout">
      <aside className="w-56 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col" data-testid="sidebar">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center">
              <PenLine className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="text-sidebar-foreground font-semibold text-sm leading-none">Дзен Студия</p>
              <p className="text-sidebar-accent-foreground/60 text-[11px] mt-0.5">Яндекс Дзен</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1" data-testid="nav">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  data-testid={`nav-${href === "/" ? "generator" : href.replace("/", "")}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={toggleTheme}
            data-testid="button-toggle-theme"
          >
            {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {isDark ? "Светлая тема" : "Тёмная тема"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0" data-testid="main-content">
        {children}
      </main>
    </div>
  );
}
