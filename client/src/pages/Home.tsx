import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCw, CheckCircle2, Sparkles, ArrowRight, Shield, Sun, Moon, Coffee, Zap, Target, X, LayoutList, Gauge, ClipboardList, Settings2, ChevronUp, ChevronDown, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useStore, type ReasonTag, dismissSessionNotification, isSessionNotificationDismissed, DEFAULT_HOME_SECTIONS } from "@/store/useStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScoringInfoButton } from "@/components/ScoringTooltip";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { generateProofEvent } from "@/lib/proofEngine";
import { computeGravityScores } from "@/lib/gravityEngine";
import { computeAllStreaks, computeHabitStreak, computeGoalStreak, getStreakLabel, type StreakInfo } from "@/lib/streakEngine";
import { StreakCelebration } from "@/components/StreakCelebration";
import { computeCommitmentBudget, computeCommitmentUsage, isOverloaded } from "@/lib/commitmentEngine";

export default function Home() {
  const store = useStore();
  const { habits, tasks, goals, addTask, updateHabit, updateTask, logCompletion, systemUpgrades, dailyRhythms, saveDailyRhythm, quarterPlans, currentQuarterKey, updateSystemUpgrade, identities, addProofEvent, getActiveIdentity, getActiveIdentities, seasonMode, logs, frictionPromptShownToday, addFrictionEvent, markMilestoneCelebrated, isMilestoneCelebrated, homeSections, toggleSectionVisibility, moveSection } = store;
  const activeIdentities = identities.filter(i => i.isActive);
  if (activeIdentities.length === 0 && identities.length > 0) activeIdentities.push(identities[0]);
  const activeIdentity = activeIdentities[0];
  const todayDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []); // YYYY-MM-DD local
  const todayDisplay = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), []);
  const todayRhythm = dailyRhythms[todayDate];
  const [, setLocation] = useLocation();

  const [isMorningFlowOpen, setIsMorningFlowOpen] = useState(false);
  const [isRecalibrateOpen, setIsRecalibrateOpen] = useState(false);
  const [isEveningFlowOpen, setIsEveningFlowOpen] = useState(false);
  const [isHomeLayoutOpen, setIsHomeLayoutOpen] = useState(false);

  const orderedHomeSections = useMemo(() => {
    if (homeSections.length === 0) return DEFAULT_HOME_SECTIONS;
    const missing = DEFAULT_HOME_SECTIONS.filter(d => !homeSections.some(s => s.id === d.id));
    return missing.length > 0 ? [...homeSections, ...missing] : homeSections;
  }, [homeSections]);
  const isHomeSectionVisible = useCallback((id: string) => {
    const s = orderedHomeSections.find(s => s.id === id);
    return s ? s.visible : true;
  }, [orderedHomeSections]);
  const homeSectionOrder = useCallback((id: string) => {
    const idx = orderedHomeSections.findIndex(s => s.id === id);
    return idx >= 0 ? idx : 99;
  }, [orderedHomeSections]);
  const HOME_SECTION_LABELS: Record<string, string> = {
    'alerts': 'System Alerts',
    'backlog': 'Backlog Alert',
    'triage': 'Midday Recalibrate',
    'habits': 'Daily Rhythm',
    'recovery': 'Recovery Lane',
    'tasks': 'Focus Areas',
  };

  const [isFrictionPromptOpen, setIsFrictionPromptOpen] = useState(false);
  const [frictionTarget, setFrictionTarget] = useState<{ entityType: 'habit' | 'task'; entityId: string; entityTitle: string } | null>(null);
  const [frictionSelectedTag, setFrictionSelectedTag] = useState<ReasonTag | null>(null);
  const [frictionNote, setFrictionNote] = useState('');
  const REASON_TAGS: ReasonTag[] = ['Time', 'Energy', 'Environment', 'Emotion', 'Overload', 'Forgetfulness', 'Unclear'];

  const frictionFrequency = store.notificationSettings?.frictionPromptFrequency ?? 'normal';

  const showFrictionPrompt = (entityType: 'habit' | 'task', entityId: string, entityTitle: string) => {
    if (frictionFrequency === 'off' && !systemUpgrades.frictionAudit) return;
    if (!systemUpgrades.frictionAudit && frictionPromptShownToday === todayDate) return;
    if (frictionFrequency === 'light' && !systemUpgrades.frictionAudit && Math.random() > 0.5) return;
    setFrictionTarget({ entityType, entityId, entityTitle });
    setFrictionSelectedTag(null);
    setFrictionNote('');
    setIsFrictionPromptOpen(true);
  };

  const handleFrictionSubmit = () => {
    if (!frictionTarget || !frictionSelectedTag) return;
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    addFrictionEvent({
      entityType: frictionTarget.entityType,
      entityId: frictionTarget.entityId,
      entityTitle: frictionTarget.entityTitle,
      dateKey: todayDate,
      reasonTag: frictionSelectedTag,
      note: frictionNote,
      context: {
        timeOfDay,
        dayOfWeek,
        energy: todayRhythm?.energy ?? 3,
        season: seasonMode,
      },
    });
    store.setFrictionPromptShown(todayDate);
    setIsFrictionPromptOpen(false);
    hapticLight();
    toast.success("Friction logged. Patterns will surface in Coach.");
  };

  // Morning Flow State
  const [morningStep, setMorningStep] = useState(0);
  const [morningData, setMorningData] = useState({
    energy: 3,
    mood: '',
    capacity: 'Sustain' as const,
    topOutcomes: [] as string[]
  });

  // Recalibrate State
  const [recalibrateStatus, setRecalibrateStatus] = useState<'on-track' | 'behind' | 'overloaded' | null>(null);

  // Evening Flow State
  const [eveningData, setEveningData] = useState({
    wins: '',
    friction: '',
    lesson: '',
    alignment: 3
  });

  const tomorrowDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
  }, []);

  const todayTasks = useMemo(() => tasks.filter(t => t.dueDate === todayDate && !t.completed), [tasks, todayDate]);
  const overdueTasks = useMemo(() => tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayDate), [tasks, todayDate]);
  const activeHabits = useMemo(() => habits.filter(h => !h.isPaused), [habits]);
  const recoveryTasks = useMemo(() => tasks.filter(t => t.labels.includes('Recovery') && t.dueDate === todayDate && !t.completed), [tasks, todayDate]);

  const filteredHabits = useMemo(() => {
    const base = habits.filter(h => !h.isPaused);
    if (systemUpgrades.keystoneMode) {
      const keystoneOnly = base.filter(h => h.isKeystone);
      if (keystoneOnly.length > 0) return keystoneOnly;
    }
    if (!systemUpgrades.focusMode) return base;
    return [...base].sort((a, b) => Number(!!b.isKeystone) - Number(!!a.isKeystone)).slice(0, 5);
  }, [habits, systemUpgrades.focusMode, systemUpgrades.keystoneMode]);

  const gravityScores = useMemo(() => computeGravityScores(habits, logs, tasks, dailyRhythms, goals, identities), [habits, logs, tasks, dailyRhythms, goals, identities]);

  const habitStreaks = useMemo(() => computeAllStreaks(habits, logs, todayDate), [habits, logs, todayDate]);

  const [celebrationData, setCelebrationData] = useState<{ title: string; label?: string; currentStreak: number; milestone: NonNullable<StreakInfo['milestone']> } | null>(null);

  const [dismissTick, setDismissTick] = useState(0);
  const handleDismissNotification = useCallback((key: string) => {
    dismissSessionNotification(key);
    setDismissTick(t => t + 1);
    hapticLight();
  }, []);

  const energyLevel = todayRhythm?.energy ?? 3;

  const commitmentBudget = useMemo(() => computeCommitmentBudget(seasonMode, dailyRhythms, store.commitmentBudgetBase), [seasonMode, dailyRhythms, store.commitmentBudgetBase]);
  const commitmentUsage = useMemo(() => computeCommitmentUsage(goals, habits, tasks, store.frictionEvents), [goals, habits, tasks, store.frictionEvents]);
  const systemOverloaded = isOverloaded(commitmentUsage.totalUsed, commitmentBudget.totalBudget);

  const strictModeActive = store.isStrictModeActive();
  const strictOverdueCount = overdueTasks.length;
  const strictTasksToday = todayTasks.length;

  const displayedTasks = useMemo(() => {
    let base = todayTasks.filter(t => !t.labels.includes('Recovery'));
    if (systemUpgrades.energyScheduling) {
      const energyRank: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
      if (energyLevel <= 2) {
        base = [...base].sort((a, b) => (energyRank[a.energy] || 2) - (energyRank[b.energy] || 2));
      } else if (energyLevel >= 4) {
        base = [...base].sort((a, b) => (energyRank[b.energy] || 2) - (energyRank[a.energy] || 2));
      }
    }
    if (!systemUpgrades.focusMode) return base;
    return base.slice(0, 3);
  }, [todayTasks, systemUpgrades.focusMode, systemUpgrades.energyScheduling, energyLevel]);

  const currentPlan = quarterPlans.find(p => `${p.year}-Q${p.quarter}` === currentQuarterKey) || quarterPlans[0];

  const toggleHabit = (habitId: string, checked: boolean) => {
    logCompletion({ type: 'habit', refId: habitId, date: todayDate, status: checked ? 'completed' : 'skipped' });
    if (checked) {
      hapticSuccess();
      toast.success("Habit logged.");
      setTimeout(() => {
        const updatedState = useStore.getState();
        const streakInfo = computeHabitStreak(habitId, updatedState.logs, todayDate);
        const milestone = streakInfo.milestone;
        if (milestone && !updatedState.isMilestoneCelebrated(habitId, milestone.days)) {
          const habit = habits.find(h => h.id === habitId);
          markMilestoneCelebrated(habitId, milestone.days);
          setCelebrationData({ title: habit?.title || 'Habit', label: 'Habit Streak', currentStreak: streakInfo.currentStreak, milestone });
          const proofEvent = generateProofEvent('streak-milestone', {
            habitId,
            habitTitle: habit?.title,
            domain: habit?.domain || undefined,
            streakDays: streakInfo.currentStreak,
            streakLabel: milestone.label,
          }, updatedState);
          addProofEvent(proofEvent);
        }
      }, 100);
    } else {
      hapticLight();
      const habit = habits.find(h => h.id === habitId);
      if (habit) showFrictionPrompt('habit', habitId, habit.title);
    }
  };

  const toggleTask = (taskId: string, currentCompleted: boolean) => {
    updateTask(taskId, { completed: !currentCompleted });
    logCompletion({ type: 'task', refId: taskId, date: todayDate, status: !currentCompleted ? 'completed' : 'skipped' });
    if (!currentCompleted) {
      hapticSuccess();
      toast.success("Task complete.");
      const task = tasks.find(t => t.id === taskId);
      if (task?.goalId) {
        setTimeout(() => {
          const updatedState = useStore.getState();
          const goalStreak = computeGoalStreak(task.goalId!, updatedState.tasks, updatedState.logs, todayDate);
          const milestone = goalStreak.milestone;
          if (milestone && !updatedState.isMilestoneCelebrated(`goal-${task.goalId}`, milestone.days)) {
            const goal = goals.find(g => g.id === task.goalId);
            markMilestoneCelebrated(`goal-${task.goalId}`, milestone.days);
            setCelebrationData({ title: goal?.title || 'Goal', label: 'Goal Streak', currentStreak: goalStreak.currentStreak, milestone });
            const proofEvent = generateProofEvent('streak-milestone', {
              habitId: task.goalId!,
              habitTitle: goal?.title,
              domain: goal?.domain || undefined,
              streakDays: goalStreak.currentStreak,
              streakLabel: milestone.label,
            }, updatedState);
            addProofEvent(proofEvent);
          }
        }, 100);
      }
    } else {
      hapticLight();
      const task = tasks.find(t => t.id === taskId);
      if (task) showFrictionPrompt('task', taskId, task.title);
    }
  };

  const useFallback = (habitId: string) => {
    updateHabit(habitId, { isMicro: true });
    hapticMedium();
    toast.success("Switched to Plan B for today.");
  };

  const handleMorningFinish = () => {
    saveDailyRhythm(todayDate, {
      date: todayDate,
      energy: morningData.energy,
      mood: morningData.mood,
      capacity: morningData.capacity,
      topOutcomes: morningData.topOutcomes,
    });
    setIsMorningFlowOpen(false);
    setMorningStep(0);
    hapticSuccess();
    toast.success("Day set. Let's move with intention.");
  };

  const handleEveningFinish = () => {
    saveDailyRhythm(todayDate, {
      reflection: {
        wins: eveningData.wins,
        friction: eveningData.friction,
        lesson: eveningData.lesson,
        alignment: eveningData.alignment,
      }
    });
    const storeSlice = { identities, getActiveIdentity, getActiveIdentities };
    const proofEvent = generateProofEvent('close-the-loop', {}, storeSlice);
    addProofEvent(proofEvent);
    setIsEveningFlowOpen(false);
    hapticSuccess();
    toast.success("Loop closed. Rest well.");
  };

  const handleDeferLowEnergy = () => {
    // Move today's high effort tasks to tomorrow
    const highEffortTasks = todayTasks.filter(t => t.energy === 'High' || t.priority === 'High' || t.labels.includes('Deep Work'));

    highEffortTasks.forEach(t => {
      updateTask(t.id, { dueDate: tomorrowDate });
    });

    // Auto-switch non-paused habits to Minimum Version
    activeHabits.forEach(h => {
      if (!h.isMicro) {
        updateHabit(h.id, { isMicro: true });
      }
    });

    // Generate a recovery task if none exists
    if (!tasks.some(t => t.labels.includes('Recovery') && t.dueDate === todayDate && !t.completed)) {
      addTask({
        title: "Active Recovery Block",
        energy: "Low",
        emotion: "Restful",
        completed: false,
        dueDate: todayDate,
        priority: "High",
        label: "Recovery",
        labels: ["Recovery"],
        domain: "Physical",
        habitId: null,
        goalId: null
      });
    }

    const storeSlice = { identities, getActiveIdentity, getActiveIdentities };
    const proofEvent = generateProofEvent('wise-adaptation', {
      isMinimumVersion: true,
    }, storeSlice);
    addProofEvent(proofEvent);
    setIsRecalibrateOpen(false);
    hapticMedium();
    toast.success("Recalibrated. High-energy tasks deferred, habits minimized.");
  };

  const startCleanupSprint = () => {
    hapticMedium();
    toast.success("Cleanup sprint started! 15 minutes on the clock.");
    setLocation("/tasks");
  };

  return (
    <div className="flex flex-col gap-8 pb-20 animate-in fade-in duration-500">
      <header className="pt-6 pb-1 flex justify-between items-start" style={{ order: -1 }}>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{todayDisplay}</p>
            <Badge className="bg-secondary/10 text-secondary border-none text-[8px] font-bold uppercase" data-testid="badge-season-mode">{seasonMode}</Badge>
          </div>
          <h1 className="text-3xl font-serif text-primary mt-1">My Day</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="ghost" size="icon" onClick={() => { setIsHomeLayoutOpen(true); hapticLight(); }} className="rounded-full h-10 w-10 min-h-[44px] min-w-[44px] bg-muted/30 text-muted-foreground" data-testid="button-home-layout-settings">
            <Settings2 size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => updateSystemUpgrade('focusMode', !systemUpgrades.focusMode)} className={cn("rounded-full h-10 w-10 min-h-[44px] min-w-[44px]", systemUpgrades.focusMode ? "text-primary bg-primary/10" : "text-muted-foreground")} data-testid="button-focus-mode">
            <LayoutList size={18} />
          </Button>
          {!todayRhythm ? (
            <Button onClick={() => setIsMorningFlowOpen(true)} size="sm" className="rounded-full bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-4 h-10 min-h-[44px]" data-testid="button-morning-flow">
              <Sun size={14} className="mr-1.5" /> Set the Day
            </Button>
          ) : !todayRhythm.reflection ? (
            <Button onClick={() => setIsEveningFlowOpen(true)} size="sm" className="rounded-full bg-secondary/10 text-secondary border-none text-[10px] font-bold uppercase tracking-widest px-4 h-10 min-h-[44px]" data-testid="button-evening-flow">
              <Moon size={14} className="mr-1.5" /> Close Loop
            </Button>
          ) : (
             <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold uppercase tracking-widest px-3 h-10 flex items-center">Complete</Badge>
          )}
        </div>
      </header>

      <div style={{ order: homeSectionOrder('alerts'), ...(isHomeSectionVisible('alerts') ? {} : { display: 'none' }) }}>
      {systemOverloaded && !isSessionNotificationDismissed('overload-banner') && (
        <Card className="bg-amber-500/5 border-none rounded-2xl p-4 ring-1 ring-amber-500/10" data-testid="card-overload-banner">
          <div className="flex items-center justify-between">
            <Link href="/coach" className="flex items-center gap-3 flex-1 cursor-pointer active:scale-[0.98] transition-all">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Gauge size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-tight">System load is elevated</p>
                <p className="text-[10px] text-amber-600/70">Using {commitmentUsage.totalUsed} of {commitmentBudget.totalBudget} units. Simplifying now protects consistency.</p>
              </div>
            </Link>
            <button onClick={(e) => { e.stopPropagation(); handleDismissNotification('overload-banner'); }} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-amber-500/10 text-amber-500/50" data-testid="dismiss-overload-banner">
              <X size={14} />
            </button>
          </div>
        </Card>
      )}

      {strictModeActive && strictOverdueCount > 3 && !isSessionNotificationDismissed('strict-overdue') && (
        <Card className="bg-primary/5 border-none rounded-2xl p-4 ring-1 ring-primary/10" data-testid="card-strict-overdue-triage">
          <div className="flex items-center justify-between">
            <Link href="/tasks" className="flex items-center gap-3 flex-1 cursor-pointer active:scale-[0.98] transition-all">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardList size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-tight">{strictOverdueCount} overdue tasks need triage</p>
                <p className="text-[10px] text-primary/70">Backlog clearing preserves system clarity and focus.</p>
              </div>
            </Link>
            <button onClick={(e) => { e.stopPropagation(); handleDismissNotification('strict-overdue'); }} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary/50" data-testid="dismiss-strict-overdue">
              <X size={14} />
            </button>
          </div>
        </Card>
      )}

      {strictModeActive && strictTasksToday > store.strictMode.dailyTaskCap && !isSessionNotificationDismissed('strict-task-cap') && (
        <Card className="bg-blue-500/5 border-none rounded-2xl p-4 ring-1 ring-blue-500/10" data-testid="card-strict-task-cap">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Target size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">{strictTasksToday} tasks scheduled today</p>
                <p className="text-[10px] text-blue-600/70">Daily cap is {store.strictMode.dailyTaskCap}. Reducing scope may increase follow-through.</p>
              </div>
            </div>
            <button onClick={() => handleDismissNotification('strict-task-cap')} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-blue-500/10 text-blue-500/50" data-testid="dismiss-strict-task-cap">
              <X size={14} />
            </button>
          </div>
        </Card>
      )}

      </div>

      <div style={{ order: homeSectionOrder('backlog'), ...(isHomeSectionVisible('backlog') ? {} : { display: 'none' }) }}>
      {/* Backlog Alert */}
      {overdueTasks.length > 5 && (
        <Card onClick={startCleanupSprint} className="bg-primary/5 border-none rounded-2xl p-4 ring-1 ring-primary/10 cursor-pointer active:scale-[0.98] transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Zap size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-tight">Cleanup Sprint Available</p>
                <p className="text-[10px] text-primary/70">{overdueTasks.length} overdue tasks need attention.</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-primary/40" />
          </div>
        </Card>
      )}

      </div>

      <div style={{ order: homeSectionOrder('triage'), ...(isHomeSectionVisible('triage') ? {} : { display: 'none' }) }}>
      {/* Triage Trigger */}
      {todayRhythm && !todayRhythm.reflection && (
        <Card onClick={() => setIsRecalibrateOpen(true)} className="bg-amber-500/5 border-none rounded-2xl p-4 ring-1 ring-amber-500/10 cursor-pointer active:scale-[0.98] transition-all" data-testid="card-recalibrate">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Coffee size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-tight">Midday Recalibrate</p>
                <p className="text-[10px] text-amber-600/70">How's your rhythm holding up?</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-amber-500/40" />
          </div>
        </Card>
      )}

      </div>

      <div style={{ order: homeSectionOrder('habits'), ...(isHomeSectionVisible('habits') ? {} : { display: 'none' }) }}>
      {filteredHabits.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">Daily Rhythm <ScoringInfoButton type="daily-rhythm" size={13} /></h2>
            {systemUpgrades.keystoneMode && <Badge className="bg-primary/10 text-primary border-none text-[8px] uppercase">Keystone Only</Badge>}
            {energyLevel <= 2 && <Badge className="bg-blue-500/10 text-blue-600 border-none text-[8px] uppercase">Low Energy Mode</Badge>}
          </div>
          <div className="space-y-3">
            {filteredHabits.map((habit) => (
              <motion.div layout key={habit.id}>
                <Card className="border-none bg-card shadow-sm rounded-3xl overflow-hidden active:scale-[0.98] transition-transform ring-1 ring-border/10">
                  <div className="p-5 flex gap-4">
                    <div className="pt-0.5 flex items-center justify-center min-w-[44px] min-h-[44px]">
                      <Checkbox 
                        className="rounded-full w-6 h-6 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        onCheckedChange={(checked) => toggleHabit(habit.id, !!checked)}
                        data-testid={`checkbox-habit-${habit.id}`}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm text-foreground leading-tight">
                          {habit.isMicro ? habit.fallback : habit.title}
                        </p>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {(() => {
                            const streak = habitStreaks.get(habit.id);
                            if (streak && streak.currentStreak >= 2) {
                              return <Badge className="text-[7px] bg-orange-500/10 text-orange-600 border-none font-bold uppercase" data-testid={`badge-streak-${habit.id}`}>🔥 {getStreakLabel(streak.currentStreak)}</Badge>;
                            }
                            return null;
                          })()}
                          {habit.isKeystone && <Badge className="text-[7px] bg-primary/10 text-primary border-none font-bold uppercase">Keystone</Badge>}
                          {habit.isMicro && <Badge className="text-[7px] bg-secondary/10 text-secondary border-none font-bold uppercase">Plan B</Badge>}
                          {gravityScores.get(habit.id)?.label === 'High leverage' && (
                            <Badge className="text-[7px] bg-emerald-500/10 text-emerald-600 border-none font-bold uppercase" data-testid={`badge-gravity-home-${habit.id}`}>⬆ High Leverage</Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 opacity-60">
                        <RefreshCw size={10} className="text-amber-500" />
                        IF {habit.trigger} THEN {habit.title}
                      </p>

                      {!habit.isMicro && habit.fallback && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-11 w-full justify-start text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary bg-muted/30 rounded-xl"
                          onClick={() => useFallback(habit.id)}
                        >
                          <Sparkles size={10} className="mr-2" />
                          Too hard? Try Plan B
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      </div>

      <div style={{ order: homeSectionOrder('recovery'), ...(isHomeSectionVisible('recovery') ? {} : { display: 'none' }) }}>
      {recoveryTasks.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-secondary flex items-center gap-2 ml-1">
            <Shield size={12} /> Recovery Lane
          </h2>
          <div className="space-y-2.5">
            {recoveryTasks.map((task) => (
              <Card key={task.id} className="border-none bg-secondary/5 shadow-none rounded-2xl ring-1 ring-secondary/10">
                <div className="p-4 flex items-center gap-3">
                  <button onClick={() => toggleTask(task.id, task.completed)} className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-secondary/30 flex items-center justify-center transition-colors">
                      {task.completed && <div className="w-2.5 h-2.5 bg-secondary rounded-full" />}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-secondary/80 tracking-tight">{task.title}</p>
                    <p className="text-[8px] font-bold uppercase text-secondary/40">Recommitment Task</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      </div>

      <div style={{ order: homeSectionOrder('tasks'), ...(isHomeSectionVisible('tasks') ? {} : { display: 'none' }) }}>
      {displayedTasks.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Focus Areas</h2>
            {systemUpgrades.energyScheduling && <Badge className="bg-blue-500/10 text-blue-600 border-none text-[8px] uppercase">{energyLevel <= 2 ? 'Low NRG First' : energyLevel >= 4 ? 'High NRG First' : 'Auto-Sorted'}</Badge>}
            {systemUpgrades.focusMode && <Badge variant="outline" className="text-[8px] uppercase">Top 3 Only</Badge>}
          </div>
          <div className="space-y-2.5">
            {displayedTasks.map((task) => (
              <Card key={task.id} className="border-none bg-card shadow-sm rounded-2xl active:scale-[0.99] transition-transform ring-1 ring-border/10">
                <div className="p-4 flex items-center gap-3">
                  <button onClick={() => toggleTask(task.id, task.completed)} className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-colors">
                      {task.completed && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-foreground/80 tracking-tight">{task.title}</p>
                    <div className="flex gap-1.5 mt-1">
                      {task.domain && <Badge className="text-[7px] bg-primary/5 text-primary border-none font-bold uppercase">{task.domain}</Badge>}
                      <Badge variant="outline" className="text-[7px] border-muted-foreground/20 text-muted-foreground font-bold uppercase">{task.energy} NRG</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      </div>

      <Sheet open={isHomeLayoutOpen} onOpenChange={setIsHomeLayoutOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Settings2 size={18} className="text-primary" /> Section Layout
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Show, hide, or reorder My Day sections.
          </p>
          <div className="space-y-1.5">
            {orderedHomeSections.map((section, idx) => (
              <div
                key={section.id}
                className={`flex items-center gap-2 p-3 rounded-xl ring-1 transition-all ${
                  section.visible ? 'ring-border/20 bg-card' : 'ring-border/10 bg-muted/30 opacity-60'
                }`}
                data-testid={`home-layout-section-${section.id}`}
              >
                <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">
                  {HOME_SECTION_LABELS[section.id] || section.id}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === 0}
                    onClick={() => { moveSection('home', section.id, 'up'); hapticLight(); }}
                    data-testid={`button-home-move-up-${section.id}`}
                  >
                    <ChevronUp size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === orderedHomeSections.length - 1}
                    onClick={() => { moveSection('home', section.id, 'down'); hapticLight(); }}
                    data-testid={`button-home-move-down-${section.id}`}
                  >
                    <ChevronDown size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => { toggleSectionVisibility('home', section.id); hapticLight(); }}
                    data-testid={`button-home-toggle-${section.id}`}
                  >
                    {section.visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full h-11 rounded-2xl mt-4 text-xs font-bold"
            onClick={() => setIsHomeLayoutOpen(false)} data-testid="button-close-home-layout"
          >
            Done
          </Button>
        </SheetContent>
      </Sheet>

      {/* Morning Flow Dialog */}
      <Dialog open={isMorningFlowOpen} onOpenChange={setIsMorningFlowOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">Set the Day</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-8">
            {activeIdentities.length > 0 && (
              <div className="p-3 bg-primary/[0.03] rounded-2xl ring-1 ring-primary/10">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-1">Today I'm becoming</p>
                {activeIdentities.map(id => (
                  <p key={id.id} className="text-sm font-serif text-foreground" data-testid={`text-morning-identity-${id.id}`}>{id.statement}</p>
                ))}
              </div>
            )}
            {morningStep === 0 && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Energy (1-5)</label>
                  <div className="flex justify-between items-center gap-4">
                    <Slider value={[morningData.energy]} min={1} max={5} step={1} onValueChange={([v]) => setMorningData({...morningData, energy: v})} />
                    <span className="text-2xl font-serif text-primary w-8">{morningData.energy}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Capacity Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Push', 'Sustain', 'Recover'].map((m: any) => (
                      <Button key={m} variant={morningData.capacity === m ? 'default' : 'outline'} onClick={() => setMorningData({...morningData, capacity: m})} className="rounded-xl h-12 text-[10px] font-bold uppercase">{m}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mood</label>
                  <Input value={morningData.mood} onChange={e => setMorningData({...morningData, mood: e.target.value})} placeholder="e.g., Calm, Anxious, Focused" className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-morning-mood" />
                </div>
              </div>
            )}
            {morningStep === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Intentions</label>
                  <p className="text-[10px] text-muted-foreground italic">Pulling from your quarterly intentions...</p>
                  <div className="space-y-2">
                    {currentPlan?.outcomes.map(o => (
                      <div key={o} onClick={() => {
                        const next = morningData.topOutcomes.includes(o) ? morningData.topOutcomes.filter(x => x !== o) : [...morningData.topOutcomes, o];
                        setMorningData({...morningData, topOutcomes: next});
                      }} className={cn("p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer", morningData.topOutcomes.includes(o) ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-transparent text-muted-foreground")}>
                        {o}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            {morningStep > 0 && <Button variant="ghost" onClick={() => setMorningStep(morningStep - 1)} className="flex-1 rounded-xl h-12">Back</Button>}
            {morningStep < 1 ? (
              <Button onClick={() => setMorningStep(1)} className="flex-1 rounded-xl h-12 bg-primary">Next</Button>
            ) : (
              <Button onClick={handleMorningFinish} className="flex-1 rounded-xl h-12 bg-primary">Launch Day</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recalibrate Dialog */}
      <Dialog open={isRecalibrateOpen} onOpenChange={(open) => { setIsRecalibrateOpen(open); if (!open) setRecalibrateStatus(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Midday Recalibrate</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {!recalibrateStatus ? (
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" onClick={() => { setIsRecalibrateOpen(false); toast.success("Keep crushing it."); }} className="h-14 rounded-2xl justify-between px-6 border-emerald-500/20 text-emerald-600">On Track <CheckCircle2 size={18}/></Button>
                <Button variant="outline" onClick={() => setRecalibrateStatus('behind')} className="h-14 rounded-2xl justify-between px-6 border-amber-500/20 text-amber-600">Slightly Behind <AlertCircle size={18}/></Button>
                <Button variant="outline" onClick={() => setRecalibrateStatus('overloaded')} className="h-14 rounded-2xl justify-between px-6 border-destructive/20 text-destructive">Overloaded <Zap size={18}/></Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in">
                <div className="p-4 bg-muted/30 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Triage Actions</p>
                  <div className="space-y-2">
                    <Button onClick={() => { updateSystemUpgrade('focusMode', true); setIsRecalibrateOpen(false); toast.success("Focus mode engaged."); }} className="w-full h-12 rounded-xl bg-primary/10 text-primary border-none">Engage Focus Mode</Button>
                    <Button onClick={handleDeferLowEnergy} className="w-full h-12 rounded-xl bg-secondary/10 text-secondary border-none" data-testid="button-defer-low-energy">Defer Low-NRG Tasks</Button>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setRecalibrateStatus(null)} className="w-full rounded-xl">Back</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Evening Flow Dialog */}
      <Dialog open={isEveningFlowOpen} onOpenChange={setIsEveningFlowOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-secondary">Close the Loop</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {activeIdentities.length > 0 && (
              <div className="p-3 bg-secondary/[0.03] rounded-2xl ring-1 ring-secondary/10">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-secondary/60 mb-1">Reflect through the lens of</p>
                {activeIdentities.map(id => (
                  <p key={id.id} className="text-sm font-serif text-foreground" data-testid={`text-evening-identity-${id.id}`}>{id.statement}</p>
                ))}
              </div>
            )}
            <div className="space-y-4">
               <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Win</label>
               <Input value={eveningData.wins} onChange={e => setEveningData({...eveningData, wins: e.target.value})} placeholder="What went well?" className="h-12 bg-muted/30 border-none rounded-xl" />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Friction</label>
               <Input value={eveningData.friction} onChange={e => setEveningData({...eveningData, friction: e.target.value})} placeholder="What held you back?" className="h-12 bg-muted/30 border-none rounded-xl" />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lesson</label>
               <Input value={eveningData.lesson} onChange={e => setEveningData({...eveningData, lesson: e.target.value})} placeholder="One thing I'd do differently..." className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-evening-lesson" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">Alignment Score <ScoringInfoButton type="identity-alignment" size={12} /></label>
              <div className="flex justify-between items-center gap-4">
                <Slider value={[eveningData.alignment]} min={1} max={5} step={1} onValueChange={([v]) => setEveningData({...eveningData, alignment: v})} />
                <span className="text-2xl font-serif text-secondary w-8">{eveningData.alignment}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEveningFinish} className="w-full h-14 rounded-2xl bg-secondary text-secondary-foreground font-bold shadow-lg">Complete Reflection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Friction Capture Dialog */}
      <Dialog open={isFrictionPromptOpen} onOpenChange={setIsFrictionPromptOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground">What got in the way?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-5">
            {frictionTarget && (
              <p className="text-[11px] text-muted-foreground">
                Logging friction for <span className="font-bold text-foreground">{frictionTarget.entityTitle}</span>
              </p>
            )}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Tag</label>
              <div className="flex flex-wrap gap-2">
                {REASON_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setFrictionSelectedTag(tag); hapticLight(); }}
                    className={cn(
                      "px-3 py-2.5 min-h-[44px] rounded-xl text-[11px] font-bold transition-all active:scale-95",
                      frictionSelectedTag === tag
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    )}
                    data-testid={`button-friction-tag-${tag.toLowerCase()}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Note (optional)</label>
              <Textarea
                value={frictionNote}
                onChange={e => setFrictionNote(e.target.value)}
                placeholder="Any context to remember..."
                className="h-16 bg-muted/30 border-none rounded-xl text-sm resize-none"
                data-testid="input-friction-note"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => { setIsFrictionPromptOpen(false); store.setFrictionPromptShown(todayDate); }}
              className="flex-1 rounded-xl h-11"
              data-testid="button-friction-skip"
            >
              Skip
            </Button>
            <Button
              onClick={handleFrictionSubmit}
              disabled={!frictionSelectedTag}
              className="flex-1 rounded-xl h-11 bg-primary"
              data-testid="button-friction-submit"
            >
              Log Friction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StreakCelebration
        open={!!celebrationData}
        onClose={() => setCelebrationData(null)}
        title={celebrationData?.title || ''}
        label={celebrationData?.label}
        currentStreak={celebrationData?.currentStreak || 0}
        milestone={celebrationData?.milestone || { days: 0, label: '', emoji: '', message: '' }}
      />
    </div>
  );
}