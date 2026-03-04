import { useMemo, useRef, useState, useCallback } from "react";
import { useStore, CoachNudge, ReminderEvent } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell, Clock, AlertTriangle, TrendingDown,
  Shield, Compass, Sparkles, CheckCircle2, Sun, Moon, Calendar, RotateCcw, Trash2, X
} from "lucide-react";
import { REMINDER_LABELS } from "@/lib/reminderEngine";
import { hapticLight } from "@/lib/haptics";

const NUDGE_COLORS: Record<CoachNudge['type'], { bg: string; icon: string; iconEl: React.ReactNode }> = {
  overdue: { bg: "bg-red-50", icon: "text-red-500", iconEl: <AlertTriangle size={15} /> },
  'rhythm-drop': { bg: "bg-blue-50", icon: "text-blue-500", iconEl: <TrendingDown size={15} /> },
  'grace-usage': { bg: "bg-teal-50", icon: "text-teal-500", iconEl: <Shield size={15} /> },
  'domain-drift': { bg: "bg-purple-50", icon: "text-purple-500", iconEl: <Compass size={15} /> },
  reminder: { bg: "bg-amber-50", icon: "text-amber-500", iconEl: <Bell size={15} /> },
  progress: { bg: "bg-emerald-50", icon: "text-emerald-500", iconEl: <Sparkles size={15} /> },
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  'my-day-start': <Sun size={14} className="text-amber-500" />,
  'midday-recalibrate': <RotateCcw size={14} className="text-blue-500" />,
  'close-the-loop': <Moon size={14} className="text-indigo-400" />,
  'sunday-reset': <Calendar size={14} className="text-emerald-500" />,
  'daily-overdue': <AlertTriangle size={14} className="text-destructive/70" />,
  'test': <Bell size={14} className="text-amber-500" />,
  'progress': <Sparkles size={14} className="text-emerald-500" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SWIPE_THRESHOLD = 80;
const DELETE_VELOCITY = 0.5;

function SwipeToDelete({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [removing, setRemoving] = useState(false);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const locked = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (removing) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    locked.current = false;
  }, [removing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || removing) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        touchStart.current = null;
        setOffsetX(0);
        return;
      }
      if (Math.abs(dx) > 10) {
        locked.current = true;
      }
    }

    if (locked.current && dx < 0) {
      e.preventDefault();
      setOffsetX(Math.max(dx, -200));
    }
  }, [removing]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || removing) return;
    const elapsed = Date.now() - touchStart.current.time;
    const velocity = Math.abs(offsetX) / elapsed;

    if (Math.abs(offsetX) > SWIPE_THRESHOLD || velocity > DELETE_VELOCITY) {
      setRemoving(true);
      setOffsetX(-400);
      setTimeout(onDelete, 250);
    } else {
      setOffsetX(0);
    }
    touchStart.current = null;
    locked.current = false;
  }, [offsetX, onDelete, removing]);

  const deleteReveal = Math.min(Math.abs(offsetX), 120);

  return (
    <div className="relative overflow-hidden rounded-2xl" ref={containerRef}>
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive/90 rounded-2xl"
        style={{ width: deleteReveal > 0 ? `${deleteReveal}px` : 0, opacity: deleteReveal > 20 ? 1 : 0 }}
      >
        <div className="flex items-center gap-1.5 pr-4 text-white">
          <Trash2 size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Delete</span>
        </div>
      </div>
      <div
        className="relative z-10"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: removing ? 'transform 250ms ease-out, opacity 250ms ease-out' : offsetX === 0 ? 'transform 200ms ease-out' : 'none',
          opacity: removing ? 0 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export function ReminderCenter() {
  const { coachNudges, dismissNudge, snoozeNudge, reminderEvents, removeReminderEvent } = useStore();

  const today = new Date().toLocaleDateString('en-CA');
  const now = new Date().toISOString();

  const activeNudges = useMemo(() =>
    (coachNudges || []).filter(n => {
      if (n.dismissed) return false;
      if (n.snoozedUntil && n.snoozedUntil > now) return false;
      return true;
    }),
  [coachNudges, now]);

  const completedToday = useMemo(() =>
    (reminderEvents || [])
      .filter(e => e.dateKey === today && e.status === 'done')
      .sort((a, b) => (b.completedAt || b.firedAt).localeCompare(a.completedAt || a.firedAt)),
  [reminderEvents, today]);

  const missedToday = useMemo(() =>
    (reminderEvents || [])
      .filter(e => e.dateKey === today && e.status === 'fired')
      .filter(e => {
        const age = Date.now() - new Date(e.firedAt).getTime();
        return age > 4 * 60 * 60 * 1000;
      }),
  [reminderEvents, today]);

  const handleSnooze = (id: string) => {
    const later = new Date();
    later.setHours(later.getHours() + 2);
    snoozeNudge(id, later.toISOString());
    hapticLight();
  };

  const handleDismiss = (id: string) => {
    dismissNudge(id);
    hapticLight();
  };

  if (activeNudges.length === 0 && completedToday.length === 0 && missedToday.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 size={24} className="text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-foreground/80">All clear</p>
        <p className="text-[11px] text-muted-foreground mt-1">No active reminders right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeNudges.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 ml-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Active</p>
          </div>
          {activeNudges.map(nudge => {
            const colors = NUDGE_COLORS[nudge.type];
            return (
              <div
                key={nudge.id}
                data-testid={`nudge-${nudge.id}`}
                className={`${colors.bg} rounded-2xl p-4 ring-1 ring-black/[0.04] animate-in fade-in slide-in-from-top-2 duration-300`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0 ${colors.icon}`}>
                    {colors.iconEl}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-foreground">{nudge.title}</p>
                      <span className="text-[9px] text-muted-foreground/50">{timeAgo(nudge.createdAt)}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{nudge.message}</p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSnooze(nudge.id)}
                        className="h-7 rounded-lg text-[9px] font-bold uppercase px-2.5 text-muted-foreground/60 hover:text-muted-foreground gap-1"
                        data-testid={`snooze-${nudge.id}`}
                      >
                        <Clock size={10} /> Later
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDismiss(nudge.id)}
                        className="h-7 rounded-lg text-[9px] font-bold uppercase px-3 bg-white/70 text-foreground hover:bg-white gap-1 border-none shadow-none"
                        data-testid={`dismiss-${nudge.id}`}
                      >
                        <CheckCircle2 size={10} /> Got it
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completedToday.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 ml-1">Completed Today</p>
          {completedToday.map(event => (
            <SwipeToDelete key={event.id} onDelete={() => removeReminderEvent(event.id)}>
              <div className="flex items-center gap-3 px-3.5 py-3 bg-card rounded-2xl ring-1 ring-border/10" data-testid={`event-done-${event.id}`}>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  {EVENT_ICONS[event.templateType] || <Bell size={13} className="text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {event.name || 'Reminder'}
                  </p>
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                    {event.completedAt ? formatTime(event.completedAt) : formatTime(event.firedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg shrink-0">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-600">Done</span>
                </div>
              </div>
            </SwipeToDelete>
          ))}
        </div>
      )}

      {missedToday.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 ml-1">Missed</p>
          {missedToday.map(event => (
            <SwipeToDelete key={event.id} onDelete={() => removeReminderEvent(event.id)}>
              <div className="flex items-center gap-3 px-3.5 py-3 bg-card rounded-2xl ring-1 ring-red-100/40" data-testid={`event-missed-${event.id}`}>
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  {EVENT_ICONS[event.templateType] || <Bell size={13} className="text-destructive/70" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {event.name || 'Reminder'}
                  </p>
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                    {formatTime(event.firedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg shrink-0">
                  <X size={10} className="text-red-400" />
                  <span className="text-[9px] font-bold text-red-500">Missed</span>
                </div>
              </div>
            </SwipeToDelete>
          ))}
        </div>
      )}
    </div>
  );
}
