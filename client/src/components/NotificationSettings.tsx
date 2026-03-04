import { useState, useMemo } from "react";
import { useStore, ReminderType, DEFAULT_NOTIFICATION_SETTINGS } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Clock, Sun, Moon, Calendar, AlertTriangle, RotateCcw, Send, Check, History, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { getNextScheduledReminders, sendTestNotification, isPushAvailable, REMINDER_LABELS } from "@/lib/reminderEngine";

const SCHEDULE_META: Record<ReminderType, { label: string; description: string; icon: React.ReactNode }> = {
  'my-day-start': {
    label: 'My Day Start',
    description: 'Morning intention-setting reminder',
    icon: <Sun size={14} className="text-amber-500" />,
  },
  'midday-recalibrate': {
    label: 'Midday Recalibrate',
    description: 'Check-in and adjust your plan',
    icon: <RotateCcw size={14} className="text-blue-500" />,
  },
  'close-the-loop': {
    label: 'Close the Loop',
    description: 'Evening reflection reminder',
    icon: <Moon size={14} className="text-indigo-400" />,
  },
  'sunday-reset': {
    label: 'Sunday Reset',
    description: 'Weekly review and planning',
    icon: <Calendar size={14} className="text-emerald-500" />,
  },
  'daily-overdue': {
    label: 'Daily Overdue Summary',
    description: 'Gentle triage of overdue items',
    icon: <AlertTriangle size={14} className="text-destructive/70" />,
  },
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function NotificationSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { notificationSettings, updateNotificationSettings, updateReminderSchedule, reminderEvents } = useStore();
  const [showCenter, setShowCenter] = useState(false);

  const settings = notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;
  const schedules = settings.schedules || DEFAULT_NOTIFICATION_SETTINGS.schedules;
  const pushAvailable = useMemo(() => isPushAvailable(), []);

  const nextReminders = useMemo(() => showCenter ? getNextScheduledReminders() : [], [showCenter, settings]);

  const today = new Date().toLocaleDateString('en-CA');
  const completedToday = useMemo(() =>
    (reminderEvents || [])
      .filter(e => e.dateKey === today && e.status === 'done')
      .sort((a, b) => (b.completedAt || b.firedAt).localeCompare(a.completedAt || a.firedAt)),
  [reminderEvents, today, showCenter]);

  const handlePushToggle = async (enabled: boolean) => {
    if (!pushAvailable) {
      toast.info("Push not available here — in-app reminders will still work.");
      return;
    }
    if (enabled && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          updateNotificationSettings({ pushEnabled: true });
          hapticSuccess();
          toast.success("Push notifications enabled");
        } else {
          toast.error("Notification permission was denied");
        }
      } catch {
        toast.error("Push notifications are not supported");
      }
    } else {
      updateNotificationSettings({ pushEnabled: false });
    }
  };

  const handleToggleSchedule = (type: ReminderType, enabled: boolean) => {
    updateReminderSchedule(type, { enabled });
    hapticLight();
  };

  const handleTestReminder = (type: ReminderType) => {
    sendTestNotification(type);
    hapticSuccess();
    toast.success(`${SCHEDULE_META[type].label} test fired — check your reminders`);
  };

  const handleTestGeneric = () => {
    sendTestNotification();
    hapticSuccess();
    toast.success("Test notification sent");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] flex flex-col p-0 gap-0" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30 shrink-0">
          <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
            <Bell size={20} /> Notifications
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">General</h3>
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl ring-1 ring-border/10">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-primary opacity-50" />
                <div>
                  <p className="text-xs font-bold">In-app Reminders</p>
                  <p className="text-[10px] text-muted-foreground">Show nudges when you open the app</p>
                </div>
              </div>
              <Switch
                checked={settings.inAppReminders}
                onCheckedChange={(c) => { updateNotificationSettings({ inAppReminders: c }); hapticLight(); }}
                data-testid="toggle-in-app-reminders"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl ring-1 ring-border/10">
              <div className="flex items-center gap-3">
                {settings.pushEnabled ? <Bell size={16} className="text-emerald-500" /> : <BellOff size={16} className="text-muted-foreground/40" />}
                <div>
                  <p className="text-xs font-bold">Push Notifications</p>
                  <p className="text-[10px] text-muted-foreground">
                    {pushAvailable ? 'System-level alerts when app is installed' : 'Push not available — in-app reminders still work'}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={!pushAvailable}
                data-testid="toggle-push-notifications"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reminder Schedule</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Set times for each reminder. They'll appear as coach nudges when you open the app.
            </p>
            {schedules.map((schedule) => {
              const meta = SCHEDULE_META[schedule.type];
              return (
                <div
                  key={schedule.type}
                  className="p-4 bg-muted/20 rounded-xl ring-1 ring-border/10 space-y-3"
                  data-testid={`schedule-${schedule.type}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {meta.icon}
                      <div>
                        <p className="text-xs font-bold">{meta.label}</p>
                        <p className="text-[9px] text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(c) => handleToggleSchedule(schedule.type, c)}
                      data-testid={`toggle-schedule-${schedule.type}`}
                    />
                  </div>
                  {schedule.enabled && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Clock size={12} className="text-muted-foreground/40" />
                      <Input
                        type="time"
                        value={schedule.time}
                        onChange={(e) => updateReminderSchedule(schedule.type, { time: e.target.value })}
                        className="h-9 w-28 rounded-lg bg-background border-border/30 text-xs"
                        data-testid={`time-${schedule.type}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestReminder(schedule.type)}
                        className="h-8 rounded-lg text-[9px] text-muted-foreground ml-auto gap-1"
                        data-testid={`test-${schedule.type}`}
                      >
                        <Play size={10} /> Test
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence</h3>
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl ring-1 ring-border/10">
              <div>
                <p className="text-xs font-bold">Friction Prompts</p>
                <p className="text-[10px] text-muted-foreground">Ask why when you skip a habit or defer a task</p>
              </div>
              <select
                value={settings.frictionPromptFrequency || 'normal'}
                onChange={(e) => { updateNotificationSettings({ frictionPromptFrequency: e.target.value as any }); hapticLight(); }}
                className="text-xs bg-muted/30 border-none rounded-lg px-3 py-2 h-9 min-h-[36px]"
                data-testid="select-friction-frequency"
              >
                <option value="normal">Every time</option>
                <option value="light">Sometimes</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notification Center</h3>
            <Button
              variant="outline"
              onClick={handleTestGeneric}
              className="w-full h-11 rounded-xl text-xs gap-2"
              data-testid="button-test-notification"
            >
              <Send size={14} /> Send Test Notification
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCenter(!showCenter)}
              className="w-full h-10 rounded-xl text-[10px] text-muted-foreground gap-2"
              data-testid="button-toggle-center"
            >
              <History size={12} /> {showCenter ? 'Hide' : 'Show'} Notification Center
            </Button>

            {showCenter && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {nextReminders.length > 0 && (
                  <Card className="p-4 space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Upcoming Today</p>
                    {nextReminders.map(r => (
                      <div key={r.type} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2">
                          {SCHEDULE_META[r.type]?.icon}
                          <span className="font-medium">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{r.time}</span>
                          {r.firedToday ? (
                            <Badge className="bg-secondary/10 text-secondary border-none text-[8px]"><Check size={8} className="mr-0.5" /> Sent</Badge>
                          ) : r.due ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-none text-[8px]">Pending</Badge>
                          ) : (
                            <Badge className="bg-muted/20 text-muted-foreground border-none text-[8px]">Upcoming</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
                {completedToday.length > 0 && (
                  <Card className="p-4 space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Completed Today</p>
                    {completedToday.map((event) => (
                      <div key={event.id} className="flex items-center gap-2 text-xs py-1">
                        <CheckCircle2 size={10} className="text-secondary shrink-0" />
                        <span className="text-foreground font-medium flex-1">{event.name || 'Reminder'}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {event.completedAt ? formatTime(event.completedAt) : formatTime(event.firedAt)}
                        </span>
                      </div>
                    ))}
                  </Card>
                )}
                {nextReminders.length === 0 && completedToday.length === 0 && (
                  <Card className="p-4 text-center">
                    <p className="text-[10px] text-muted-foreground">No reminders scheduled. Enable some above.</p>
                  </Card>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground/50 italic text-center leading-relaxed">
              Reminders appear as in-app coach nudges when the app is opened or resumed.
            </p>
          </div>
        </div>
        <DialogFooter className="px-6 pb-4">
          <Button onClick={() => { onOpenChange(false); hapticLight(); }} className="w-full h-12 rounded-xl bg-primary" data-testid="button-done-notifications">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
