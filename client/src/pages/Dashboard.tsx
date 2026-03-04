import { useMemo, useState } from "react";
import { useStore, DashboardWidgetId, DashboardWidget } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLocation } from "wouter";
import { ScoringInfoButton } from "@/components/ScoringTooltip";
import {
  TrendingUp, Shield, Target, Compass, Sparkles,
  Settings2, ChevronUp, ChevronDown, CheckCircle2,
  Circle, AlertTriangle, ArrowRight, Fingerprint, Sun,
  Eye, EyeOff, GripVertical
} from "lucide-react";
import { getWeeklyTrend } from "@/lib/alignmentEngine";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { computeRhythmTrend, computeMomentumTrend } from "@/lib/trendEngine";
import { Sparkline } from "@/components/Sparkline";

const WIDGET_LABELS: Record<DashboardWidgetId, { label: string; icon: React.ReactNode }> = {
  "north-star": { label: "North Star", icon: <Compass size={14} /> },
  "rhythm-score": { label: "Rhythm Score", icon: <TrendingUp size={14} /> },
  "grace-bank": { label: "Grace Bank", icon: <Shield size={14} /> },
  "momentum": { label: "Momentum", icon: <Sparkles size={14} /> },
  "today-habits": { label: "Today's Habits", icon: <CheckCircle2 size={14} /> },
  "today-tasks": { label: "Today's Tasks", icon: <Circle size={14} /> },
  "overdue-tasks": { label: "Overdue", icon: <AlertTriangle size={14} /> },
  "goal-progress": { label: "Goal Progress", icon: <Target size={14} /> },
  "weekly-focus": { label: "Weekly Focus", icon: <Compass size={14} /> },
  "identity-alignment": { label: "Identity Alignment", icon: <Fingerprint size={14} /> },
};

