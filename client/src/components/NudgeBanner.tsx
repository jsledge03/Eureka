import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { X, Bell, AlertTriangle, TrendingDown, Shield, Compass, Sparkles, Clock } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import type { CoachNudge } from "@/store/useStore";

const NUDGE_COLORS: Record<CoachNudge['type'], { bg: string; icon: string; accent: string }> = {
  overdue: { bg: "bg-red-50", icon: "text-red-500", accent: "ring-red-200/60" },
  'rhythm-drop': { bg: "bg-blue-50", icon: "text-blue-500", accent: "ring-blue-200/60" },
  'grace-usage': { bg: "bg-teal-50", icon: "text-teal-500", accent: "ring-teal-200/60" },
  'domain-drift': { bg: "bg-purple-50", icon: "text-purple-500", accent: "ring-purple-200/60" },
  reminder: { bg: "bg-amber-50", icon: "text-amber-500", accent: "ring-amber-200/60" },
  progress: { bg: "bg-emerald-50", icon: "text-emerald-500", accent: "ring-emerald-200/60" },
};

const NUDGE_ICONS: Record<CoachNudge['type'], React.ReactNode> = {
  overdue: <AlertTriangle size={16} />,
  'rhythm-drop': <TrendingDown size={16} />,
  'grace-usage': <Shield size={16} />,
  'domain-drift': <Compass size={16} />,
  reminder: <Bell size={16} />,
  progress: <Sparkles size={16} />,
};

export function NudgeBanner() {
  const { coachNudges, dismissNudge, snoozeNudge, notificationSettings } = useStore();
  const [exiting, setExiting] = useState(false);

  const latestActive = useMemo(() => {
    if (!notificationSettings?.inAppReminders) return null;
    const now = new Date().toISOString();
    return (coachNudges || []).find(n => {
      if (n.dismissed) return false;
      if (n.snoozedUntil && n.snoozedUntil > now) return false;
      return true;
    }) || null;
  }, [coachNudges, notificationSettings]);

  useEffect(() => {
    setExiting(false);
  }, [latestActive?.id]);

  if (!latestActive) return null;

  const colors = NUDGE_COLORS[latestActive.type];

  const handleDismiss = () => {
    setExiting(true);
    hapticLight();
    setTimeout(() => {
      dismissNudge(latestActive.id);
    }, 200);
  };

  const handleSnooze = () => {
    const later = new Date();
    later.setHours(later.getHours() + 2);
    setExiting(true);
    hapticLight();
    setTimeout(() => {
      snoozeNudge(latestActive.id, later.toISOString());
    }, 200);
  };

  return (
    <div
      className={`px-4 pt-[max(env(safe-area-inset-top),8px)] pb-2 z-[60] shrink-0 ${exiting ? 'animate-out fade-out slide-out-to-top-2 duration-200' : 'animate-in fade-in slide-in-from-top-2 duration-300'}`}
      data-testid="nudge-banner"
    >
      <div className={`max-w-md mx-auto rounded-2xl ${colors.bg} ring-1 ${colors.accent} p-3.5 shadow-sm`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center shrink-0 ${colors.icon}`}>
            {NUDGE_ICONS[latestActive.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">{latestActive.title}</p>
              <button
                onClick={handleDismiss}
                className="p-1 -mr-1 rounded-lg text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                data-testid="dismiss-banner"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5 pr-2">{latestActive.message}</p>
            <div className="flex gap-2 mt-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSnooze}
                className="h-7 rounded-lg text-[9px] font-bold uppercase px-2.5 text-muted-foreground/70 hover:text-muted-foreground gap-1"
                data-testid="snooze-banner"
              >
                <Clock size={10} /> 2h Later
              </Button>
              <Button
                size="sm"
                onClick={handleDismiss}
                className="h-7 rounded-lg text-[9px] font-bold uppercase px-3 bg-foreground/10 text-foreground hover:bg-foreground/20 gap-1 border-none shadow-none"
                data-testid="done-banner"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
