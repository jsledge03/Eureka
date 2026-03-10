import { useStore, type SectionConfig, DEFAULT_COACH_SECTIONS } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus as MinusIcon, Shield, Sparkles, Zap, Target, Activity, Calendar, Layers, Fingerprint, Bell, Settings2, Star, AlertTriangle, Check, ChevronDown, ChevronUp, Leaf, Brain, Flame, Lock, FileText, Gauge, Compass, Eye, EyeOff, GripVertical, ArrowRight, Palette } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ScoringInfoButton } from "@/components/ScoringTooltip";
import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ReminderCenter } from "@/components/ReminderCenter";
import { NotificationSettingsDialog } from "@/components/NotificationSettings";
import { getWeeklyTrend } from "@/lib/alignmentEngine";
import { computeDriftAlerts, getOverallDriftLevel } from "@/lib/driftEngine";
import { computeWeeklyEvidence } from "@/lib/evidenceEngine";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { type SeasonMode, SEASON_DEFAULTS, getSeasonDefaults } from "@/lib/seasonEngine";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeGravityScores } from "@/lib/gravityEngine";
import { getTopStreaks, getNextMilestone, computeGoalStreak, computeAllStreaks, getStreakTier, getStreakFlame, isNearMilestone, isPersonalBest, getEarnedMilestones, getMilestone } from "@/lib/streakEngine";
import { StreakCelebration } from "@/components/StreakCelebration";
import { computeFrictionInsights } from "@/lib/frictionEngine";
import { computeWeeklyForecast, type ForecastAction } from "@/lib/forecastEngine";
import { computeCommitmentBudget, computeCommitmentUsage, getOverloadSuggestions, isOverloaded } from "@/lib/commitmentEngine";
import { computeCognitiveLoad } from "@/lib/cognitiveLoadEngine";
import { computeBurnoutRisk } from "@/lib/burnoutEngine";
import { generateWeeklyNarrative } from "@/lib/narrativeEngine";
import { computeTrajectory } from "@/lib/trajectoryEngine";
import { classifyRootCauses } from "@/lib/rootCauseEngine";
import { generateAdvisory, type MitigationAction, type NextBestAction } from "@/lib/advisoryEngine";