export default function Dashboard() {
  const store = useStore();
  const {
    goals, tasks, habits, logs, identities, dailyRhythms,
    graceDaysPerWeek, graceDaysUsedThisWeek,
    quarterPlans, currentQuarterKey, systemUpgrades,
    dashboardWidgets, toggleDashboardWidget, moveDashboardWidget,
  } = store;
  const [, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const todayDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const storeSnapshot = useMemo(() => ({ identities, goals, habits, tasks, logs, dailyRhythms, quarterPlans, currentQuarterKey }), [identities, goals, habits, tasks, logs, dailyRhythms, quarterPlans, currentQuarterKey]);
  const weeklyTrend = useMemo(() => getWeeklyTrend(storeSnapshot), [storeSnapshot]);
  const activeIdentities = identities.filter(i => i.isActive);
  if (activeIdentities.length === 0 && identities.length > 0) activeIdentities.push(identities[0]);
  const activeIdentity = activeIdentities[0];

  const currentPlan = quarterPlans.find(p => `${p.year}-Q${p.quarter}` === currentQuarterKey) || quarterPlans[0];

  const todayHabits = useMemo(() => {
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return habits.filter(h => !h.isPaused && (h.schedule === 'Daily' || h.schedule === dayName));
  }, [habits]);

  const todayLogs = useMemo(() => logs.filter(l => l.date === todayDate), [logs, todayDate]);

  const completedHabitsToday = useMemo(() => {
    return todayHabits.filter(h =>
      todayLogs.some(l => l.refId === h.id && (l.status === 'completed' || l.status === 'micro'))
    ).length;
  }, [todayHabits, todayLogs]);

  const todayTasks = useMemo(() => tasks.filter(t => !t.completed && t.dueDate === todayDate), [tasks, todayDate]);
  const completedTodayTasks = useMemo(() => tasks.filter(t => t.completed && t.dueDate === todayDate).length, [tasks, todayDate]);

  const overdueTasks = useMemo(() => tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayDate), [tasks, todayDate]);

  const rhythmScore = useMemo(() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const recentLogs = logs.filter(l => l.date >= fourteenDaysAgo.toLocaleDateString('en-CA'));
    const habitLogs = recentLogs.filter(l => l.type === 'habit');
    const taskLogs = recentLogs.filter(l => l.type === 'task');
    const habitScore = habitLogs.length > 0
      ? (habitLogs.filter(l => l.status === 'completed' || l.status === 'micro').length / habitLogs.length) * 100
      : 0;
    const taskScore = taskLogs.length > 0
      ? (taskLogs.filter(l => l.status === 'completed').length / taskLogs.length) * 100
      : 0;
    if (habitLogs.length === 0 && taskLogs.length === 0) return 0;
    if (habitLogs.length === 0) return Math.round(taskScore);
    if (taskLogs.length === 0) return Math.round(habitScore);
    return Math.round(habitScore * 0.7 + taskScore * 0.3);
  }, [logs]);

  const momentumScore = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekLogs = logs.filter(l => l.date >= sevenDaysAgo.toLocaleDateString('en-CA'));
    const total = weekLogs.length;
    if (total === 0) return 0;
    const good = weekLogs.filter(l => l.status === 'completed' || l.status === 'micro').length;
    return Math.round((good / total) * 100);
  }, [logs]);

  const rhythmTrend = useMemo(() => computeRhythmTrend(logs, 30), [logs]);
  const momentumTrend = useMemo(() => computeMomentumTrend(logs, 30), [logs]);

  const activeGoals = useMemo(() => goals.filter(g => !g.isPaused).slice(0, 4), [goals]);

  const visibleWidgets = useMemo(() =>
    (dashboardWidgets || []).filter(w => w.visible),
  [dashboardWidgets]);

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.id) {
      case "north-star":
        return (
          <Card key={widget.id} data-testid="widget-north-star" className="bg-primary/[0.03] border-none shadow-none rounded-[2rem] p-5 ring-1 ring-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10"><Target size={60} /></div>
            <div className="relative z-10">
              <p className="text-[9px] font-bold uppercase text-primary tracking-widest opacity-60 mb-1">North Star</p>
              <h3 className="text-xl font-serif text-primary leading-tight mb-2">{(() => {
                if (!currentPlan?.theme) return "Set a theme in Review";
                try { const p = JSON.parse(currentPlan.theme); if (Array.isArray(p)) return p.filter(Boolean).join(' · ') || "Set a theme in Review"; } catch {}
                return currentPlan.theme;
              })()}</h3>
              {currentPlan?.outcomes && currentPlan.outcomes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentPlan.outcomes.slice(0, 3).map((o, i) => (
                    <Badge key={i} className="bg-primary/10 text-primary border-none text-[8px] font-bold rounded-lg px-2 py-0.5">{o}</Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );

      case "rhythm-score":
        return (
          <Card key={widget.id} data-testid="widget-rhythm-score" className="bg-card border-none shadow-sm rounded-[1.5rem] p-5 text-center ring-1 ring-border/30">
            <TrendingUp size={20} className="mx-auto mb-2 text-primary opacity-40" />
            <div className="text-3xl font-serif text-primary tracking-tighter">{rhythmScore}%</div>
            <div className="flex justify-center mt-1.5 mb-1">
              <Sparkline data={rhythmTrend} width={72} height={24} color="hsl(var(--primary))" gradientId="rhythm-spark" />
            </div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5 tracking-widest opacity-60 flex items-center justify-center gap-1">
              Rhythm <ScoringInfoButton type="rhythm-score" size={11} />
            </div>
          </Card>
        );

      case "grace-bank":
        return (
          <Card key={widget.id} data-testid="widget-grace-bank" className="bg-card border-none shadow-sm rounded-[1.5rem] p-5 text-center ring-1 ring-border/30">
            <Shield size={20} className="mx-auto mb-2 text-secondary opacity-40" />
            <div className="text-3xl font-serif text-secondary tracking-tighter">{graceDaysPerWeek - graceDaysUsedThisWeek}</div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground mt-1 tracking-widest opacity-60">Grace Bank</div>
          </Card>
        );

      case "momentum":
        return (
          <Card key={widget.id} data-testid="widget-momentum" className="bg-card border-none shadow-sm rounded-[1.5rem] p-5 text-center ring-1 ring-border/30">
            <Sparkles size={20} className="mx-auto mb-2 text-amber-500 opacity-40" />
            <div className="text-3xl font-serif text-foreground tracking-tighter">{momentumScore}%</div>
            <div className="flex justify-center mt-1.5 mb-1">
              <Sparkline data={momentumTrend} width={72} height={24} color="hsl(38, 92%, 50%)" gradientId="momentum-spark" />
            </div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5 tracking-widest opacity-60 flex items-center justify-center gap-1">
              Momentum <ScoringInfoButton type="momentum" size={11} />
            </div>
          </Card>
        );

      case "today-habits":
        return (
          <Card key={widget.id} data-testid="widget-today-habits" className="bg-card border-none shadow-sm rounded-[1.5rem] ring-1 ring-border/20 overflow-hidden"
            onClick={() => setLocation("/habits")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <ScoringInfoButton type="daily-rhythm" size={11} /> Today's Habits
                </span>
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold">
                  {completedHabitsToday}/{todayHabits.length}
                </Badge>
              </div>
              {todayHabits.length > 0 ? (
                <Progress value={todayHabits.length > 0 ? (completedHabitsToday / todayHabits.length) * 100 : 0} className="h-1.5 rounded-full" />
              ) : (
                <p className="text-[11px] text-muted-foreground italic">No habits scheduled today</p>
              )}
              {todayHabits.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {todayHabits.slice(0, 3).map(h => {
                    const done = todayLogs.some(l => l.refId === h.id && (l.status === 'completed' || l.status === 'micro'));
                    return (
                      <div key={h.id} className="flex items-center gap-2 text-[11px]">
                        {done ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> : <Circle size={12} className="text-muted-foreground/30 shrink-0" />}
                        <span className={done ? "text-muted-foreground line-through" : "text-foreground/80"}>{h.title}</span>
                      </div>
                    );
                  })}
                  {todayHabits.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/50 italic">+{todayHabits.length - 3} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "today-tasks":
        return (
          <Card key={widget.id} data-testid="widget-today-tasks" className="bg-card border-none shadow-sm rounded-[1.5rem] ring-1 ring-border/20 overflow-hidden"
            onClick={() => setLocation("/tasks")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Tasks</span>
                <Badge className="bg-secondary/10 text-secondary border-none text-[9px] font-bold">
                  {completedTodayTasks}/{todayTasks.length + completedTodayTasks}
                </Badge>
              </div>
              {todayTasks.length > 0 ? (
                <div className="space-y-1.5">
                  {todayTasks.slice(0, 3).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-[11px]">
                      <Circle size={12} className="text-muted-foreground/30 shrink-0" />
                      <span className="text-foreground/80 truncate">{t.title}</span>
                      {t.priority === 'High' && <Badge className="bg-destructive/10 text-destructive border-none text-[7px] px-1 py-0 shrink-0">!</Badge>}
                    </div>
                  ))}
                  {todayTasks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/50 italic">+{todayTasks.length - 3} more</p>
                  )}
                </div>
              ) : completedTodayTasks > 0 ? (
                <p className="text-[11px] text-emerald-600 italic">All done for today</p>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">No tasks due today</p>
              )}
            </CardContent>
          </Card>
        );

      case "overdue-tasks":
        return (
          <Card key={widget.id} data-testid="widget-overdue-tasks" className={`${overdueTasks.length > 0 ? 'bg-destructive/[0.03] ring-destructive/10' : 'bg-card ring-border/20'} border-none shadow-sm rounded-[1.5rem] ring-1 overflow-hidden`}
            onClick={() => setLocation("/tasks")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${overdueTasks.length > 0 ? 'text-destructive/70' : 'text-muted-foreground'}`}>
                  <AlertTriangle size={12} /> Overdue
                </span>
                <Badge className={`border-none text-[9px] font-bold ${overdueTasks.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/30 text-muted-foreground'}`}>{overdueTasks.length}</Badge>
              </div>
              {overdueTasks.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {overdueTasks.slice(0, 2).map(t => (
                    <p key={t.id} className="text-[11px] text-foreground/70 truncate">{t.title}</p>
                  ))}
                  {overdueTasks.length > 2 && <p className="text-[10px] text-muted-foreground/50 italic">+{overdueTasks.length - 2} more</p>}
                </div>
              ) : (
                <p className="text-[11px] text-emerald-600 italic mt-2">All clear — nothing overdue</p>
              )}
            </CardContent>
          </Card>
        );

      case "goal-progress":
        return (
          <Card key={widget.id} data-testid="widget-goal-progress" className="bg-card border-none shadow-sm rounded-[1.5rem] ring-1 ring-border/20 overflow-hidden"
            onClick={() => setLocation("/identity")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Target size={12} className="text-primary opacity-50" /> Goal Progress
                </span>
                <ArrowRight size={14} className="text-muted-foreground/30" />
              </div>
              {activeGoals.length > 0 ? (
                <div className="space-y-3">
                  {activeGoals.map(goal => {
                    const linkedTasks = tasks.filter(t => t.goalId === goal.id);
                    const linkedHabits = habits.filter(h => h.goalId === goal.id);
                    let autoProg = 0;
                    if (linkedTasks.length > 0 || linkedHabits.length > 0) {
                      const taskCompl = linkedTasks.length > 0 ? (linkedTasks.filter(t => t.completed).length / linkedTasks.length) * 100 : 0;
                      const habitCompl = linkedHabits.length > 0 ? 50 : 0;
                      autoProg = Math.round((taskCompl + habitCompl) / (linkedHabits.length > 0 ? 2 : 1));
                    }
                    const prog = goal.isManualProgress ? goal.currentProgress : autoProg;
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between items-center text-[10px] font-bold mb-1 uppercase tracking-tight">
                          <span className="text-foreground/70 truncate pr-4">{goal.title}</span>
                          <span className="text-primary">{prog}%</span>
                        </div>
                        <Progress value={prog} className="h-1 rounded-full bg-muted/50" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">No active goals yet — set one in Goals</p>
              )}
            </CardContent>
          </Card>
        );

      case "weekly-focus":
        return (
          <Card key={widget.id} data-testid="widget-weekly-focus" className="bg-card border-none shadow-sm rounded-[1.5rem] ring-1 ring-border/20 overflow-hidden"
            onClick={() => setLocation("/review")}>
            <CardContent className="p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weekly Focus</span>
              {currentPlan?.focusDomains && currentPlan.focusDomains.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentPlan.focusDomains.map(d => (
                    <Badge key={d} variant="outline" className="border-primary/20 text-primary text-[9px] font-bold uppercase">{d}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic mt-2">Not set — run Sunday Reset in Review</p>
              )}
            </CardContent>
          </Card>
        );

      case "identity-alignment":
        return (
          <Card key={widget.id} data-testid="widget-identity-alignment" className="bg-card border-none shadow-sm rounded-[1.5rem] ring-1 ring-border/20 overflow-hidden"
            onClick={() => setLocation("/identity")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Fingerprint size={12} className="text-primary opacity-50" /> Identity Alignment <ScoringInfoButton type="identity-alignment" size={11} />
                </span>
                {systemUpgrades.identityAlignment && identities.length > 0 && (
                  <span className="text-lg font-serif text-primary" data-testid="text-dashboard-alignment">{weeklyTrend.current}%</span>
                )}
              </div>
              {systemUpgrades.identityAlignment && identities.length > 0 ? (
                <>
                  <Progress value={weeklyTrend.current} className="h-1 rounded-full" />
                  <p className="text-[10px] text-muted-foreground italic mt-2">
                    {activeIdentities.flatMap(i => i.values).length > 0 ? `Your actions align with: ${activeIdentities.flatMap(i => i.values).slice(0, 4).join(", ")}` : "Your goals are downstream from identity."}
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Enable Identity Score in Coach to track alignment</p>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const smallWidgets = ['rhythm-score', 'grace-bank', 'momentum'];

  const groupedWidgets = useMemo(() => {
    const groups: { type: 'pair' | 'single'; widgets: DashboardWidget[] }[] = [];
    let pairBuffer: DashboardWidget[] = [];

    for (const w of visibleWidgets) {
      if (smallWidgets.includes(w.id)) {
        pairBuffer.push(w);
        if (pairBuffer.length === 2) {
          groups.push({ type: 'pair', widgets: [...pairBuffer] });
          pairBuffer = [];
        }
      } else {
        if (pairBuffer.length > 0) {
          groups.push({ type: 'pair', widgets: [...pairBuffer] });
          pairBuffer = [];
        }
        groups.push({ type: 'single', widgets: [w] });
      }
    }
    if (pairBuffer.length > 0) {
      groups.push({ type: 'pair', widgets: pairBuffer });
    }
    return groups;
  }, [visibleWidgets, rhythmScore, graceDaysPerWeek, graceDaysUsedThisWeek, momentumScore]);

  return (
    <div className="space-y-4 pb-10 animate-in fade-in duration-500">
      <header className="pt-6 pb-1 flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-serif text-primary mt-1">Life Compass</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/today")}
            className="rounded-full h-10 w-10 min-h-[44px] min-w-[44px] bg-primary/10 text-primary"
            data-testid="button-go-to-today"
          >
            <Sun size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="rounded-full h-10 w-10 min-h-[44px] min-w-[44px] bg-muted/30 text-muted-foreground"
            data-testid="button-dashboard-settings"
          >
            <Settings2 size={18} />
          </Button>
        </div>
      </header>

      {groupedWidgets.map((group, gi) => {
        if (group.type === 'pair') {
          return (
            <div key={gi} className="grid grid-cols-2 gap-3">
              {group.widgets.map(w => renderWidget(w))}
            </div>
          );
        }
        return <div key={gi}>{renderWidget(group.widgets[0])}</div>;
      })}

      {visibleWidgets.length === 0 && (
        <Card className="bg-muted/20 border-none rounded-[2rem] p-8 text-center">
          <p className="text-sm text-muted-foreground">No widgets visible. Tap the gear icon to customize your dashboard.</p>
        </Card>
      )}

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Settings2 size={18} className="text-primary" /> Section Layout
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Show, hide, or reorder your dashboard widgets.
          </p>
          <div className="space-y-1.5">
            {(dashboardWidgets || []).map((w, idx) => {
              const meta = WIDGET_LABELS[w.id];
              return (
                <div
                  key={w.id}
                  data-testid={`widget-setting-${w.id}`}
                  className={`flex items-center gap-2 p-3 rounded-xl ring-1 transition-all ${
                    w.visible ? 'ring-border/20 bg-card' : 'ring-border/10 bg-muted/30 opacity-60'
                  }`}
                >
                  <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                  <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === 0}
                      onClick={() => { moveDashboardWidget(w.id, 'up'); hapticLight(); }}
                      data-testid={`move-up-${w.id}`}
                    >
                      <ChevronUp size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === dashboardWidgets.length - 1}
                      onClick={() => { moveDashboardWidget(w.id, 'down'); hapticLight(); }}
                      data-testid={`move-down-${w.id}`}
                    >
                      <ChevronDown size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => { toggleDashboardWidget(w.id); hapticMedium(); }}
                      data-testid={`toggle-${w.id}`}
                    >
                      {w.visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="outline" className="w-full h-11 rounded-2xl mt-4 text-xs font-bold"
            onClick={() => setSettingsOpen(false)} data-testid="button-close-dashboard-layout"
          >
            Done
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
