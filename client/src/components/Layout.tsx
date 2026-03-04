import { Link, useLocation } from "wouter";
import { LayoutDashboard, Sun, CheckSquare, Layers, Target, Compass, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { hapticLight } from "@/lib/haptics";
import { NudgeBanner } from "@/components/NudgeBanner";
import { runReminderCheck, resetNudgeCounter } from "@/lib/reminderEngine";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setIsKeyboardVisible(window.visualViewport.height < window.innerHeight - 100);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);

    useStore.getState().hydrateFromServer().then(() => {
      runReminderCheck();
    });
    useStore.getState().cleanupStore();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        resetNudgeCounter();
        runReminderCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Home" },
    { href: "/today", icon: Sun, label: "My Day" },
    { href: "/tasks", icon: CheckSquare, label: "Tasks" },
    { href: "/habits", icon: Layers, label: "Habits" },
    { href: "/identity", icon: Target, label: "Goals" },
    { href: "/review", icon: Compass, label: "Review" },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <NudgeBanner />
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain safe-top px-4 max-w-md mx-auto w-full relative nav-spacing">
        {children}
        <Link href="/coach">
          <Button
            onClick={() => hapticLight()}
            className="fixed z-40 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground right-4 coach-fab-bottom"
            size="icon"
            data-testid="button-coach-fab"
          >
            <Sparkles size={20} />
          </Button>
        </Link>
      </main>

      <nav className={cn(
        "app-nav bg-card border-t border-border/50 z-50 safe-bottom transition-transform duration-200 ease-out",
        isKeyboardVisible && "translate-y-full"
      )}>
        <div className="flex justify-around items-center py-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  onClick={() => hapticLight()}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[3rem] min-h-[2.75rem] gap-0.5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground/60"
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className={cn("text-[9px] leading-none", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