export default function CoachTab() {
  const store = useStore();
  const { 
    goals, tasks, habits, logs, dailyRhythms, graceDaysPerWeek, graceDaysUsedThisWeek, 
    applyGrace, updateHabit, addTask, updateGoal, weeklyCheckIns, quarterPlans, currentQuarterKey,
    systemUpgrades, updateSystemUpgrade, identities, seasonMode, setSeasonMode,
    frictionEvents, setGraceConfig, advisoryMode, setAdvisoryMode,
    coachSections, toggleSectionVisibility, moveSection,
    colorTheme, setColorTheme, getAllDomains
  } = store;
  const allDomains = getAllDomains();
  const [, setLocation] = useLocation();
  const [isGraceDialogOpen, setIsGraceDialogOpen] = useState(false);
  const [graceTarget, setGraceTarget] = useState<{id: string, type: 'habit' | 'task'} | null>(null);
  const [isNotifSettingsOpen, setIsNotifSettingsOpen] = useState(false);
  const [isSeasonSheetOpen, setIsSeasonSheetOpen] = useState(false);
  const [pendingSeasonMode, setPendingSeasonMode] = useState<SeasonMode | null>(null);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [coachViewFilter, setCoachViewFilter] = useState<'daily' | 'weekly'>('weekly');

  const WEEKLY_ONLY_SECTIONS = useMemo(() => new Set([
    'narrative', 'advisory', 'drift', 'trajectory', 'gravity',
    'evidence', 'streaks', 'proof', 'alignment',
  ]), []);

  const DAILY_ONLY_SECTIONS = useMemo(() => new Set<string>([
  ]), []);

  const orderedSections = useMemo(() => {
    if (coachSections.length === 0) return DEFAULT_COACH_SECTIONS;
    const missing = DEFAULT_COACH_SECTIONS.filter(d => !coachSections.some(s => s.id === d.id));
    return missing.length > 0 ? [...coachSections, ...missing] : coachSections;
  }, [coachSections]);
  const isSectionVisible = useCallback((id: string) => {
    const s = orderedSections.find(s => s.id === id);
    const layoutVisible = s ? s.visible : true;
    if (!layoutVisible) return false;
    if (coachViewFilter === 'daily' && WEEKLY_ONLY_SECTIONS.has(id)) return false;
    if (coachViewFilter === 'weekly' && DAILY_ONLY_SECTIONS.has(id)) return false;
    return true;
  }, [orderedSections, coachViewFilter, WEEKLY_ONLY_SECTIONS, DAILY_ONLY_SECTIONS]);
  const sectionOrder = useCallback((id: string) => {
    const idx = orderedSections.findIndex(s => s.id === id);
    return idx >= 0 ? idx : 99;
  }, [orderedSections]);

  const COACH_SECTION_LABELS: Record<string, string> = {
    'identity': 'Identity Nudges',
    'forecast': 'Weekly Forecast',
    'advisory': 'Strategic Advisory',
    'strict-mode': 'Strict Mode',
    'narrative': 'Weekly Memo',
    'drift': 'Drift Alerts',
    'gravity': 'High Leverage Habits',
    'friction': 'Friction Patterns',
    'streaks': 'Streaks',
    'proof': 'Proof Points',
    'evidence': 'Evidence Map',
    'strategic-plan': 'Strategic Plan',
    'suggestions': 'System Suggestions',
    'reminders': 'Reminders',
    'alignment': 'Identity Alignment',
    'trajectory': 'Strategic Trajectory',
    'upgrades': 'System Upgrades',
  };

  const currentPlan = quarterPlans.find(p => `${p.year}-Q${p.quarter}` === currentQuarterKey) || quarterPlans[0];
  const planThemesStr = useMemo(() => {
    if (!currentPlan?.theme) return '';
    try { const p = JSON.parse(currentPlan.theme); if (Array.isArray(p)) return p.filter(Boolean).join(', '); } catch {}
    return currentPlan.theme || '';
  }, [currentPlan?.theme]);
  const combinedIntent = useMemo(() => {
    const parts = [planThemesStr ? `Themes: ${planThemesStr}` : '', store.strategicIntent].filter(Boolean);
    return parts.join('. ');
  }, [planThemesStr, store.strategicIntent]);
  const activeIdentities = identities.filter(i => i.isActive);
  if (activeIdentities.length === 0 && identities.length > 0) activeIdentities.push(identities[0]);
  
  const gravityScores = useMemo(() => computeGravityScores(habits, logs, tasks, dailyRhythms, goals, identities), [habits, logs, tasks, dailyRhythms, goals, identities]);
  const highLeverageHabits = useMemo(() => {
    const result: { id: string; title: string; score: number }[] = [];
    habits.filter(h => !h.isPaused).forEach(h => {
      const g = gravityScores.get(h.id);
      if (g && g.label === 'High leverage') {
        result.push({ id: h.id, title: h.title, score: g.score });
      }
    });
    return result.sort((a, b) => b.score - a.score).slice(0, 2);
  }, [habits, gravityScores]);

  const forecast = useMemo(() => computeWeeklyForecast({
    logs, dailyRhythms, frictionEvents, weeklyCheckIns, habits, tasks, goals, identities, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek,
    strategicIntent: combinedIntent,
  }), [logs, dailyRhythms, frictionEvents, weeklyCheckIns, habits, tasks, goals, identities, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek, combinedIntent]);

  const frictionInsights = useMemo(() => computeFrictionInsights(frictionEvents, habits, tasks), [frictionEvents, habits, tasks]);

  const todayDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const topStreaks = useMemo(() => getTopStreaks(habits, logs, todayDate), [habits, logs, todayDate]);
  const allHabitStreaks = useMemo(() => computeAllStreaks(habits, logs, todayDate), [habits, logs, todayDate]);
  const goalStreaks = useMemo(() => {
    const activeGoals = goals.filter(g => !g.isPaused);
    return activeGoals.map(g => ({
      goalId: g.id,
      title: g.title,
      streak: computeGoalStreak(g.id, tasks, logs, todayDate),
    })).filter(e => e.streak.currentStreak > 0).sort((a, b) => b.streak.currentStreak - a.streak.currentStreak);
  }, [goals, tasks, logs, todayDate]);
  const [isStreakSheetOpen, setIsStreakSheetOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ title: string; label?: string; currentStreak: number; milestone: NonNullable<ReturnType<typeof getMilestone>> } | null>(null);

  const nearMilestoneItems = useMemo(() => {
    const items: Array<{ id: string; title: string; type: 'habit' | 'goal'; streak: number; milestone: NonNullable<ReturnType<typeof getNextMilestone>>; daysAway: number }> = [];
    for (const entry of topStreaks) {
      const check = isNearMilestone(entry.streak.currentStreak);
      if (check.near && check.milestone) {
        items.push({ id: entry.habitId, title: entry.title, type: 'habit', streak: entry.streak.currentStreak, milestone: check.milestone, daysAway: check.daysAway });
      }
    }
    for (const entry of goalStreaks) {
      const check = isNearMilestone(entry.streak.currentStreak);
      if (check.near && check.milestone) {
        items.push({ id: entry.goalId, title: entry.title, type: 'goal', streak: entry.streak.currentStreak, milestone: check.milestone, daysAway: check.daysAway });
      }
    }
    return items;
  }, [topStreaks, goalStreaks]);

  const storeSnapshot = useMemo(() => ({ identities, goals, habits, tasks, logs, dailyRhythms, quarterPlans, currentQuarterKey }), [identities, goals, habits, tasks, logs, dailyRhythms, quarterPlans, currentQuarterKey]);
  const weeklyTrend = useMemo(() => getWeeklyTrend(storeSnapshot), [storeSnapshot]);
  const driftAlerts = useMemo(() => computeDriftAlerts(storeSnapshot, seasonMode), [storeSnapshot, seasonMode]);
  const driftLevel = useMemo(() => getOverallDriftLevel(driftAlerts), [driftAlerts]);
  const evidence = useMemo(() => computeWeeklyEvidence(storeSnapshot), [storeSnapshot]);

  const rhythm = useMemo(() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoff = fourteenDaysAgo.toLocaleDateString('en-CA');
    const recentLogs = logs.filter(l => l.date >= cutoff);
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

  const [isCapacitySheetOpen, setIsCapacitySheetOpen] = useState(false);
  const [isCognitiveSheetOpen, setIsCognitiveSheetOpen] = useState(false);
  const [showCapacityBreakdown, setShowCapacityBreakdown] = useState(false);
  const [isMemoSheetOpen, setIsMemoSheetOpen] = useState(false);

  const commitmentBudget = useMemo(() => computeCommitmentBudget(seasonMode, dailyRhythms, store.commitmentBudgetBase), [seasonMode, dailyRhythms, store.commitmentBudgetBase]);
  const commitmentUsage = useMemo(() => computeCommitmentUsage(goals, habits, tasks, frictionEvents), [goals, habits, tasks, frictionEvents]);
  const overloaded = isOverloaded(commitmentUsage.totalUsed, commitmentBudget.totalBudget);
  const overloadSuggestions = useMemo(() => getOverloadSuggestions(habits, goals), [habits, goals]);

  const cognitiveLoad = useMemo(() => computeCognitiveLoad({
    goals, habits, tasks, frictionEvents,
    driftAlertCount: driftAlerts.length,
    notificationSettings: store.notificationSettings,
  }), [goals, habits, tasks, frictionEvents, driftAlerts.length, store.notificationSettings]);

  const burnoutResult = useMemo(() => computeBurnoutRisk({
    logs, dailyRhythms, frictionEvents, weeklyCheckIns, tasks, habits, seasonMode,
    graceDaysPerWeek, graceDaysUsedThisWeek,
  }), [logs, dailyRhythms, frictionEvents, weeklyCheckIns, tasks, habits, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek]);

  const weeklyNarrative = useMemo(() => generateWeeklyNarrative({
    identities, goals, habits, tasks, logs, dailyRhythms, frictionEvents,
    proofEvents: store.proofEvents, driftAlerts, weeklyCheckIns, seasonMode,
    strategicIntent: combinedIntent, allDomains,
  }), [identities, goals, habits, tasks, logs, dailyRhythms, frictionEvents, store.proofEvents, driftAlerts, weeklyCheckIns, seasonMode, combinedIntent, allDomains]);

  const trajectory = useMemo(() => computeTrajectory({
    habits, goals, tasks, logs, dailyRhythms, frictionEvents, identities, seasonMode,
    driftAlertCount: driftAlerts.length,
  }), [habits, goals, tasks, logs, dailyRhythms, frictionEvents, identities, seasonMode, driftAlerts.length]);

  const rootCauses = useMemo(() => classifyRootCauses({
    driftAlerts, burnout: burnoutResult, cognitiveLoad, frictionInsights,
    trajectory, forecast, commitmentBudget, commitmentUsage,
    identities, goals, habits, tasks, logs, dailyRhythms, seasonMode,
  }), [driftAlerts, burnoutResult, cognitiveLoad, frictionInsights, trajectory, forecast, commitmentBudget, commitmentUsage, identities, goals, habits, tasks, logs, dailyRhythms, seasonMode]);

  const advisory = useMemo(() => generateAdvisory({
    rootCauses, burnout: burnoutResult, cognitiveLoad, forecast, trajectory,
    commitmentBudget, commitmentUsage, goals, habits, seasonMode,
    strategicIntent: combinedIntent, mode: advisoryMode,
  }), [rootCauses, burnoutResult, cognitiveLoad, forecast, trajectory, commitmentBudget, commitmentUsage, goals, habits, seasonMode, combinedIntent, advisoryMode]);

  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set());

  const getRecommendations = () => {
    const recs: { id: string; title: string; text: string; icon: React.ReactNode; action: () => void; actionLabel: string; impact: string }[] = [];
    const activeGoals = goals.filter(g => !g.isPaused);
    const activeHabits = habits.filter(h => !h.isPaused);

    if (goals.length === 0 && habits.length === 0) {
      recs.push({
        id: 'foundation',
        title: "Foundation First",
        text: "Define your identity and goals to give the system something to optimize.",
        icon: <Fingerprint size={14} className="text-primary" />,
        action: () => setLocation("/identity"),
        actionLabel: "Build Foundation",
        impact: "Unlocks all intelligence systems"
      });
    }

    if (activeGoals.length > 0 && !systemUpgrades.identityAlignment) {
      recs.push({
        id: 'alignment',
        title: "Deeper Insight",
        text: "Turn on Identity Alignment to see how your daily actions reflect your values.",
        icon: <Fingerprint size={14} className="text-primary" />,
        action: () => {
          updateSystemUpgrade('identityAlignment', true);
          hapticSuccess();
          toast.success("Identity Alignment enabled — scroll down to see your score");
          setDismissedRecs(prev => { const n = new Set(Array.from(prev)); n.add('alignment'); return n; });
        },
        actionLabel: "Enable Now",
        impact: "Shows alignment score"
      });
    }

    if (!systemUpgrades.energyScheduling && activeHabits.length > 0) {
      recs.push({
        id: 'energy',
        title: "Smart Energy Scheduling",
        text: "Let the system auto-sort your tasks to match your daily energy level.",
        icon: <Activity size={14} className="text-blue-500" />,
        action: () => {
          updateSystemUpgrade('energyScheduling', true);
          hapticSuccess();
          toast.success("Energy Scheduling enabled — tasks now sorted by your energy");
          setDismissedRecs(prev => { const n = new Set(Array.from(prev)); n.add('energy'); return n; });
        },
        actionLabel: "Enable Now",
        impact: "Auto-sorts tasks by energy"
      });
    }

    if (!systemUpgrades.keystoneMode && activeHabits.filter(h => h.isKeystone).length > 0) {
      recs.push({
        id: 'keystone',
        title: "Focus on Keystones",
        text: "You have keystone habits marked. Enable Keystone Mode to only show critical habits on My Day.",
        icon: <Star size={14} className="text-emerald-500" />,
        action: () => {
          updateSystemUpgrade('keystoneMode', true);
          hapticSuccess();
          toast.success("Keystone Mode enabled — only critical habits show on My Day");
          setDismissedRecs(prev => { const n = new Set(Array.from(prev)); n.add('keystone'); return n; });
        },
        actionLabel: "Enable Now",
        impact: "Reduces daily noise"
      });
    }

    if (graceDaysUsedThisWeek >= graceDaysPerWeek - 1 && graceDaysPerWeek < 5) {
      recs.push({
        id: 'grace',
        title: "Grace Running Low",
        text: `${graceDaysPerWeek - graceDaysUsedThisWeek} grace credits left. Consider increasing your buffer.`,
        icon: <Shield size={14} className="text-blue-500" />,
        action: () => {
          setGraceConfig(Math.min(graceDaysPerWeek + 1, 7));
          hapticSuccess();
          toast.success(`Grace bank increased to ${Math.min(graceDaysPerWeek + 1, 7)} days`);
          setDismissedRecs(prev => { const n = new Set(Array.from(prev)); n.add('grace'); return n; });
        },
        actionLabel: "Add 1 Grace Day",
        impact: "More breathing room"
      });
    }

    const activePlan = quarterPlans.find(p => `${p.year}-Q${p.quarter}` === currentQuarterKey);
    const planThemes = activePlan?.theme ? (() => { try { const p = JSON.parse(activePlan.theme); return Array.isArray(p) ? p.filter(Boolean) : [activePlan.theme]; } catch { return [activePlan.theme]; } })() : [];
    if (!activePlan || planThemes.length === 0) {
      recs.push({
        id: 'direction',
        title: "Set Your Direction",
        text: "No strategic plan set. Run a Sunday Reset to define your quarterly theme and focus.",
        icon: <Target size={14} className="text-emerald-500" />,
        action: () => setLocation("/review"),
        actionLabel: "Run Sunday Reset",
        impact: "Sets weekly/quarterly focus"
      });
    }

    return recs.filter(r => !dismissedRecs.has(r.id)).slice(0, 3);
  };

  const handleForecastAction = (action: ForecastAction) => {
    hapticMedium();
    switch (action.type) {
      case 'increase-grace': {
        const newGrace = Math.min(7, graceDaysPerWeek + 2);
        setGraceConfig(newGrace);
        toast.success(`Grace days increased to ${newGrace}/week`);
        break;
      }
      case 'minimum-version': {
        const activeHabits = habits.filter(h => !h.isPaused && !h.isMicro);
        activeHabits.forEach(h => updateHabit(h.id, { isMicro: true }));
        toast.success(`${activeHabits.length} habits switched to Minimum Version`);
        break;
      }
      case 'reduce-active-goals': {
        const activeGoals = goals.filter(g => !g.isPaused);
        if (activeGoals.length > 2) {
          const toPause = activeGoals[activeGoals.length - 1];
          updateGoal(toPause.id, { isPaused: true });
          toast.success(`Paused "${toPause.title}" to free capacity`);
        }
        break;
      }
      case 'focus-mode': {
        updateSystemUpgrade('focusMode', true);
        toast.success("Focus mode enabled — showing only keystone habits and high-priority tasks");
        break;
      }
      case 'sunday-reset-early': {
        setLocation("/review");
        toast("Opening Sunday Reset...");
        break;
      }
    }
  };

  const handleGraceRecommit = (mode: 'min' | 'tomorrow' | 'swap') => {
    if (!graceTarget) return;
    const today = new Date().toLocaleDateString('en-CA');
    applyGrace(graceTarget.id, graceTarget.type, today);
    
    if (mode === 'min' && graceTarget.type === 'habit') {
      updateHabit(graceTarget.id, { isMicro: true });
      toast.success("Grace applied. Switched to Minimum Version.");
    } else if (mode === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const title = graceTarget.type === 'habit' 
        ? habits.find(h => h.id === graceTarget.id)?.title 
        : tasks.find(t => t.id === graceTarget.id)?.title;
      
      addTask({ 
        title: `Recommit: ${title}`, 
        dueDate: tomorrow.toLocaleDateString('en-CA'),
        completed: false, energy: 'Low', emotion: 'Determined', priority: 'High', label: 'Recovery', labels: ['Recovery'], domain: null, habitId: null, goalId: null
      });
      hapticSuccess();
      toast.success("Grace applied. Recommitment scheduled.");
    }
    
    setIsGraceDialogOpen(false);
    setGraceTarget(null);
  };

  const handleAdvisoryAction = (action: MitigationAction | NextBestAction) => {
    hapticMedium();
    switch (action.actionType) {
      case 'pause-habit': {
        if ('targetId' in action && action.targetId) {
          const h = habits.find(x => x.id === action.targetId);
          if (h) {
            updateHabit(h.id, { isPaused: true });
            toast.success(`Paused "${h.title}"`);
          }
        } else {
          const nonKeystone = habits.filter(h => !h.isPaused && !h.isKeystone && h.schedule === 'Daily');
          if (nonKeystone.length > 0) {
            updateHabit(nonKeystone[0].id, { isPaused: true });
            toast.success(`Paused "${nonKeystone[0].title}"`);
          }
        }
        break;
      }
      case 'pause-goal': {
        if ('targetId' in action && action.targetId) {
          const g = goals.find(x => x.id === action.targetId);
          if (g) {
            updateGoal(g.id, { isPaused: true });
            toast.success(`Paused "${g.title}"`);
          }
        } else {
          const activeGoals = goals.filter(g => !g.isPaused);
          if (activeGoals.length > 1) {
            const toPause = activeGoals[activeGoals.length - 1];
            updateGoal(toPause.id, { isPaused: true });
            toast.success(`Paused "${toPause.title}"`);
          }
        }
        break;
      }
      case 'switch-season': {
        const targetSeason = burnoutResult.risk === 'High' ? 'Recover' : 'Stabilize';
        setSeasonMode(targetSeason as SeasonMode);
        toast.success(`Season switched to ${targetSeason}`);
        break;
      }
      case 'reduce-task-target': {
        const currentCap = store.strictMode.dailyTaskCap;
        const newCap = Math.max(2, currentCap - 2);
        store.setStrictMode({ dailyTaskCap: newCap, enabled: true });
        toast.success(`Daily task cap reduced to ${newCap}`);
        break;
      }
      case 'minimum-version': {
        const toSwitch = habits.filter(h => !h.isPaused && !h.isMicro && !h.isKeystone);
        toSwitch.forEach(h => updateHabit(h.id, { isMicro: true }));
        hapticSuccess();
        toast.success(`${toSwitch.length} habits switched to Minimum Version`);
        break;
      }
      case 'schedule-recovery': {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        store.saveDailyRhythm(tomorrow.toLocaleDateString('en-CA'), {
          date: tomorrow.toLocaleDateString('en-CA'),
          capacity: 'Recover',
          energy: 3,
          mood: '',
          topOutcomes: [],
        });
        toast.success('Recovery day scheduled for tomorrow');
        break;
      }
      case 'focus-domain': {
        toast.success('Focus on your most neglected priority domain today');
        break;
      }
      case 'reduce-goals': {
        const activeGoals = goals.filter(g => !g.isPaused);
        if (activeGoals.length > 2) {
          const candidate = activeGoals.find(g => {
            const linked = habits.filter(h => h.goalId === g.id && !h.isPaused);
            return linked.length === 0;
          }) || activeGoals[activeGoals.length - 1];
          updateGoal(candidate.id, { isPaused: true });
          toast.success(`Paused "${candidate.title}" to reduce load`);
        } else {
          toast.info('Already at 2 or fewer active goals');
        }
        break;
      }
      case 'simplify-habits': {
        const nonKeystone = habits.filter(h => !h.isPaused && !h.isKeystone);
        nonKeystone.forEach(h => updateHabit(h.id, { isPaused: true }));
        hapticSuccess();
        toast.success(`${nonKeystone.length} non-keystone habits paused`);
        break;
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10 animate-in fade-in duration-500">
      <header className="pt-6 pb-1 flex justify-between items-start" style={{ order: -1 }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leadership Engine</p>
          <h1 className="text-3xl font-serif text-primary mt-1">Self Leadership</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => { setIsSeasonSheetOpen(true); setPendingSeasonMode(null); hapticLight(); }}
            className="inline-flex items-center gap-1.5 px-3 h-10 min-h-[44px] rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
            data-testid="button-season-pill"
          >
            <Leaf size={12} /> {seasonMode} <ChevronDown size={10} className="opacity-50" />
          </button>
          <Button variant="ghost" size="icon" onClick={() => setLocation("/review")} className="rounded-full h-10 w-10 min-h-[44px] min-w-[44px] bg-muted/30 text-muted-foreground" data-testid="button-go-to-review">
            <Activity size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIsLayoutSettingsOpen(true); hapticLight(); }}
            className="rounded-full h-10 w-10 min-h-[44px] min-w-[44px] bg-muted/30 text-muted-foreground"
            data-testid="button-coach-layout-settings"
          >
            <Settings2 size={18} />
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-center" data-testid="coach-view-filter">
        <div className="flex items-center gap-1 bg-muted/30 rounded-full p-0.5">
          <button
            onClick={() => { setCoachViewFilter('daily'); hapticLight(); }}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all min-h-[36px] ${
              coachViewFilter === 'daily' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="button-coach-filter-daily"
          >
            Daily
          </button>
          <button
            onClick={() => { setCoachViewFilter('weekly'); hapticLight(); }}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all min-h-[36px] ${
              coachViewFilter === 'weekly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="button-coach-filter-weekly"
          >
            Weekly
          </button>
        </div>
      </div>

      <Sheet open={isSeasonSheetOpen} onOpenChange={setIsSeasonSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Leaf size={18} className="text-secondary" /> Season Mode <ScoringInfoButton type="season-mode" size={13} />
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your season shapes how the system responds. Choose the mode that matches your current reality.
            </p>
            <div className="space-y-3">
              {(Object.keys(SEASON_DEFAULTS) as SeasonMode[]).map((mode) => {
                const config = getSeasonDefaults(mode);
                const isActive = seasonMode === mode;
                const isPending = pendingSeasonMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setPendingSeasonMode(mode)}
                    className={`w-full text-left p-4 rounded-2xl ring-1 transition-all active:scale-[0.98] ${
                      isPending
                        ? 'ring-primary bg-primary/5'
                        : isActive
                        ? 'ring-secondary/30 bg-secondary/[0.03]'
                        : 'ring-border/20 bg-card'
                    }`}
                    data-testid={`button-season-${mode.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-foreground">{mode}</span>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge className="bg-secondary/10 text-secondary border-none text-[8px] font-bold uppercase">Current</Badge>
                        )}
                        {isPending && !isActive && (
                          <Badge className="bg-primary/10 text-primary border-none text-[8px] font-bold uppercase">Selected</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{config.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[8px] border-muted-foreground/20 font-bold">Grace: {config.graceDays}/wk</Badge>
                      <Badge variant="outline" className="text-[8px] border-muted-foreground/20 font-bold">Tasks: {config.taskTarget}/day</Badge>
                      <Badge variant="outline" className="text-[8px] border-muted-foreground/20 font-bold">Drift: {Math.round(config.driftSensitivity * 100)}%</Badge>
                    </div>
                    {(isPending || isActive) && (
                      <div className="mt-3 space-y-1">
                        {config.expectations.map((exp, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground/70 flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span> {exp}
                          </p>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={() => {
                if (pendingSeasonMode && pendingSeasonMode !== seasonMode) {
                  setSeasonMode(pendingSeasonMode);
                  hapticSuccess();
                  toast.success(`Season set to ${pendingSeasonMode}. System recalibrated.`);
                }
                setIsSeasonSheetOpen(false);
              }}
              disabled={!pendingSeasonMode || pendingSeasonMode === seasonMode}
              className="w-full h-14 rounded-2xl font-bold shadow-lg mt-2"
              data-testid="button-set-season"
            >
              Set Season
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isLayoutSettingsOpen} onOpenChange={setIsLayoutSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Settings2 size={18} className="text-primary" /> Section Layout
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Show, hide, or reorder Coach sections. Drag sections up or down to change their position.
          </p>
          <div className="space-y-1.5">
            {orderedSections.map((section, idx) => (
              <div
                key={section.id}
                className={`flex items-center gap-2 p-3 rounded-xl ring-1 transition-all ${
                  section.visible ? 'ring-border/20 bg-card' : 'ring-border/10 bg-muted/30 opacity-60'
                }`}
                data-testid={`layout-section-${section.id}`}
              >
                <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">
                  {COACH_SECTION_LABELS[section.id] || section.id}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={idx === 0}
                    onClick={() => { moveSection('coach', section.id, 'up'); hapticLight(); }}
                    data-testid={`button-move-up-${section.id}`}
                  >
                    <ChevronUp size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={idx === orderedSections.length - 1}
                    onClick={() => { moveSection('coach', section.id, 'down'); hapticLight(); }}
                    data-testid={`button-move-down-${section.id}`}
                  >
                    <ChevronDown size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { toggleSectionVisibility('coach', section.id); hapticLight(); }}
                    data-testid={`button-toggle-${section.id}`}
                  >
                    {section.visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full h-11 rounded-2xl mt-4 text-xs font-bold"
            onClick={() => setIsLayoutSettingsOpen(false)}
            data-testid="button-close-layout"
          >
            Done
          </Button>
        </SheetContent>
      </Sheet>

      <div style={{ order: sectionOrder('identity'), ...(isSectionVisible('identity') ? {} : { display: 'none' }) }}>
      {/* Active Identities */}
      {activeIdentities.length > 0 && (
        <section className="space-y-4" data-testid="section-coach-identity">
          <Card className="p-5 rounded-[2rem] bg-primary/[0.03] border-none ring-1 ring-primary/10" onClick={() => setLocation("/identity")} data-testid="card-coach-identity">
            <div className="flex items-center gap-2 mb-2">
              <Star size={12} className="text-primary fill-primary" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Who I'm Becoming</span>
              {activeIdentities.length > 1 && <Badge className="bg-primary/10 text-primary border-none text-[8px]">{activeIdentities.length}</Badge>}
            </div>
            {activeIdentities.map(id => (
              <p key={id.id} className="text-base font-serif text-foreground leading-snug mb-1" data-testid={`text-coach-identity-${id.id}`}>{id.statement}</p>
            ))}
            <div className="mb-1" />
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-serif text-primary" data-testid="text-coach-alignment">{weeklyTrend.current}</span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                {weeklyTrend.direction === 'up' && <><TrendingUp size={12} className="text-secondary" /><span className="text-secondary">+{weeklyTrend.current - weeklyTrend.previous}</span></>}
                {weeklyTrend.direction === 'down' && <><TrendingDown size={12} className="text-destructive" /><span className="text-destructive">{weeklyTrend.current - weeklyTrend.previous}</span></>}
                {weeklyTrend.direction === 'stable' && <><MinusIcon size={12} className="text-muted-foreground" /><span className="text-muted-foreground">Stable</span></>}
              </div>
              {driftLevel !== 'Low' && (
                <Badge className={`ml-auto text-[8px] py-0.5 ${driftLevel === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'}`}>
                  <AlertTriangle size={9} className="mr-0.5" /> {driftLevel} Drift
                </Badge>
              )}
            </div>
            <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden mt-2">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${weeklyTrend.current}%` }} />
            </div>
          </Card>
        </section>
      )}
      </div>

      <div style={{ order: sectionOrder('forecast'), ...(isSectionVisible('forecast') ? {} : { display: 'none' }) }}>
      {/* Forecast Card */}
      <section className="space-y-3" data-testid="section-coach-forecast">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
          <Activity size={12} className="text-blue-500" /> Weekly Forecast <ScoringInfoButton type="forecast" size={11} />
        </h2>
        <Card className="p-5 rounded-[1.5rem] ring-1 ring-border/20" data-testid="card-forecast">
          <div className="flex items-center justify-between mb-3">
            <Badge
              className={`text-[9px] font-bold uppercase px-2.5 py-1 border-none ${
                forecast.outlook === 'Stable'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : forecast.outlook === 'Risk of overload'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-destructive/10 text-destructive'
              }`}
              data-testid="badge-forecast-outlook"
            >
              {forecast.outlook}
            </Badge>
            <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest">
              {forecast.confidence}% confidence
            </span>
          </div>
          {forecast.signals.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {forecast.signals.slice(0, 4).map((signal, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]" data-testid={`text-forecast-signal-${i}`}>
                  <span className={`shrink-0 ${
                    signal.direction === 'positive' ? 'text-emerald-500' : signal.direction === 'negative' ? 'text-destructive' : 'text-muted-foreground/50'
                  }`}>
                    {signal.direction === 'positive' ? '▲' : signal.direction === 'negative' ? '▼' : '●'}
                  </span>
                  <span className="text-foreground/70">{signal.label}</span>
                </div>
              ))}
            </div>
          )}
          {forecast.actions.length > 0 && (
            <div className="pt-3 border-t border-border/20 space-y-2">
              {forecast.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleForecastAction(action)}
                  className="w-full text-left p-3 rounded-xl bg-muted/20 hover:bg-muted/40 active:scale-[0.98] transition-all"
                  data-testid={`button-forecast-action-${action.type}`}
                >
                  <p className="text-[11px] font-bold text-foreground">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{action.description}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>
      </div>

      <div style={{ order: sectionOrder('advisory'), ...(isSectionVisible('advisory') ? {} : { display: 'none' }) }}>
      {/* Strategic Advisory Panel */}
      <section className="space-y-3" data-testid="section-coach-advisory">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
          <Brain size={12} className="text-violet-500" /> Strategic Advisory <ScoringInfoButton type="strategic-advisory" size={11} />
        </h2>
        <Card className="p-5 rounded-[1.5rem] ring-1 ring-border/20" data-testid="card-advisory">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(() => {
                const hasHigh = rootCauses.some(c => c.severity === 'high');
                const hasMod = rootCauses.some(c => c.severity === 'moderate');
                return (
                  <Badge
                    className={`text-[9px] font-bold uppercase px-2.5 py-1 border-none ${
                      hasHigh ? 'bg-destructive/10 text-destructive' :
                      hasMod ? 'bg-amber-500/10 text-amber-600' :
                      'bg-emerald-500/10 text-emerald-600'
                    }`}
                    data-testid="badge-advisory-status"
                  >
                    {hasHigh ? 'Needs Attention' : hasMod ? 'Watch' : 'Healthy'}
                  </Badge>
                );
              })()}
            </div>
            <div className="flex items-center gap-1 bg-muted/30 rounded-full p-0.5">
              <button
                onClick={() => { setAdvisoryMode('reflective'); hapticLight(); }}
                className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide transition-all ${
                  advisoryMode === 'reflective' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                }`}
                data-testid="button-advisory-reflective"
              >
                Reflective
              </button>
              <button
                onClick={() => { setAdvisoryMode('executive'); hapticLight(); }}
                className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide transition-all ${
                  advisoryMode === 'executive' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                }`}
                data-testid="button-advisory-executive"
              >
                Executive
              </button>
            </div>
          </div>

          <p className="text-[11px] text-foreground/80 leading-relaxed mb-4" data-testid="text-advisory-assessment">
            {advisory.situationAssessment}
          </p>

          <div className="mb-4 p-3 bg-muted/20 rounded-xl" data-testid="section-advisory-constraint">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Primary Constraint</p>
            <p className="text-[11px] text-foreground/70 leading-relaxed">{advisory.primaryConstraint}</p>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/20">
              <Gauge size={10} className="text-blue-500" />
              <span className="text-[9px] font-bold text-foreground/60">{commitmentUsage.totalUsed}/{commitmentBudget.totalBudget}u</span>
              {overloaded && <span className="text-[8px] font-bold text-destructive">!</span>}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/20">
              <Brain size={10} className="text-violet-500" />
              <span className={`text-[9px] font-bold ${
                cognitiveLoad.level === 'Low' ? 'text-emerald-600' :
                cognitiveLoad.level === 'Moderate' ? 'text-amber-600' : 'text-destructive'
              }`}>{cognitiveLoad.level}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/20">
              <Flame size={10} className="text-orange-500" />
              <span className={`text-[9px] font-bold ${
                burnoutResult.risk === 'Low' ? 'text-emerald-600' :
                burnoutResult.risk === 'Watch' ? 'text-amber-600' : 'text-destructive'
              }`}>{burnoutResult.risk}</span>
            </div>
          </div>

          {(advisory.mitigations.minimum.length > 0 || advisory.mitigations.standard.length > 0 || advisory.mitigations.structural.length > 0) && (
            <div className="space-y-3 mb-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mitigation Options</p>

              {advisory.mitigations.minimum.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600/70">Minimum</p>
                  {advisory.mitigations.minimum.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAdvisoryAction(action)}
                      className="w-full text-left p-3 rounded-xl bg-emerald-500/[0.03] ring-1 ring-emerald-500/10 hover:bg-emerald-500/[0.06] active:scale-[0.98] transition-all"
                      data-testid={`button-advisory-min-${action.id}`}
                    >
                      <p className="text-[11px] font-bold text-foreground">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{action.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {advisory.mitigations.standard.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-amber-600/70">Standard</p>
                  {advisory.mitigations.standard.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAdvisoryAction(action)}
                      className="w-full text-left p-3 rounded-xl bg-amber-500/[0.03] ring-1 ring-amber-500/10 hover:bg-amber-500/[0.06] active:scale-[0.98] transition-all"
                      data-testid={`button-advisory-std-${action.id}`}
                    >
                      <p className="text-[11px] font-bold text-foreground">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{action.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {advisory.mitigations.structural.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-destructive/70">Structural</p>
                  {advisory.mitigations.structural.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAdvisoryAction(action)}
                      className="w-full text-left p-3 rounded-xl bg-destructive/[0.03] ring-1 ring-destructive/10 hover:bg-destructive/[0.06] active:scale-[0.98] transition-all"
                      data-testid={`button-advisory-struct-${action.id}`}
                    >
                      <p className="text-[11px] font-bold text-foreground">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{action.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {advisory.nextBestActions.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-border/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Next Best Actions</p>
              {advisory.nextBestActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAdvisoryAction(action)}
                  className="w-full text-left p-3 rounded-xl bg-primary/[0.03] ring-1 ring-primary/10 hover:bg-primary/[0.06] active:scale-[0.98] transition-all"
                  data-testid={`button-advisory-nba-${action.id}`}
                >
                  <p className="text-[11px] font-bold text-foreground">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{action.description}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>
      </div>

      <div style={{ order: sectionOrder('strict-mode'), ...(isSectionVisible('strict-mode') ? {} : { display: 'none' }) }}>
      {/* 4. Strict Mode Toggle */}
      <section className="space-y-3" data-testid="section-coach-strict-mode">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
          <Lock size={12} className="text-primary" /> Strict Mode <ScoringInfoButton type="strict-mode" size={11} />
        </h2>
        <Card className="p-5 rounded-[1.5rem] ring-1 ring-border/20" data-testid="card-strict-mode">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">Strict Mode</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {store.isStrictModeActive()
                  ? `Operating in Sprint discipline. Goal cap: ${store.strictMode.goalCap}, Task cap: ${store.strictMode.dailyTaskCap}/day.`
                  : 'Adds structural guardrails: goal cap, daily task cap, and overdue triage prompts.'}
              </p>
            </div>
            <Switch
              checked={store.strictMode.enabled}
              onCheckedChange={() => {
                store.toggleStrictMode();
                hapticMedium();
                toast.success(store.strictMode.enabled ? "Strict Mode disabled" : "Strict Mode enabled");
              }}
              data-testid="switch-strict-mode"
            />
          </div>
          {(seasonMode === 'Sprint' || seasonMode === 'Leadership Peak' || seasonMode === 'Focus Sprint') && !store.strictMode.enabled && (
            <div className="p-3 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/10 mb-3">
              <p className="text-[10px] text-amber-700 leading-relaxed">
                You're in {seasonMode} season. Strict Mode enforces tradeoffs — required to add new commitments while protecting focus.
              </p>
            </div>
          )}
          {store.strictMode.enabled && (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-[10px] font-bold h-9"
              onClick={() => {
                store.pauseStrictMode24h();
                hapticLight();
                toast.success("Strict Mode paused for 24 hours");
              }}
              data-testid="button-pause-strict"
            >
              Pause for 24 hours
            </Button>
          )}
        </Card>
      </section>
      </div>

      <div style={{ order: sectionOrder('narrative'), ...(isSectionVisible('narrative') ? {} : { display: 'none' }) }}>
      {/* 5. Weekly Executive Memo */}
      <section className="space-y-3" data-testid="section-coach-narrative">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
          <FileText size={12} className="text-primary" /> Weekly Executive Memo
        </h2>
        <Card className="p-5 rounded-[1.5rem] ring-1 ring-primary/10 bg-primary/[0.02]" data-testid="card-narrative">
          {weeklyNarrative.executiveSummary && (
            <p className="text-[11px] text-foreground/80 leading-relaxed mb-3" data-testid="text-executive-summary-preview">
              {weeklyNarrative.executiveSummary}
            </p>
          )}
          {weeklyNarrative.operationalRisks.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={10} className={weeklyNarrative.operationalRisks[0].severity === 'high' ? 'text-destructive' : 'text-amber-500'} />
                <span className="text-[10px] font-bold text-foreground">{weeklyNarrative.operationalRisks[0].title}</span>
              </div>
              <p className="text-[10px] text-muted-foreground pl-4">{weeklyNarrative.operationalRisks[0].description}</p>
            </div>
          )}
          {weeklyNarrative.nextWeekFocus.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-1">Next week</p>
              <p className="text-[10px] text-foreground/70">{weeklyNarrative.nextWeekFocus[0]}</p>
            </div>
          )}
          {!weeklyNarrative.executiveSummary && weeklyNarrative.operationalRisks.length === 0 && weeklyNarrative.nextWeekFocus.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic mb-3">
              Not enough data yet. Complete habits and tasks to generate your executive memo.
            </p>
          )}
          <Button
            variant="link"
            size="sm"
            onClick={() => { setIsMemoSheetOpen(true); hapticLight(); }}
            className="text-[10px] p-0 font-bold text-primary"
            data-testid="button-read-full-memo"
          >
            Read full memo →
          </Button>
        </Card>
      </section>

      <Sheet open={isMemoSheetOpen} onOpenChange={setIsMemoSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <FileText size={18} className="text-primary" /> Weekly Executive Memo
            </SheetTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest" data-testid="text-memo-date-range">
              Week of {new Date(Date.now() - 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </SheetHeader>
          <div className="space-y-6 mt-2">
            {weeklyNarrative.executiveSummary && (
              <div className="space-y-2" data-testid="section-memo-executive-summary">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Executive Summary</h4>
                <div className="p-3 bg-primary/[0.03] rounded-xl ring-1 ring-primary/10">
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{weeklyNarrative.executiveSummary}</p>
                </div>
              </div>
            )}

            {weeklyNarrative.domainBalance.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-domain-balance">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Domain Balance</h4>
                <div className="space-y-1.5">
                  {weeklyNarrative.domainBalance.map((d) => (
                    <div key={d.domain} className="flex items-center gap-2" data-testid={`memo-domain-${d.domain.toLowerCase()}`}>
                      <span className="text-[10px] font-bold text-foreground/70 w-16 shrink-0">{d.domain}</span>
                      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            d.status === 'strong' ? 'bg-emerald-500' :
                            d.status === 'moderate' ? 'bg-blue-500' :
                            d.status === 'weak' ? 'bg-amber-500' :
                            'bg-muted-foreground/20'
                          }`}
                          style={{ width: `${Math.min(d.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground w-8 text-right shrink-0">{d.completions}</span>
                      <Badge
                        variant="outline"
                        className={`text-[7px] border-none font-bold uppercase shrink-0 ${
                          d.status === 'strong' ? 'bg-emerald-500/10 text-emerald-600' :
                          d.status === 'moderate' ? 'bg-blue-500/10 text-blue-600' :
                          d.status === 'weak' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-muted/20 text-muted-foreground'
                        }`}
                      >
                        {d.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weeklyNarrative.protected.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-protected">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">What You Protected</h4>
                {weeklyNarrative.protected.map((p, i) => (
                  <div key={i} className="p-3 bg-emerald-500/[0.04] rounded-xl ring-1 ring-emerald-500/10">
                    <span className="text-xs font-bold text-foreground/80">{p.domain}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{p.evidence}</p>
                  </div>
                ))}
              </div>
            )}

            {weeklyNarrative.drifted.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-drifted">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600">What Drifted</h4>
                {weeklyNarrative.drifted.map((d, i) => (
                  <div key={i} className="p-3 bg-amber-500/[0.04] rounded-xl ring-1 ring-amber-500/10">
                    <span className="text-xs font-bold text-foreground/80">{d.signal}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{d.cause}</p>
                  </div>
                ))}
              </div>
            )}

            {weeklyNarrative.operationalRisks.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-risks">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive/80">Operational Risks</h4>
                {weeklyNarrative.operationalRisks.map((risk) => (
                  <button
                    key={risk.id}
                    onClick={() => {
                      hapticMedium();
                      if (risk.actionType === 'navigate-tasks') { setLocation('/tasks'); }
                      else if (risk.actionType === 'navigate-habits') { setLocation('/habits'); }
                      else if (risk.actionType === 'navigate-coach') { toast.success("You're already on Coach"); }
                      else if (risk.actionType === 'navigate-review') { setLocation('/review'); }
                      else if (risk.actionType === 'apply-season') {
                        setSeasonMode('Stabilize');
                        toast.success('Season switched to Stabilize for recovery');
                      }
                      setIsMemoSheetOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl ring-1 ring-border/20 hover:bg-muted/20 active:scale-[0.98] transition-all"
                    data-testid={`button-memo-risk-${risk.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        risk.severity === 'high' ? 'bg-destructive' :
                        risk.severity === 'medium' ? 'bg-amber-500' :
                        'bg-blue-400'
                      }`} />
                      <p className="text-[11px] font-bold text-foreground">{risk.title}</p>
                      <Badge variant="outline" className={`text-[7px] border-none font-bold uppercase ml-auto shrink-0 ${
                        risk.severity === 'high' ? 'bg-destructive/10 text-destructive' :
                        risk.severity === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>{risk.severity}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed pl-4">{risk.description}</p>
                  </button>
                ))}
              </div>
            )}

            {weeklyNarrative.strategicLeverage.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-leverage">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80">Strategic Leverage</h4>
                {weeklyNarrative.strategicLeverage.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      hapticMedium();
                      if (item.actionType === 'navigate-review') { setLocation('/review'); }
                      else if (item.actionType === 'navigate-habits') { setLocation('/habits'); }
                      else if (item.actionType === 'navigate-tasks') { setLocation('/tasks'); }
                      setIsMemoSheetOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-emerald-500/[0.03] ring-1 ring-emerald-500/10 hover:bg-emerald-500/[0.06] active:scale-[0.98] transition-all"
                    data-testid={`button-memo-leverage-${item.id}`}
                  >
                    <p className="text-[11px] font-bold text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{item.description}</p>
                  </button>
                ))}
              </div>
            )}

            {weeklyNarrative.patterns.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-patterns">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Emerging Patterns</h4>
                {weeklyNarrative.patterns.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/70">
                    <span className="text-primary mt-0.5 shrink-0">●</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {weeklyNarrative.nextWeekFocus.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-next-week">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Next Week Focus</h4>
                {weeklyNarrative.nextWeekFocus.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-primary/[0.03] rounded-xl">
                    <span className="text-[11px] font-bold text-primary shrink-0">{i + 1}.</span>
                    <span className="text-[11px] text-foreground/80 leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            )}

            {weeklyNarrative.recommendations.length > 0 && (
              <div className="space-y-2" data-testid="section-memo-recommendations">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recommendations</h4>
                {weeklyNarrative.recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => {
                      hapticMedium();
                      if (rec.actionType === 'navigate-habits') { setLocation('/habits'); }
                      else if (rec.actionType === 'navigate-coach') { toast.success('You\'re already on Coach'); }
                      else if (rec.actionType === 'navigate-review') { setLocation('/review'); }
                      else if (rec.actionType === 'navigate-tasks') { setLocation('/tasks'); }
                      else if (rec.actionType === 'apply-pause') {
                        const activeGoals = goals.filter(g => !g.isPaused);
                        const candidate = activeGoals[activeGoals.length - 1];
                        if (candidate) { updateGoal(candidate.id, { isPaused: true }); toast.success(`"${candidate.title}" paused`); }
                      } else if (rec.actionType === 'apply-simplify') {
                        const toSwitch = habits.filter(h => !h.isPaused && !h.isMicro && h.fallback);
                        toSwitch.forEach(h => updateHabit(h.id, { isMicro: true }));
                        toast.success(`${toSwitch.length} habits switched to Minimum Version`);
                      } else if (rec.actionType === 'apply-season') {
                        setSeasonMode('Stabilize');
                        toast.success('Season switched to Stabilize');
                      }
                      setIsMemoSheetOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-muted/20 hover:bg-muted/40 active:scale-[0.98] transition-all"
                    data-testid={`button-memo-rec-${rec.id}`}
                  >
                    <p className="text-[11px] font-bold text-foreground">{rec.label}</p>
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{rec.description}</p>
                  </button>
                ))}
              </div>
            )}

            {!weeklyNarrative.executiveSummary && weeklyNarrative.protected.length === 0 && weeklyNarrative.drifted.length === 0 && weeklyNarrative.patterns.length === 0 && (
              <p className="text-[11px] text-center opacity-40 font-bold uppercase py-8">
                Not enough data yet. Keep logging to generate your executive memo.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
      </div>

      <div style={{ order: sectionOrder('drift'), ...((isSectionVisible('drift') && driftAlerts.length > 0 && !store.isDriftSnoozed()) ? {} : { display: 'none' }) }}>
      {/* Drift Alerts */}
      {driftAlerts.length > 0 && !store.isDriftSnoozed() && (
        <section className="space-y-3" data-testid="section-coach-drift">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-500" /> Drift Alerts
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-[9px] h-7 text-muted-foreground/60 hover:text-muted-foreground"
              onClick={() => { store.snoozeDriftAlerts(); hapticLight(); toast("Drift alerts snoozed for 7 days"); }}
              data-testid="button-snooze-drift"
            >
              Snooze 7d
            </Button>
          </div>
          {driftAlerts.slice(0, 3).map(alert => (
            <Card key={alert.id} className="p-4 rounded-[1.5rem] ring-1 ring-border/20" data-testid={`card-coach-drift-${alert.id}`}>
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.level === 'High' ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
                  <AlertTriangle size={14} className={alert.level === 'High' ? 'text-destructive' : 'text-amber-600'} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{alert.title}</p>
                  <p className="text-[10px] text-muted-foreground">{alert.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-11">
                {alert.actions.map((action, i) => (
                  <Button key={i} variant="outline" size="sm" className="text-[10px] h-9 rounded-xl min-h-[36px]" onClick={() => {
                    hapticMedium();
                    if (action.actionType === 'simplify-habit' && action.targetId) {
                      const h = habits.find(x => x.id === action.targetId);
                      if (h) {
                        if (h.fallback) {
                          updateHabit(h.id, { isMicro: true });
                          toast.success(`"${h.title}" switched to Minimum Version`);
                        } else {
                          updateHabit(h.id, { fallback: "Just 2 minutes", isMicro: true });
                          toast.success(`Added Minimum Version for "${h.title}"`);
                        }
                      }
                    } else if (action.actionType === 'create-cleanup-task') {
                      addTask({ title: action.payload?.title || "Quick sprint", energy: "Low", emotion: "", completed: false, habitId: null, goalId: null, domain: action.payload?.domain || null, dueDate: new Date().toLocaleDateString('en-CA'), priority: "High", label: "", labels: [] });
                      toast.success("Cleanup task created");
                    } else if (action.actionType === 'reduce-goals') {
                      const activeGoals = goals.filter(g => !g.isPaused);
                      if (activeGoals.length > 1) {
                        const toPause = activeGoals[activeGoals.length - 1];
                        updateGoal(toPause.id, { isPaused: true });
                        toast.success(`Paused "${toPause.title}"`);
                      } else {
                        toast.info("Only 1 active goal — nothing to pause.");
                      }
                    } else if (action.actionType === 'reschedule' && action.targetId) {
                      setLocation("/habits");
                      toast("Open the habit to adjust its schedule.");
                    } else if (action.actionType === 'add-reminder') {
                      setIsNotifSettingsOpen(true);
                      toast.success("Opening notification settings");
                    }
                  }}>{action.label}</Button>
                ))}
              </div>
            </Card>
          ))}
        </section>
      )}
      </div>

      <div style={{ order: sectionOrder('gravity'), ...((isSectionVisible('gravity') && highLeverageHabits.length > 0) ? {} : { display: 'none' }) }}>
      {/* Keystone Gravity Highlights */}
      {highLeverageHabits.length > 0 && (
        <section className="space-y-3" data-testid="section-coach-gravity">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
            <Zap size={12} className="text-emerald-500" /> High Leverage Habits <ScoringInfoButton type="gravity-score" size={11} />
          </h2>
          <Card className="p-4 rounded-[1.5rem] ring-1 ring-border/20">
            <div className="space-y-3">
              {highLeverageHabits.map(h => (
                <div key={h.id} className="flex items-center justify-between" data-testid={`card-coach-gravity-${h.id}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{h.title}</p>
                      <p className="text-[10px] text-muted-foreground">Gravity {h.score}/100</p>
                    </div>
                  </div>
                  <Badge className="text-[8px] bg-emerald-500/10 text-emerald-600 border-none font-bold uppercase">High Leverage</Badge>
                </div>
              ))}
            </div>
            {rhythm < 60 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <p className="text-[10px] text-emerald-600 font-medium italic">
                  💡 During overload, focus on these habits first — they pull your whole system forward.
                </p>
              </div>
            )}
          </Card>
        </section>
      )}
      </div>

      <div style={{ order: sectionOrder('friction'), ...((isSectionVisible('friction') && (frictionInsights.topReasons.length > 0 || frictionInsights.suggestions.length > 0)) ? {} : { display: 'none' }) }}>
      {/* Friction Patterns */}
      {(frictionInsights.topReasons.length > 0 || frictionInsights.suggestions.length > 0) && (
        <section className="space-y-3" data-testid="section-coach-friction">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-500" /> Friction Patterns <ScoringInfoButton type="friction-mapping" size={11} />
          </h2>
          <Card className="p-4 rounded-[1.5rem] ring-1 ring-border/20">
            {frictionInsights.topReasons.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Top Reasons (14d)</p>
                <div className="flex flex-wrap gap-2">
                  {frictionInsights.topReasons.slice(0, 4).map(r => (
                    <div key={r.tag} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/5 rounded-xl ring-1 ring-amber-500/10">
                      <span className="text-[11px] font-bold text-amber-700">{r.tag}</span>
                      <span className="text-[9px] text-amber-600/60">{r.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {frictionInsights.topEntities.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Most Affected</p>
                <div className="space-y-1.5">
                  {frictionInsights.topEntities.slice(0, 3).map(e => (
                    <div key={`${e.entityType}:${e.entityId}`} className="flex items-center justify-between text-xs" data-testid={`friction-entity-${e.entityId}`}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[7px] border-muted-foreground/20 font-bold uppercase">{e.entityType}</Badge>
                        <span className="font-medium text-foreground/80 truncate">{e.entityTitle}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{e.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {frictionInsights.suggestions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-border/20">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Redesign Actions</p>
                <div className="space-y-2">
                  {frictionInsights.suggestions.slice(0, 3).map((s, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2.5 px-3 rounded-xl bg-muted/20 hover:bg-muted/40"
                      onClick={() => {
                        if (s.type === 'minimum-version') {
                          updateHabit(s.entityId, { isMicro: true });
                          hapticMedium();
                          toast.success(`"${s.entityTitle}" switched to Minimum Version`);
                        } else if (s.type === 'reschedule') {
                          setLocation("/habits");
                          hapticLight();
                        } else if (s.type === 'add-cue') {
                          const habit = habits.find(h => h.id === s.entityId);
                          if (habit) {
                            updateHabit(s.entityId, { cueNote: habit.cueNote || 'Add a visible reminder' });
                          }
                          hapticMedium();
                          toast.success(`Cue note updated for "${s.entityTitle}"`);
                        } else if (s.type === 'reduce-frequency') {
                          updateHabit(s.entityId, { schedule: '3-5x/week' });
                          hapticMedium();
                          toast.success(`"${s.entityTitle}" reduced to 3-5x/week`);
                        } else if (s.type === 'create-supporting-task') {
                          addTask({
                            title: `Remove friction for: ${s.entityTitle}`,
                            energy: 'Low',
                            emotion: '',
                            completed: false,
                            habitId: null,
                            goalId: null,
                            domain: null,
                            dueDate: new Date().toLocaleDateString('en-CA'),
                            priority: 'Medium',
                            label: '',
                            labels: [],
                          });
                          hapticMedium();
                          toast.success("Supporting task created");
                        } else if (s.type === 'break-down') {
                          addTask({
                            title: `Break down: ${s.entityTitle}`,
                            energy: 'Low',
                            emotion: '',
                            completed: false,
                            habitId: null,
                            goalId: null,
                            domain: null,
                            dueDate: new Date().toLocaleDateString('en-CA'),
                            priority: 'High',
                            label: '',
                            labels: ['Deep Work'],
                          });
                          hapticMedium();
                          toast.success("Breakdown task created");
                        } else if (s.type === 'explore-resistance') {
                          addTask({
                            title: `Reflect: why resistance to ${s.entityTitle}?`,
                            energy: 'Low',
                            emotion: '',
                            completed: false,
                            habitId: null,
                            goalId: null,
                            domain: null,
                            dueDate: new Date().toLocaleDateString('en-CA'),
                            priority: 'Medium',
                            label: '',
                            labels: ['Recovery'],
                          });
                          hapticMedium();
                          toast.success("Reflection task created");
                        }
                      }}
                      data-testid={`button-friction-action-${i}`}
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-foreground/80 leading-relaxed">{s.message}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}
      </div>

      <div style={{ order: sectionOrder('streaks'), ...((isSectionVisible('streaks') && (topStreaks.length > 0 || goalStreaks.length > 0)) ? {} : { display: 'none' }) }}>
      {(topStreaks.length > 0 || goalStreaks.length > 0) && (
        <section className="space-y-3" data-testid="section-coach-streaks">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
            🔥 Celebration Streaks
          </h2>

          {nearMilestoneItems.length > 0 && (
            <Card className="p-4 rounded-[1.5rem] ring-1 ring-amber-500/20 bg-amber-500/[0.03]" data-testid="card-near-milestone">
              <div className="space-y-2.5">
                {nearMilestoneItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-xl shrink-0 animate-in zoom-in duration-500">
                      {item.milestone.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-tight">
                        {item.daysAway === 1 ? 'Tomorrow could be' : `${item.daysAway} days from`} {item.milestone.label}!
                      </p>
                      <p className="text-[10px] text-amber-600/70 truncate">{item.title} — {item.streak}d streak</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4 rounded-[1.5rem] ring-1 ring-border/20">
            <div className="space-y-3">
              {topStreaks.slice(0, 3).map((entry) => {
                const next = getNextMilestone(entry.streak.currentStreak);
                const progress = next ? Math.round((entry.streak.currentStreak / next.days) * 100) : 100;
                const tier = getStreakTier(entry.streak.currentStreak);
                const flame = getStreakFlame(entry.streak.currentStreak);
                const pb = isPersonalBest(entry.streak.currentStreak, entry.streak.longestStreak);
                const currentMilestone = getMilestone(entry.streak.currentStreak);
                return (
                  <div
                    key={entry.habitId}
                    className="space-y-1.5 cursor-pointer active:scale-[0.98] transition-all"
                    onClick={() => {
                      if (currentMilestone) {
                        setCelebrationData({ title: entry.title, label: 'Habit Streak', currentStreak: entry.streak.currentStreak, milestone: currentMilestone });
                        hapticSuccess();
                      } else {
                        hapticLight();
                      }
                    }}
                    data-testid={`card-coach-streak-${entry.habitId}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl ${tier.bgColor} flex items-center justify-center ${tier.color} text-sm font-bold shrink-0`}>
                        {entry.streak.currentStreak}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{entry.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {next ? `${next.emoji} ${next.label} in ${next.days - entry.streak.currentStreak}d` : 'Keep going!'}
                          {entry.streak.longestStreak > entry.streak.currentStreak && ` · Best: ${entry.streak.longestStreak}d`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pb && (
                          <Badge className="text-[7px] bg-yellow-500/10 text-yellow-600 border-none font-bold uppercase" data-testid={`badge-pb-${entry.habitId}`}>
                            New Best
                          </Badge>
                        )}
                        {tier.level >= 2 && (
                          <Badge className={`text-[7px] ${tier.bgColor} ${tier.color} border-none font-bold uppercase`}>
                            {flame} {tier.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {next && (
                      <div className="ml-11">
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {goalStreaks.slice(0, 2).map((entry) => {
                const next = getNextMilestone(entry.streak.currentStreak);
                const progress = next ? Math.round((entry.streak.currentStreak / next.days) * 100) : 100;
                const tier = getStreakTier(entry.streak.currentStreak);
                const flame = getStreakFlame(entry.streak.currentStreak);
                const currentMilestone = getMilestone(entry.streak.currentStreak);
                return (
                  <div
                    key={entry.goalId}
                    className="space-y-1.5 cursor-pointer active:scale-[0.98] transition-all"
                    onClick={() => {
                      if (currentMilestone) {
                        setCelebrationData({ title: entry.title, label: 'Goal Streak', currentStreak: entry.streak.currentStreak, milestone: currentMilestone });
                        hapticSuccess();
                      } else {
                        hapticLight();
                      }
                    }}
                    data-testid={`card-coach-goal-streak-${entry.goalId}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl ${entry.streak.currentStreak > 0 ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground'} flex items-center justify-center text-sm font-bold shrink-0`}>
                        {entry.streak.currentStreak}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Target size={10} className="text-primary shrink-0" />
                          <p className="text-xs font-bold text-foreground truncate">{entry.title}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {next ? `${next.emoji} ${next.label} in ${next.days - entry.streak.currentStreak}d` : 'Keep going!'}
                          {entry.streak.longestStreak > entry.streak.currentStreak && ` · Best: ${entry.streak.longestStreak}d`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tier.level >= 2 && (
                          <Badge className={`text-[7px] ${tier.bgColor} ${tier.color} border-none font-bold uppercase`}>
                            {flame} {tier.name}
                          </Badge>
                        )}
                        <Badge className="text-[7px] bg-primary/10 text-primary border-none font-bold uppercase">Goal</Badge>
                      </div>
                    </div>
                    {next && (
                      <div className="ml-11">
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              variant="link"
              size="sm"
              className="w-full mt-2 text-[10px] text-muted-foreground h-8"
              onClick={() => { setIsStreakSheetOpen(true); hapticLight(); }}
              data-testid="button-view-all-streaks"
            >
              View all streaks & trophies →
            </Button>
          </Card>
        </section>
      )}

      <Sheet open={isStreakSheetOpen} onOpenChange={setIsStreakSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <SheetTitle className="font-serif text-xl text-primary">Streaks & Trophies</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-6">
            {(() => {
              const allHistory = store.celebratedMilestoneHistory || {};
              const allTrophies: Array<{ entityId: string; entityName: string; days: number; date: string; emoji: string; label: string }> = [];
              for (const [entityId, entries] of Object.entries(allHistory)) {
                const habit = habits.find(h => h.id === entityId);
                const goal = goals.find(g => `goal-${g.id}` === entityId);
                const name = habit?.title || goal?.title || entityId;
                for (const entry of entries) {
                  const ms = getMilestone(entry.days);
                  if (ms) allTrophies.push({ entityId, entityName: name, days: entry.days, date: entry.date, emoji: ms.emoji, label: ms.label });
                }
              }
              allTrophies.sort((a, b) => b.date.localeCompare(a.date));
              if (allTrophies.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Trophy Case</p>
                  <div className="grid grid-cols-3 gap-2">
                    {allTrophies.slice(0, 9).map((trophy, i) => (
                      <div key={`${trophy.entityId}-${trophy.days}-${i}`} className="flex flex-col items-center p-3 bg-muted/20 rounded-2xl" data-testid={`trophy-${trophy.entityId}-${trophy.days}`}>
                        <span className="text-2xl mb-1">{trophy.emoji}</span>
                        <p className="text-[9px] font-bold text-foreground text-center leading-tight">{trophy.label}</p>
                        <p className="text-[8px] text-muted-foreground truncate max-w-full text-center mt-0.5">{trophy.entityName}</p>
                        <p className="text-[8px] text-muted-foreground/50 mt-0.5">{new Date(trophy.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    ))}
                  </div>
                  {allTrophies.length > 9 && (
                    <p className="text-[9px] text-muted-foreground text-center">+{allTrophies.length - 9} more</p>
                  )}
                </div>
              );
            })()}

            {habits.filter(h => !h.isPaused).length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Habit Streaks</p>
                <div className="space-y-2">
                  {habits.filter(h => !h.isPaused).map(habit => {
                    const streak = allHabitStreaks.get(habit.id);
                    const next = streak ? getNextMilestone(streak.currentStreak) : null;
                    const progress = next && streak ? Math.round((streak.currentStreak / next.days) * 100) : (streak && streak.currentStreak > 0 ? 100 : 0);
                    const tier = streak ? getStreakTier(streak.currentStreak) : getStreakTier(0);
                    const pb = streak ? isPersonalBest(streak.currentStreak, streak.longestStreak) : false;
                    const currentMilestone = streak ? getMilestone(streak.currentStreak) : null;
                    return (
                      <div
                        key={habit.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 ${currentMilestone ? 'cursor-pointer active:scale-[0.98] transition-all' : ''}`}
                        onClick={() => {
                          if (currentMilestone && streak) {
                            setCelebrationData({ title: habit.title, label: 'Habit Streak', currentStreak: streak.currentStreak, milestone: currentMilestone });
                            hapticSuccess();
                          }
                        }}
                        data-testid={`sheet-streak-habit-${habit.id}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${streak && streak.currentStreak > 0 ? tier.bgColor + ' ' + tier.color : 'bg-muted/40 text-muted-foreground'}`}>
                          {streak?.currentStreak || 0}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-foreground truncate">{habit.title}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              {pb && <Badge className="text-[7px] bg-yellow-500/10 text-yellow-600 border-none font-bold uppercase">Best</Badge>}
                              {streak && streak.currentStreak > 0 && getStreakFlame(streak.currentStreak) && (
                                <span className="text-[10px]">{getStreakFlame(streak.currentStreak)}</span>
                              )}
                            </div>
                          </div>
                          {next && streak && streak.currentStreak > 0 && (
                            <div className="space-y-0.5">
                              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
                              </div>
                              <p className="text-[9px] text-muted-foreground">{next.emoji} {next.label} in {next.days - streak.currentStreak}d</p>
                            </div>
                          )}
                          {streak && streak.longestStreak > 0 && streak.longestStreak > streak.currentStreak && (
                            <p className="text-[9px] text-muted-foreground">Personal best: {streak.longestStreak}d</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {goals.filter(g => !g.isPaused).length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Goal Streaks</p>
                <div className="space-y-2">
                  {goals.filter(g => !g.isPaused).map(goal => {
                    const streak = computeGoalStreak(goal.id, tasks, logs, todayDate);
                    const next = getNextMilestone(streak.currentStreak);
                    const progress = next ? Math.round((streak.currentStreak / next.days) * 100) : (streak.currentStreak > 0 ? 100 : 0);
                    const tier = getStreakTier(streak.currentStreak);
                    const currentMilestone = getMilestone(streak.currentStreak);
                    return (
                      <div
                        key={goal.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 ${currentMilestone ? 'cursor-pointer active:scale-[0.98] transition-all' : ''}`}
                        onClick={() => {
                          if (currentMilestone) {
                            setCelebrationData({ title: goal.title, label: 'Goal Streak', currentStreak: streak.currentStreak, milestone: currentMilestone });
                            hapticSuccess();
                          }
                        }}
                        data-testid={`sheet-streak-goal-${goal.id}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${streak.currentStreak > 0 ? tier.bgColor + ' ' + tier.color : 'bg-muted/40 text-muted-foreground'}`}>
                          {streak.currentStreak}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Target size={10} className="text-primary shrink-0" />
                              <p className="text-xs font-bold text-foreground truncate">{goal.title}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {streak.currentStreak > 0 && getStreakFlame(streak.currentStreak) && (
                                <span className="text-[10px]">{getStreakFlame(streak.currentStreak)}</span>
                              )}
                            </div>
                          </div>
                          {next && streak.currentStreak > 0 && (
                            <div className="space-y-0.5">
                              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
                              </div>
                              <p className="text-[9px] text-muted-foreground">{next.emoji} {next.label} in {next.days - streak.currentStreak}d</p>
                            </div>
                          )}
                          {streak.longestStreak > 0 && streak.longestStreak > streak.currentStreak && (
                            <p className="text-[9px] text-muted-foreground">Personal best: {streak.longestStreak}d</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      </div>

      <div style={{ order: sectionOrder('proof'), ...((isSectionVisible('proof') && store.proofEvents.length > 0) ? {} : { display: 'none' }) }}>
      {/* Proof Highlights */}
      {store.proofEvents.length > 0 && (
        <section className="space-y-3" data-testid="section-coach-proof">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
            <Fingerprint size={12} className="text-primary" /> Proof of Becoming <ScoringInfoButton type="proof-timeline" size={11} />
          </h2>
          <Card className="p-4 rounded-[1.5rem] ring-1 ring-border/20">
            <div className="space-y-2">
              {store.proofEvents.slice(-3).reverse().map((event, i) => (
                <div key={event.id || i} className="flex items-start gap-2 text-xs" data-testid={`card-coach-proof-${i}`}>
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Star size={10} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{event.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{event.whyItMatters}</p>
                  </div>
                  {event.domain && <Badge className="bg-primary/10 text-primary border-none text-[8px] shrink-0">{event.domain}</Badge>}
                </div>
              ))}
            </div>
            {store.proofEvents.length > 3 && (
              <Button variant="link" size="sm" onClick={() => setLocation("/identity")} className="text-[10px] p-0 mt-2">View full timeline</Button>
            )}
          </Card>
        </section>
      )}
      </div>

      <div style={{ order: sectionOrder('evidence'), ...((isSectionVisible('evidence') && evidence.evidence.length > 0) ? {} : { display: 'none' }) }}>
      {/* Evidence Summary */}
      {evidence.evidence.length > 0 && (
        <section className="space-y-3" data-testid="section-coach-evidence">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
            <Check size={12} className="text-secondary" /> Evidence This Week
          </h2>
          <Card className="p-4 rounded-[1.5rem] ring-1 ring-border/20">
            <div className="space-y-2">
              {evidence.evidence.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Check size={10} className="text-secondary shrink-0" />
                  <span className="text-foreground font-medium">{item.label}</span>
                  {item.domain && <Badge className="bg-primary/10 text-primary border-none text-[8px] ml-auto">{item.domain}</Badge>}
                </div>
              ))}
            </div>
            {evidence.evidence.length > 3 && (
              <Button variant="link" size="sm" onClick={() => setLocation("/identity")} className="text-[10px] p-0 mt-2">View all on Identity page</Button>
            )}
          </Card>
        </section>
      )}
      </div>

      <div style={{ order: sectionOrder('strategic-plan'), ...(isSectionVisible('strategic-plan') ? {} : { display: 'none' }) }}>
      {/* Strategic Plan Summary */}
      <section className="space-y-4" data-testid="section-strategic-plan">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Compass size={12} className="text-primary" /> Strategic Plan
          </h2>
          <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest">{currentQuarterKey}</span>
        </div>

        <Card className="bg-primary/[0.03] border-none shadow-none rounded-[2rem] p-5 ring-1 ring-primary/10 overflow-hidden relative active:scale-[0.99] transition-all" data-testid="card-strategic-summary" onClick={() => { hapticLight(); setLocation("/review"); }}>
          <div className="absolute top-0 right-0 p-4 opacity-[0.06]"><Compass size={64}/></div>
          <div className="relative z-10 space-y-3">
            {planThemesStr ? (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase text-primary tracking-widest opacity-60">Themes</p>
                <p className="text-sm font-serif text-primary leading-relaxed">{planThemesStr}</p>
              </div>
            ) : null}
            {store.strategicIntent ? (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase text-primary tracking-widest opacity-60">Intent</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{store.strategicIntent}</p>
              </div>
            ) : null}
            {!planThemesStr && !store.strategicIntent ? (
              <div className="text-center py-2">
                <p className="text-xs font-bold text-primary/70">Define your strategic direction</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">Set themes and intent in the Review tab</p>
              </div>
            ) : null}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="text-[9px] font-bold uppercase text-primary/50 tracking-widest">Edit in Review</span>
              <ArrowRight size={10} className="text-primary/50" />
            </div>
          </div>
        </Card>
      </section>

      {/* Grace 2.0 & Momentum */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-none shadow-sm rounded-[2rem] p-6 text-center ring-1 ring-border/30">
          <TrendingUp size={24} className="mx-auto mb-3 text-primary opacity-40" />
          <div className="text-3xl font-serif text-primary tracking-tighter">{rhythm}%</div>
          <div className="text-[9px] uppercase font-bold text-muted-foreground mt-1.5 tracking-widest opacity-60 flex items-center justify-center gap-1">Rhythm Score <ScoringInfoButton type="rhythm-score" size={11} /></div>
        </Card>
        <Dialog open={isGraceDialogOpen} onOpenChange={setIsGraceDialogOpen}>
          <DialogTrigger asChild>
            <Card className="bg-card border-none shadow-sm rounded-[2rem] p-6 text-center ring-1 ring-border/30 active:scale-95 transition-transform cursor-pointer">
              <Shield size={24} className="mx-auto mb-3 text-secondary opacity-40" />
              <div className="text-3xl font-serif text-secondary tracking-tighter">{graceDaysPerWeek - graceDaysUsedThisWeek}</div>
              <div className="text-[9px] uppercase font-bold text-muted-foreground mt-1.5 tracking-widest opacity-60">Grace Bank</div>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle className="font-serif text-xl">Compassionate Accountability</DialogTitle></DialogHeader>
            <div className="py-6 space-y-6">
              <div className="p-4 bg-secondary/[0.03] rounded-2xl ring-1 ring-secondary/10 text-xs text-muted-foreground leading-relaxed italic text-center">
                "Grace protects the rhythm, recommitment protects the results."
              </div>
              
              {!graceTarget && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Select Item for Grace</label>
                  <Select onValueChange={(v) => {
                    const [type, id] = v.split(':');
                    setGraceTarget({ type: type as any, id });
                  }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none"><SelectValue placeholder="What needs grace?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header_h" disabled className="text-[10px] font-bold uppercase">Habits</SelectItem>
                      {habits.filter(h => !h.isPaused).map(h => <SelectItem key={h.id} value={`habit:${h.id}`}>{h.title}</SelectItem>)}
                      <SelectItem value="header_t" disabled className="text-[10px] font-bold uppercase">Overdue Tasks</SelectItem>
                      {tasks.filter(t => !t.completed && t.dueDate && t.dueDate < new Date().toLocaleDateString('en-CA')).map(t => <SelectItem key={t.id} value={`task:${t.id}`}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {graceTarget && (
                <div className="grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center text-muted-foreground mb-2">Recommitment Mode</p>
                  {graceTarget.type === 'habit' && (
                    <Button onClick={() => handleGraceRecommit('min')} className="h-14 rounded-2xl font-bold bg-primary/10 text-primary hover:bg-primary/20 border-none">Do Minimum Version Now</Button>
                  )}
                  <Button onClick={() => handleGraceRecommit('tomorrow')} className="h-14 rounded-2xl font-bold bg-secondary/10 text-secondary hover:bg-secondary/20 border-none">Schedule for Tomorrow</Button>
                  <Button variant="ghost" onClick={() => setGraceTarget(null)} className="h-12 rounded-2xl text-[10px] font-bold uppercase">Back</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <div style={{ order: sectionOrder('suggestions'), ...(isSectionVisible('suggestions') ? {} : { display: 'none' }) }}>
      {/* Dynamic Recommendations */}
      <section className="space-y-4" data-testid="section-leadership-steps">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">System Suggestions</h2>
          <Button variant="link" onClick={() => setLocation("/review")} className="h-auto p-0 text-[10px] font-bold uppercase opacity-50">Sunday Reset</Button>
        </div>
        {(() => { const recs = getRecommendations(); return recs.length === 0 ? (
          <Card className="p-5 rounded-[1.5rem] ring-1 ring-border/20 text-center">
            <Check size={20} className="mx-auto text-secondary mb-2" />
            <p className="text-sm text-muted-foreground">Your system is well-calibrated. No suggestions right now.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recs.map((rec) => (
              <Card key={rec.id} className="border-none shadow-sm bg-card rounded-[1.5rem] active:scale-[0.98] transition-all ring-1 ring-border/20 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                      {rec.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground mb-0.5">{rec.title}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{rec.text}</p>
                    </div>
                  </div>
                  <Button
                    onClick={rec.action}
                    className="w-full rounded-xl min-h-[44px] bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-xs"
                    data-testid={`button-suggestion-${rec.id}`}
                  >
                    {rec.actionLabel}
                    <span className="ml-2 text-[9px] font-normal opacity-60">· {rec.impact}</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ); })()}
      </section>
      </div>

      <div style={{ order: sectionOrder('reminders'), ...(isSectionVisible('reminders') ? {} : { display: 'none' }) }}>
      {/* Reminder Center */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Bell size={14} className="text-amber-500 opacity-50" /> Reminders
          </h2>
          <Button
            variant="link"
            onClick={() => setIsNotifSettingsOpen(true)}
            className="h-auto p-0 text-[10px] font-bold uppercase opacity-50 flex items-center gap-1"
            data-testid="button-notification-settings"
          >
            <Settings2 size={10} /> Settings
          </Button>
        </div>
        <ReminderCenter />
      </section>

      <NotificationSettingsDialog open={isNotifSettingsOpen} onOpenChange={setIsNotifSettingsOpen} />
      </div>

      <div style={{ order: sectionOrder('alignment'), ...(isSectionVisible('alignment') ? {} : { display: 'none' }) }}>
      {/* Identity Alignment Score (Optional Upgrade) */}
      {systemUpgrades.identityAlignment && (
        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
            <Fingerprint size={14} className="text-primary opacity-50" /> Identity Alignment <ScoringInfoButton type="identity-alignment" size={13} />
          </h2>
          {identities.length > 0 ? (
          <Card className="p-6 rounded-[2rem] bg-card border-none ring-1 ring-border/20 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Alignment Score</span>
                <span className="text-xl font-serif text-primary" data-testid="text-coach-alignment-detail">{weeklyTrend.current}%</span>
             </div>
             <Progress value={weeklyTrend.current} className="h-1.5 rounded-full mb-4" />
             <p className="text-[10px] text-muted-foreground italic">
               {weeklyTrend.current >= 70 
                 ? `Your actions this week strongly reflect your values of ${activeIdentities.flatMap(i => i.values).filter(Boolean).join(", ") || "growth"}.`
                 : weeklyTrend.current >= 40
                 ? `Some of your actions align with your ${activeIdentities.length > 1 ? 'identities' : 'identity'}. Small adjustments can close the gap.`
                 : `Your system needs recalibration. Focus on one keystone habit to rebuild momentum.`}
             </p>
          </Card>
          ) : (
          <Card className="p-6 rounded-[2rem] bg-card border-none ring-1 ring-border/20 shadow-sm active:scale-[0.99] transition-all cursor-pointer" onClick={() => { hapticLight(); setLocation("/identity"); }} data-testid="card-alignment-empty">
            <div className="text-center space-y-2">
              <Fingerprint size={28} className="mx-auto text-primary opacity-30" />
              <p className="text-xs font-bold text-primary/70">No identities defined yet</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Define your future self in the Identity tab to activate alignment scoring.</p>
            </div>
          </Card>
          )}
        </section>
      )}
      </div>

      <div style={{ order: sectionOrder('trajectory'), ...(isSectionVisible('trajectory') ? {} : { display: 'none' }) }}>
      {/* Strategic Trajectory */}
      <section className="space-y-4" data-testid="section-strategic-trajectory">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
          <Activity size={14} className="text-primary opacity-50" /> Strategic Trajectory <ScoringInfoButton type="strategic-trajectory" size={11} />
        </h2>
        <Card className="border-none shadow-sm bg-card rounded-[1.5rem] p-5 ring-1 ring-border/20 space-y-4" data-testid="card-trajectory">
          <div className="flex items-center gap-3 flex-wrap" data-testid="trajectory-indicators">
            <div className="flex items-center gap-1.5">
              <span className={`text-lg ${trajectory.momentum === '↑' ? 'text-emerald-500' : trajectory.momentum === '↓' ? 'text-destructive' : 'text-muted-foreground'}`}>{trajectory.momentum}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Momentum</span>
            </div>
            <Badge
              className={`text-[8px] font-bold uppercase px-2 py-0.5 border-none ${
                trajectory.stability === 'Stable' ? 'bg-emerald-500/10 text-emerald-600'
                : trajectory.stability === 'Pressured' ? 'bg-amber-500/10 text-amber-600'
                : 'bg-destructive/10 text-destructive'
              }`}
              data-testid="badge-stability"
            >
              {trajectory.stability}
            </Badge>
            <Badge
              className={`text-[8px] font-bold uppercase px-2 py-0.5 border-none ${
                trajectory.riskOutlook === 'Clear' ? 'bg-emerald-500/10 text-emerald-600'
                : trajectory.riskOutlook === 'Watch' ? 'bg-amber-500/10 text-amber-600'
                : 'bg-destructive/10 text-destructive'
              }`}
              data-testid="badge-risk-outlook"
            >
              Risk: {trajectory.riskOutlook}
            </Badge>
            {trajectory.domainMisalignment > 0 && (
              <Badge
                className={`text-[8px] font-bold uppercase px-2 py-0.5 border-none ${
                  trajectory.domainMisalignment >= 70 ? 'bg-destructive/10 text-destructive'
                  : trajectory.domainMisalignment >= 40 ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted text-muted-foreground'
                }`}
                data-testid="badge-domain-misalignment"
              >
                Domain gap: {trajectory.domainMisalignment}%
              </Badge>
            )}
          </div>

          <p className="text-[11px] text-foreground/80 leading-relaxed font-medium">{trajectory.direction}</p>

          {trajectory.tailwinds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/70">Tailwinds</p>
              {trajectory.tailwinds.map((tw, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-emerald-500 mt-0.5 shrink-0">▲</span>
                  <span className="text-foreground/70 leading-relaxed">{tw}</span>
                </div>
              ))}
            </div>
          )}

          {trajectory.headwinds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600/70">Headwinds</p>
              {trajectory.headwinds.map((hw, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-amber-500 mt-0.5 shrink-0">▼</span>
                  <span className="text-foreground/70 leading-relaxed">{hw}</span>
                </div>
              ))}
            </div>
          )}

          {trajectory.corrections.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-border/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Course Corrections</p>
              {trajectory.corrections.map((corr) => (
                <button
                  key={corr.id}
                  onClick={() => {
                    hapticMedium();
                    if (corr.actionType === 'pause-habit' && corr.entityId) {
                      updateHabit(corr.entityId, { isPaused: true });
                      toast.success(corr.label);
                    } else if (corr.actionType === 'switch-season') {
                      setSeasonMode('Stabilize');
                      toast.success('Season switched to Stabilize');
                    } else if (corr.actionType === 'schedule-reset') {
                      setLocation('/review');
                      toast.success('Opening Review for triage');
                    } else if (corr.actionType === 'minimum-version') {
                      const toSwitch = habits.filter(h => !h.isPaused && !h.isMicro && !h.isKeystone && h.fallback);
                      toSwitch.forEach(h => updateHabit(h.id, { isMicro: true }));
                      toast.success(`${toSwitch.length} habits switched to Minimum Version`);
                    } else if (corr.actionType === 'prioritize-keystone') {
                      store.updateSystemUpgrade('keystoneMode', true);
                      toast.success('Keystone Mode enabled — focus on what matters most');
                    } else if (corr.actionType === 'adjust-constraints') {
                      store.setStrictMode({ enabled: true });
                      toast.success('Strict Mode enabled — constraints adjusted');
                    }
                  }}
                  className="w-full text-left p-3 rounded-xl bg-muted/20 hover:bg-muted/40 active:scale-[0.98] transition-all"
                  data-testid={`button-trajectory-correction-${corr.id}`}
                >
                  <p className="text-[11px] font-bold text-foreground">{corr.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{corr.description}</p>
                </button>
              ))}
            </div>
          )}

          {trajectory.tailwinds.length === 0 && trajectory.headwinds.length === 0 && (
            <p className="text-[10px] text-muted-foreground/50 italic">
              Build more data to generate trajectory analysis. Log habits and tasks daily.
            </p>
          )}
        </Card>
      </section>
      </div>

      <div style={{ order: sectionOrder('upgrades'), ...(isSectionVisible('upgrades') ? {} : { display: 'none' }) }}>
      {/* Systems Upgrades */}
      <section className="space-y-4" data-testid="section-system-upgrades">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
          <Layers size={14} className="opacity-50" /> System Upgrades
        </h2>
        <div className="space-y-2">
           <Card className="p-4 rounded-2xl bg-card border-none ring-1 ring-border/20 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3 flex-1 min-w-0">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Star size={14} className="text-primary" /></div>
               <div className="min-w-0">
                 <p className="text-xs font-bold text-foreground">Keystone Mode</p>
                 <p className="text-[10px] text-muted-foreground leading-snug">Only show keystone habits on My Day. Cuts noise, protects focus.</p>
               </div>
             </div>
             <Switch checked={systemUpgrades.keystoneMode} onCheckedChange={(c) => { updateSystemUpgrade('keystoneMode', c); hapticMedium(); toast.success(c ? "Keystone Mode on — only critical habits on My Day" : "Keystone Mode off — all habits visible"); }} data-testid="switch-keystone-mode" />
           </Card>
           <Card className="p-4 rounded-2xl bg-card border-none ring-1 ring-border/20 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3 flex-1 min-w-0">
               <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Activity size={14} className="text-blue-500" /></div>
               <div className="min-w-0">
                 <p className="text-xs font-bold text-foreground">Energy Scheduling</p>
                 <p className="text-[10px] text-muted-foreground leading-snug">Auto-sort tasks by energy match. Low energy days show easy tasks first.</p>
               </div>
             </div>
             <Switch checked={systemUpgrades.energyScheduling} onCheckedChange={(c) => { updateSystemUpgrade('energyScheduling', c); hapticMedium(); toast.success(c ? "Energy Scheduling on — tasks sorted by your energy" : "Energy Scheduling off"); }} data-testid="switch-energy-scheduling" />
           </Card>
           <Card className="p-4 rounded-2xl bg-card border-none ring-1 ring-border/20 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3 flex-1 min-w-0">
               <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><AlertTriangle size={14} className="text-amber-500" /></div>
               <div className="min-w-0">
                 <p className="text-xs font-bold text-foreground">Friction Audit</p>
                 <p className="text-[10px] text-muted-foreground leading-snug">Track why habits fail. Prompts you to log friction when you skip or defer.</p>
               </div>
             </div>
             <Switch checked={systemUpgrades.frictionAudit} onCheckedChange={(c) => { updateSystemUpgrade('frictionAudit', c); hapticMedium(); toast.success(c ? "Friction Audit on — you'll be prompted when habits slip" : "Friction Audit off"); }} data-testid="switch-friction-audit" />
           </Card>
           <Card className="p-4 rounded-2xl bg-card border-none ring-1 ring-border/20 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3 flex-1 min-w-0">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Fingerprint size={14} className="text-primary" /></div>
               <div className="min-w-0">
                 <p className="text-xs font-bold text-foreground">Identity Alignment</p>
                 <p className="text-[10px] text-muted-foreground leading-snug">Score how well your daily actions match your identity and values.</p>
               </div>
             </div>
             <Switch checked={systemUpgrades.identityAlignment} onCheckedChange={(c) => { updateSystemUpgrade('identityAlignment', c); hapticMedium(); toast.success(c ? "Identity Alignment on — score visible below" : "Identity Alignment off"); }} data-testid="switch-identity-alignment" />
           </Card>
           <Card className="p-4 rounded-2xl bg-card border-none ring-1 ring-border/20 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3 flex-1 min-w-0">
               <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0"><Target size={14} className="text-secondary" /></div>
               <div className="min-w-0">
                 <p className="text-xs font-bold text-foreground">Focus Mode</p>
                 <p className="text-[10px] text-muted-foreground leading-snug">Limit My Day to top 5 habits and 3 tasks. Less noise, more impact.</p>
               </div>
             </div>
             <Switch checked={systemUpgrades.focusMode} onCheckedChange={(c) => { updateSystemUpgrade('focusMode', c); hapticMedium(); toast.success(c ? "Focus Mode on — My Day trimmed to essentials" : "Focus Mode off — all items visible"); }} data-testid="switch-focus-mode" />
           </Card>

           <Card className="p-4 rounded-2xl bg-card border-none ring-1 ring-border/20 space-y-3">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Palette size={14} className="text-primary" /></div>
               <div className="min-w-0">
                 <p className="text-xs font-bold text-foreground">Color Theme</p>
                 <p className="text-[10px] text-muted-foreground leading-snug">Shifts palette based on time of day, or lock to a specific mood.</p>
               </div>
             </div>
             <div className="grid grid-cols-5 gap-1.5">
               {([
                 { key: 'auto', label: 'Auto', colors: ['#c4956a', '#8fa87e', '#c2956a', '#3d4260'] },
                 { key: 'morning', label: 'Morning', colors: ['#c4956a', '#c9a86c'] },
                 { key: 'day', label: 'Day', colors: ['#b5785a', '#8fa87e'] },
                 { key: 'evening', label: 'Evening', colors: ['#b56a4a', '#c49560'] },
                 { key: 'night', label: 'Night', colors: ['#7a8ab0', '#3d4260'] },
               ] as const).map(t => (
                 <button
                   key={t.key}
                   onClick={() => { setColorTheme(t.key); hapticLight(); toast.success(`Theme: ${t.label}`); }}
                   className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95 ${
                     colorTheme === t.key ? 'ring-2 ring-primary bg-primary/5' : 'ring-1 ring-border/20 bg-muted/10'
                   }`}
                   data-testid={`button-theme-${t.key}`}
                 >
                   <div className="flex gap-0.5">
                     {t.colors.map((c, i) => (
                       <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                     ))}
                   </div>
                   <span className={`text-[8px] font-bold uppercase tracking-wider ${colorTheme === t.key ? 'text-primary' : 'text-muted-foreground'}`}>{t.label}</span>
                 </button>
               ))}
             </div>
           </Card>
        </div>
      </section>
      </div>

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