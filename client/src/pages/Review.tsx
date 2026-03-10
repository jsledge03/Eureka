import { useState, useMemo, useCallback } from "react";
import { 
  Compass, Plus, Target,
  ArrowRight, TrendingUp,
  History, Copy, Check, ChevronDown, ChevronUp, Sparkles, X,
  Layers, Activity, Leaf,
  Gauge, Brain, AlertTriangle, BookOpen, Settings2, Eye, EyeOff, GripVertical
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useStore, Domain, DEFAULT_REVIEW_SECTIONS, type SectionConfig } from "@/store/useStore";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ScoringInfoButton } from "@/components/ScoringTooltip";
import { Switch as UISwitch } from "@/components/ui/switch";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getSeasonDefaults } from "@/lib/seasonEngine";
import { generateProofEvent } from "@/lib/proofEngine";
import { computeWeeklyForecast } from "@/lib/forecastEngine";
import { computeCommitmentBudget, computeCommitmentUsage, isOverloaded } from "@/lib/commitmentEngine";
import { computeCognitiveLoad } from "@/lib/cognitiveLoadEngine";
import { computeBurnoutRisk } from "@/lib/burnoutEngine";
import { generateWeeklyNarrative } from "@/lib/narrativeEngine";
import { computeDriftAlerts } from "@/lib/driftEngine";

function parseThemes(theme: string): string[] {
  if (!theme) return [];
  try {
    const parsed = JSON.parse(theme);
    if (Array.isArray(parsed)) return parsed.slice(0, 3);
  } catch {}
  return theme ? [theme] : [];
}

function serializeThemes(themes: string[], keepEmpty = false): string {
  const sliced = themes.slice(0, 3);
  if (!keepEmpty) {
    const filtered = sliced.filter(t => t.trim());
    if (filtered.length === 0) return "";
    return JSON.stringify(filtered);
  }
  if (sliced.length === 0) return "";
  return JSON.stringify(sliced);
}

export default function Review() {
  const { 
    quarterPlans, updateQuarterPlan, setCurrentQuarter, currentQuarterKey, 
    goals, tasks, habits, updateHabit, updateGoal, addQuarterPlan, cloneQuarter,
    graceDaysUsedThisWeek, graceDaysPerWeek, updateTask, deleteQuarterPlan, addTask, addWeeklyCheckIn,
    identities, addProofEvent, getActiveIdentity, getActiveIdentities, seasonMode, setSeasonMode,
    logs, dailyRhythms, frictionEvents, weeklyCheckIns,
    systemUpgrades, updateSystemUpgrade, setGraceConfig,
    notificationSettings, proofEvents, commitmentBudgetBase, strategicIntent, setStrategicIntent,
    reviewSections, toggleSectionVisibility, moveSection,
    getAllDomains
  } = useStore();
  const allDomains = getAllDomains();
  const [, setLocation] = useLocation();
  const todayDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  
  const [isReviewLayoutOpen, setIsReviewLayoutOpen] = useState(false);
  const [isIntentBuilderOpen, setIsIntentBuilderOpen] = useState(false);
  const [intentDraft, setIntentDraft] = useState(strategicIntent || '');
  const [intentStep, setIntentStep] = useState(0);
  const [intentOptimizing, setIntentOptimizing] = useState<string[]>([]);
  const [intentTradeoff, setIntentTradeoff] = useState('');
  const [intentProtecting, setIntentProtecting] = useState('');
  const orderedReviewSections = useMemo(() => {
    if (reviewSections.length === 0) return DEFAULT_REVIEW_SECTIONS;
    const missing = DEFAULT_REVIEW_SECTIONS.filter(d => !reviewSections.some(s => s.id === d.id));
    return missing.length > 0 ? [...reviewSections, ...missing] : reviewSections;
  }, [reviewSections]);
  const isReviewSectionVisible = useCallback((id: string) => {
    const s = orderedReviewSections.find(s => s.id === id);
    return s ? s.visible : true;
  }, [orderedReviewSections]);
  const reviewSectionOrder = useCallback((id: string) => {
    const idx = orderedReviewSections.findIndex(s => s.id === id);
    return idx >= 0 ? idx : 99;
  }, [orderedReviewSections]);
  const REVIEW_SECTION_LABELS: Record<string, string> = {
    'goals': 'Goal Roll-up',
    'system-load': 'System Load',
    'domain-allocation': 'Domain Allocation',
    'weekly-memo': 'Weekly Memo',
  };

  const currentPlan = quarterPlans.find(p => `${p.year}-Q${p.quarter}` === currentQuarterKey) || quarterPlans[0];
  const planThemesStr = useMemo(() => {
    if (!currentPlan?.theme) return '';
    try { const p = JSON.parse(currentPlan.theme); if (Array.isArray(p)) return p.filter(Boolean).join(', '); } catch {}
    return currentPlan.theme || '';
  }, [currentPlan?.theme]);
  const combinedIntent = useMemo(() => {
    const parts = [planThemesStr ? `Themes: ${planThemesStr}` : '', strategicIntent].filter(Boolean);
    return parts.join('. ');
  }, [planThemesStr, strategicIntent]);
  const forecast = useMemo(() => computeWeeklyForecast({
    logs, dailyRhythms, frictionEvents, weeklyCheckIns, habits, tasks, goals, identities, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek,
    strategicIntent: combinedIntent,
  }), [logs, dailyRhythms, frictionEvents, weeklyCheckIns, habits, tasks, goals, identities, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek, combinedIntent]);

  const commitmentBudget = useMemo(() => computeCommitmentBudget(seasonMode, dailyRhythms, commitmentBudgetBase), [seasonMode, dailyRhythms, commitmentBudgetBase]);
  const commitmentUsage = useMemo(() => computeCommitmentUsage(goals, habits, tasks, frictionEvents), [goals, habits, tasks, frictionEvents]);
  const overloaded = isOverloaded(commitmentUsage.totalUsed, commitmentBudget.totalBudget);

  const driftAlerts = useMemo(() => computeDriftAlerts({ identities, goals, habits, tasks, logs, dailyRhythms }, seasonMode), [identities, goals, habits, tasks, logs, dailyRhythms, seasonMode]);

  const cognitiveLoad = useMemo(() => computeCognitiveLoad({
    goals, habits, tasks, frictionEvents,
    driftAlertCount: driftAlerts.length,
    notificationSettings,
  }), [goals, habits, tasks, frictionEvents, driftAlerts, notificationSettings]);

  const burnoutRisk = useMemo(() => computeBurnoutRisk({
    logs, dailyRhythms, frictionEvents, weeklyCheckIns, tasks, habits, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek,
  }), [logs, dailyRhythms, frictionEvents, weeklyCheckIns, tasks, habits, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek]);

  const narrative = useMemo(() => generateWeeklyNarrative({
    identities, goals, habits, tasks, logs, dailyRhythms, frictionEvents, proofEvents, driftAlerts, weeklyCheckIns, seasonMode,
    strategicIntent: combinedIntent, allDomains,
  }), [identities, goals, habits, tasks, logs, dailyRhythms, frictionEvents, proofEvents, driftAlerts, weeklyCheckIns, seasonMode, combinedIntent, allDomains]);


  const [resetStep, setResetStep] = useState(0);
  const [isQuarterPickerOpen, setIsQuarterPickerOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Sunday Reset State
  const [resetData, setResetData] = useState({
    focusDomains: [] as Domain[],
    outcomes: ["", "", ""],
  });

  // Weekly Check-in State
  const [checkInData, setCheckInData] = useState({
    energy: 'Sustain' as 'Push' | 'Sustain' | 'Recover',
    mood: '',
    capacity: 5,
    worked: '',
    slipped: '',
    adjustment: ''
  });

  const handleQuarterChange = (year: number, quarter: number) => {
    const key = `${year}-Q${quarter}`;
    if (!quarterPlans.find(p => `${p.year}-Q${p.quarter}` === key)) {
      addQuarterPlan({ year, quarter, theme: "New Focus", constraints: [], notToDo: [], outcomes: [], focusDomains: [] });
    }
    setCurrentQuarter(key);
    setIsQuarterPickerOpen(false);
    hapticLight();
    toast.success(`Switched to ${key}`);
  };

  const calculateAutoProgress = (goalId: string) => {
    const linkedTasks = tasks.filter(t => t.goalId === goalId);
    const linkedHabits = habits.filter(h => h.goalId === goalId);
    
    if (linkedTasks.length === 0 && linkedHabits.length === 0) return 0;
    
    const taskCompletion = linkedTasks.length > 0 
      ? (linkedTasks.filter(t => t.completed).length / linkedTasks.length) * 100 
      : 0;
      
    const last28 = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return d.toLocaleDateString('en-CA');
    });
    const habitCompletionDays = linkedHabits.reduce((count, h) => {
      const completed = logs.filter(l => l.refId === h.id && l.type === 'habit' && last28.includes(l.date) && (l.status === 'completed' || l.status === 'micro')).length;
      return count + completed;
    }, 0);
    const totalPossible = linkedHabits.length * 28;
    const habitCompletion = totalPossible > 0 ? (habitCompletionDays / totalPossible) * 100 : 0;
    
    const components = (linkedTasks.length > 0 ? 1 : 0) + (linkedHabits.length > 0 ? 1 : 0);
    return Math.round((taskCompletion + habitCompletion) / components);
  };

  const handleResetFinish = () => {
    if (currentPlan) {
      updateQuarterPlan(currentPlan.id, { 
        focusDomains: resetData.focusDomains,
        outcomes: resetData.outcomes.filter(o => o.trim() !== "")
      });
    }
    
    // Create tasks for outcomes
    resetData.outcomes.forEach(outcome => {
      if (outcome.trim()) {
        addTask({ 
          title: `Outcome: ${outcome}`, 
          energy: 'High', 
          emotion: 'Focused', 
          completed: false, 
          dueDate: new Date().toLocaleDateString('en-CA'), 
          priority: 'High', 
          label: 'Planning', 
          labels: ['Planning'],
          domain: resetData.focusDomains[0] || null, 
          habitId: null, 
          goalId: null 
        });
      }
    });

    const storeSlice = { identities, getActiveIdentity, getActiveIdentities };
    const proofEvent = generateProofEvent('sunday-reset', {}, storeSlice);
    addProofEvent(proofEvent);
    setResetStep(0);
    setLocation("/");
    hapticSuccess();
    toast.success("Reset applied. Let's win the week.");
  };

  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  const smartSuggestions = useMemo(() => {
    const res: Array<{id: string, title: string, why: string, domain: Domain | null}> = [];
    const activeHabits = habits.filter(h => !h.isPaused);
    
    // Domain-based suggestions
    resetData.focusDomains.forEach(domain => {
      const domainHabits = activeHabits.filter(h => h.domain === domain);
      domainHabits.forEach(h => {
        res.push({
          id: `suggest-prep-${h.id}`,
          title: `Prep for ${h.title}`,
          why: `Supports your ${h.domain} habit: ${h.title}`,
          domain: h.domain
        });
      });
    });

    // Keystone habits focus
    activeHabits.filter(h => h.isKeystone).forEach(h => {
      res.push({
        id: `suggest-keystone-${h.id}`,
        title: `Audit ${h.title} environment`,
        why: "Keystone habit needs optimized environment",
        domain: h.domain
      });
    });

    return res.filter(s => !acceptedSuggestions.has(s.id)).slice(0, 5);
  }, [resetData.focusDomains, habits, acceptedSuggestions]);

  const acceptSuggestion = (s: {id: string, title: string, why: string, domain: Domain | null}) => {
    addTask({
      title: s.title,
      energy: 'Medium',
      emotion: 'Prepared',
      completed: false,
      dueDate: todayDate,
      priority: 'Medium',
      label: 'Planning',
      labels: ['Planning'],
      domain: s.domain,
      habitId: null,
      goalId: null
    });
    setAcceptedSuggestions(prev => { const n = new Set(Array.from(prev)); n.add(s.id); return n; });
    toast.success("Suggestion accepted");
  };

  const handleCheckInFinish = () => {
    addWeeklyCheckIn({
      ...checkInData,
      date: new Date().toLocaleDateString('en-CA')
    });
    setIsCheckInOpen(false);
    toast.success("Check-in complete. Momentum tracked.");
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <header className="pt-6 pb-1 flex justify-between items-start">
        <div>
          <button onClick={() => setIsQuarterPickerOpen(true)} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" data-testid="button-quarter-picker">
            <span className="text-[10px] font-bold uppercase tracking-widest">{currentQuarterKey}</span>
            <ChevronDown size={12} className="opacity-40" />
          </button>
          <h1 className="text-3xl font-serif text-primary mt-1">Review</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsCheckInOpen(true)}
            className="h-10 min-h-[44px] rounded-full border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase px-4"
            data-testid="button-checkin"
          >
            Check-in
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-full bg-muted/30 text-muted-foreground"
            onClick={() => { setIsReviewLayoutOpen(true); hapticLight(); }}
            data-testid="button-review-layout-settings"
          >
            <Settings2 size={18} />
          </Button>
        </div>
      </header>

      <Sheet open={isReviewLayoutOpen} onOpenChange={setIsReviewLayoutOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Settings2 size={18} className="text-primary" /> Section Layout
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Show, hide, or reorder Strategic Plan sections.
          </p>
          <div className="space-y-1.5">
            {orderedReviewSections.map((section, idx) => (
              <div
                key={section.id}
                className={`flex items-center gap-2 p-3 rounded-xl ring-1 transition-all ${
                  section.visible ? 'ring-border/20 bg-card' : 'ring-border/10 bg-muted/30 opacity-60'
                }`}
                data-testid={`review-layout-section-${section.id}`}
              >
                <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">
                  {REVIEW_SECTION_LABELS[section.id] || section.id}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === 0}
                    onClick={() => { moveSection('review', section.id, 'up'); hapticLight(); }}
                    data-testid={`button-review-move-up-${section.id}`}
                  >
                    <ChevronUp size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === orderedReviewSections.length - 1}
                    onClick={() => { moveSection('review', section.id, 'down'); hapticLight(); }}
                    data-testid={`button-review-move-down-${section.id}`}
                  >
                    <ChevronDown size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => { toggleSectionVisibility('review', section.id); hapticLight(); }}
                    data-testid={`button-review-toggle-${section.id}`}
                  >
                    {section.visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full h-11 rounded-2xl mt-4 text-xs font-bold"
            onClick={() => setIsReviewLayoutOpen(false)} data-testid="button-close-review-layout"
          >
            Done
          </Button>
        </SheetContent>
      </Sheet>

      <Dialog open={isQuarterPickerOpen} onOpenChange={setIsQuarterPickerOpen}>
        <DialogContent className="h-[80vh] flex flex-col" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="font-serif text-xl">Select Quarter</DialogTitle></DialogHeader>
          <div className="py-6 space-y-8 flex-1 overflow-y-auto no-scrollbar">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Quarter Grid</label>
              <div className="space-y-3">
                 <Select value={String(currentPlan?.year || new Date().getFullYear())} onValueChange={v => handleQuarterChange(parseInt(v), currentPlan?.quarter || Math.floor(new Date().getMonth() / 3) + 1)}>
                  <SelectTrigger className="rounded-2xl h-12 bg-muted/30 border-none" data-testid="select-quarter-year"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(q => (
                    <Button 
                      key={q} 
                      variant={currentQuarterKey.endsWith(`Q${q}`) ? "default" : "outline"} 
                      className="h-16 rounded-2xl font-bold text-lg" 
                      onClick={() => handleQuarterChange(currentPlan?.year || new Date().getFullYear(), q)}
                      data-testid={`button-quarter-q${q}`}
                    >Q{q}</Button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Quarter History</h4>
              <div className="space-y-2">
                {quarterPlans.map(p => (
                  <div key={p.id} className="p-5 bg-muted/20 flex items-center justify-between rounded-2xl group active:scale-[0.98] transition-transform">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{p.year} Q{p.quarter}</span>
                      <span className="text-[10px] font-medium opacity-40 uppercase tracking-widest">{parseThemes(p.theme).join(' · ') || "No theme"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary" onClick={() => handleQuarterChange(p.year, p.quarter)}>Jump to</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/40" onClick={() => { const now = new Date(); cloneQuarter(p.id, now.getFullYear(), Math.floor(now.getMonth() / 3) + 1); toast.success(`Cloned to ${now.getFullYear()} Q${Math.floor(now.getMonth() / 3) + 1}`); }}><Copy size={14}/></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="font-serif text-xl">Weekly Check-in</DialogTitle></DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Energy Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {['Push', 'Sustain', 'Recover'].map(m => (
                  <Button 
                    key={m} 
                    variant={checkInData.energy === m ? 'default' : 'outline'}
                    className="rounded-xl h-12 text-[10px] font-bold uppercase"
                    onClick={() => setCheckInData({...checkInData, energy: m as any})}
                    data-testid={`button-energy-${m.toLowerCase()}`}
                  >{m}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stress (1-5)</label>
              <Input type="range" min="1" max="5" value={checkInData.capacity} onChange={e => setCheckInData({...checkInData, capacity: parseInt(e.target.value)})} className="h-2 bg-muted rounded-full appearance-none cursor-pointer" data-testid="input-stress-level" />
              <div className="flex justify-between text-[10px] font-bold opacity-40 uppercase"><span>Low</span><span>{checkInData.capacity}</span><span>High</span></div>
            </div>
            <div className="space-y-4">
              <Input placeholder="What worked?" value={checkInData.worked} onChange={e => setCheckInData({...checkInData, worked: e.target.value})} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-checkin-worked" />
              <Input placeholder="What slipped?" value={checkInData.slipped} onChange={e => setCheckInData({...checkInData, slipped: e.target.value})} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-checkin-slipped" />
              <Input placeholder="One change for next week?" value={checkInData.adjustment} onChange={e => setCheckInData({...checkInData, adjustment: e.target.value})} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-checkin-adjustment" />
            </div>
            <Button onClick={handleCheckInFinish} className="w-full h-14 rounded-2xl font-bold shadow-lg" data-testid="button-complete-checkin">Complete Check-in</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="reset" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-12 bg-muted/50 rounded-2xl p-1 gap-1">
          <TabsTrigger value="reset" className="rounded-xl text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-card shadow-none" data-testid="tab-sunday-reset">Sunday Reset</TabsTrigger>
          <TabsTrigger value="quarter" className="rounded-xl text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-card shadow-none" data-testid="tab-strategic-plan">Strategic Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="reset" className="mt-8 outline-none px-1">
          {resetStep === 0 ? (
            <Card className="bg-secondary/[0.03] border-none shadow-none p-10 text-center rounded-[2.5rem] ring-1 ring-secondary/10">
              <div className="w-16 h-16 bg-secondary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                <Compass size={32} className="text-secondary opacity-60" />
              </div>
              <h3 className="text-2xl font-serif mb-3 text-secondary-foreground">Weekly Recalibration</h3>
              <p className="text-xs text-muted-foreground mb-10 leading-relaxed max-w-[220px] mx-auto font-medium opacity-70">Reflect on last week and set intentions for what's next.</p>
              <Button onClick={() => setResetStep(1)} className="w-full h-14 bg-secondary text-secondary-foreground rounded-2xl shadow-xl font-bold text-sm tracking-wide active:scale-95 transition-transform" data-testid="button-launch-reset">Launch Reset Flow</Button>
            </Card>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center border-b border-border/50 pb-5">
                <div>
                  <h3 className="font-serif text-2xl text-primary leading-none">Step {resetStep} <span className="text-xs font-sans text-muted-foreground opacity-50 ml-2">/ 4</span></h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">
                    {resetStep === 1 ? 'Last Week Recap' : resetStep === 2 ? 'Next Week Focus' : resetStep === 3 ? 'System Optimization' : 'Seed Action List'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setResetStep(0)} className="rounded-full h-10 w-10 text-muted-foreground/40 hover:text-primary"><X size={24}/></Button>
              </div>

              <div className="min-h-[300px]">
                {resetStep === 1 && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="p-4 bg-secondary/[0.03] rounded-2xl ring-1 ring-secondary/10 flex items-center gap-3 mb-2" data-testid="card-season-review">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                        <Leaf size={18} className="text-secondary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Season</p>
                        <p className="text-sm font-bold text-foreground">{seasonMode}</p>
                        <p className="text-[10px] text-muted-foreground/70 line-clamp-1">{getSeasonDefaults(seasonMode).description}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl ring-1 ring-border/20 mb-2" data-testid="card-forecast-review">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-blue-500" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weekly Forecast</span>
                        </div>
                        <Badge
                          className={`text-[8px] font-bold uppercase px-2 py-0.5 border-none ${
                            forecast.outlook === 'Stable'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : forecast.outlook === 'Risk of overload'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                          data-testid="badge-forecast-review"
                        >
                          {forecast.outlook}
                        </Badge>
                      </div>
                      {forecast.signals.slice(0, 2).map((signal, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                          <span className={
                            signal.direction === 'positive' ? 'text-emerald-500' : signal.direction === 'negative' ? 'text-destructive' : 'text-muted-foreground/40'
                          }>
                            {signal.direction === 'positive' ? '▲' : signal.direction === 'negative' ? '▼' : '●'}
                          </span>
                          <span>{signal.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-primary/[0.03] rounded-3xl ring-1 ring-primary/10">
                        <div className="text-3xl font-serif text-primary">{tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5 opacity-60 flex items-center justify-center gap-1">Rhythm Score <ScoringInfoButton type="rhythm-score" size={11} /></div>
                      </div>
                      <div className="p-6 bg-secondary/[0.03] rounded-3xl ring-1 ring-secondary/10">
                        <div className="text-3xl font-serif text-secondary">{graceDaysUsedThisWeek}</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5 opacity-60">Grace Applied</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Domain Distribution</h4>
                      <div className="flex flex-wrap gap-2">
                        {allDomains.map(d => <Badge key={d} variant="outline" className="text-[9px] h-5 px-2 border-muted-foreground/20 font-bold uppercase tracking-tighter">{d}</Badge>)}
                      </div>
                    </div>
                    <Button onClick={() => setResetStep(2)} className="w-full h-14 rounded-2xl font-bold shadow-lg mt-10">Continue Review <ArrowRight size={18} className="ml-2"/></Button>
                  </div>
                )}

                {resetStep === 2 && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Focus Domains</label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {allDomains.map(d => (
                            <Button 
                              key={d} 
                              variant={resetData.focusDomains.includes(d) ? "default" : "outline"} 
                              className="text-[11px] h-12 rounded-2xl font-bold uppercase tracking-tight" 
                              onClick={() => {
                                if (resetData.focusDomains.includes(d)) {
                                  setResetData({...resetData, focusDomains: resetData.focusDomains.filter(fd => fd !== d)});
                                  hapticLight();
                                } else if (resetData.focusDomains.length < 3) {
                                  setResetData({...resetData, focusDomains: [...resetData.focusDomains, d]});
                                  hapticLight();
                                } else {
                                  toast.error("Maximum 3 focus domains allowed. Please remove one first.");
                                }
                              }}
                            >{d}</Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Weekly Outcomes</label>
                        {resetData.outcomes.map((o, i) => (
                          <Input key={i} placeholder={`Outcome #${i+1}`} value={o} onChange={e => {
                            const newOutcomes = [...resetData.outcomes];
                            newOutcomes[i] = e.target.value;
                            setResetData({...resetData, outcomes: newOutcomes});
                          }} className="h-12 bg-muted/30 border-none rounded-xl" />
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => setResetStep(3)} className="w-full h-14 rounded-2xl font-bold shadow-lg mt-6" disabled={resetData.focusDomains.length === 0}>Next Step</Button>
                  </div>
                )}

                {resetStep === 3 && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <p className="text-sm font-medium text-muted-foreground px-1 leading-relaxed">System recalibration for <span className="text-primary font-bold">{resetData.focusDomains.join(", ")}</span> focus:</p>
                    <div className="space-y-3">
                      {habits.filter(h => !h.isPaused).map(h => (
                        <Card key={h.id} className="p-5 border-none bg-card shadow-sm rounded-3xl flex flex-col gap-3 ring-1 ring-border/30">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="text-sm font-bold truncate">{h.title}</div>
                              <div className="text-[10px] font-bold text-primary uppercase mt-1 opacity-60 italic">Plan B: {h.fallback}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className={`h-8 rounded-full text-[9px] font-bold uppercase ${h.isMicro ? 'bg-primary text-primary-foreground border-primary' : ''}`} onClick={() => updateHabit(h.id, { isMicro: !h.isMicro })}>Minimum</Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <Button onClick={() => setResetStep(4)} className="w-full h-14 rounded-2xl font-bold shadow-lg">Final Step</Button>
                  </div>
                )}

                {resetStep === 4 && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Smart Suggestions</h4>
                        {smartSuggestions.length > 0 && (
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-[10px] font-bold uppercase text-primary"
                            onClick={() => {
                              smartSuggestions.forEach(s => acceptSuggestion(s));
                              hapticSuccess();
                              toast.success(`Accepted ${smartSuggestions.length} suggestions`);
                            }}
                          >
                            Accept All
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {smartSuggestions.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic text-center py-4">No more suggestions for now.</p>
                        ) : (
                          smartSuggestions.map(s => (
                            <Card key={s.id} className="p-3 border-none bg-card shadow-sm rounded-xl ring-1 ring-border/30 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold truncate">{s.title}</p>
                                <p className="text-[9px] text-muted-foreground truncate">{s.why}</p>
                              </div>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0" onClick={() => acceptSuggestion(s)}>
                                <Plus size={14} />
                              </Button>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>

                    <Card className="p-8 border-none bg-primary/[0.03] rounded-[2.5rem] text-center ring-1 ring-primary/10 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 opacity-50" />
                      <Sparkles size={32} className="mx-auto mb-4 text-primary opacity-40" />
                      <h4 className="text-lg font-serif text-primary mb-2">Finalize Week</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto font-medium opacity-70">
                        Applying your focus domains and outcomes will create focus-tasks and recalibrate your rhythm.
                      </p>
                    </Card>
                    <Button 
                      onClick={handleResetFinish} 
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold shadow-2xl tracking-wide"
                    >Apply Reset & Win Week</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quarter" className="mt-8 flex flex-col gap-10 outline-none px-1 animate-in slide-in-from-left-4 duration-500">
          <section className="space-y-4" data-testid="section-strategic-themes">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-3 ml-1 opacity-60">
              <Compass size={14} className="text-primary opacity-50" /> Strategic Themes
            </h2>
            {(() => {
              const ensurePlanWithTheme = (themeValue: string) => {
                const now = new Date();
                const year = now.getFullYear();
                const quarter = Math.floor(now.getMonth() / 3) + 1;
                const key = `${year}-Q${quarter}`;
                const existing = quarterPlans.find(p => `${p.year}-Q${p.quarter}` === key);
                if (existing) {
                  updateQuarterPlan(existing.id, { theme: themeValue });
                  setCurrentQuarter(key);
                  return;
                }
                addQuarterPlan({ year, quarter, theme: themeValue, constraints: [], notToDo: [], outcomes: [], focusDomains: [] });
                setCurrentQuarter(key);
              };
              const themes = parseThemes(currentPlan?.theme || '');
              return (
                <div className="space-y-2.5">
                  {themes.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-muted-foreground/40 w-4 text-right shrink-0">{i + 1}</span>
                      <Input
                        value={t}
                        onChange={e => {
                          const updated = [...themes];
                          updated[i] = e.target.value;
                          const newTheme = serializeThemes(updated, true);
                          if (currentPlan) {
                            updateQuarterPlan(currentPlan.id, { theme: newTheme });
                          } else {
                            ensurePlanWithTheme(newTheme);
                          }
                        }}
                        onBlur={() => {
                          if (!currentPlan) return;
                          const trimmed = themes.filter(v => v.trim());
                          if (trimmed.length !== themes.length) {
                            updateQuarterPlan(currentPlan.id, { theme: serializeThemes(trimmed) });
                          }
                        }}
                        className="h-12 bg-card border-none shadow-sm rounded-2xl font-serif text-base text-primary placeholder:opacity-20 ring-1 ring-border/20 focus-visible:ring-primary/20 px-4"
                        placeholder="e.g. Quiet Consistency"
                        data-testid={`input-theme-${i}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive shrink-0"
                        onClick={() => {
                          if (!currentPlan) return;
                          const updated = themes.filter((_, j) => j !== i);
                          updateQuarterPlan(currentPlan.id, { theme: serializeThemes(updated) });
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  {themes.length < 3 && (
                    <Button
                      variant="ghost"
                      className="w-full h-11 rounded-2xl border border-dashed border-border/40 text-muted-foreground/50 text-xs font-medium hover:border-primary/30 hover:text-primary/60"
                      onClick={() => {
                        const newTheme = serializeThemes([...themes, ''], true);
                        if (currentPlan) {
                          updateQuarterPlan(currentPlan.id, { theme: newTheme });
                        } else {
                          ensurePlanWithTheme(newTheme);
                        }
                      }}
                      data-testid="button-add-theme"
                    >
                      <Plus size={14} className="mr-1.5" /> Add Theme {themes.length > 0 && `(${themes.length}/3)`}
                    </Button>
                  )}
                  {themes.length >= 3 && (
                    <p className="text-[9px] text-muted-foreground/40 text-center font-medium">3 themes max</p>
                  )}
                </div>
              );
            })()}
          </section>

          <section className="space-y-4" data-testid="section-strategic-intent">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-3 ml-1 opacity-60">
              <Target size={14} className="text-primary opacity-50" /> Strategic Intent
            </h2>
            <Card className="bg-primary/[0.03] border-none shadow-none rounded-[2rem] p-5 ring-1 ring-primary/10 overflow-hidden relative" data-testid="card-strategic-intent">
              <div className="absolute top-0 right-0 p-4 opacity-[0.06]"><Compass size={64}/></div>
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase text-primary tracking-widest opacity-60">Leadership Stance</p>
                  <button
                    onClick={() => { setIsIntentBuilderOpen(true); setIntentDraft(strategicIntent || ''); setIntentStep(0); setIntentOptimizing([]); setIntentTradeoff(''); setIntentProtecting(''); }}
                    className="text-[9px] font-bold uppercase text-primary/60 tracking-widest hover:text-primary transition-colors"
                    data-testid="button-edit-intent"
                  >
                    {strategicIntent ? 'Edit' : 'Define'}
                  </button>
                </div>
                {strategicIntent ? (
                  <p className="text-sm font-serif text-foreground leading-relaxed">{strategicIntent}</p>
                ) : (
                  <button
                    onClick={() => { setIsIntentBuilderOpen(true); setIntentStep(1); }}
                    className="w-full text-left p-3 rounded-xl bg-primary/5 ring-1 ring-primary/10 active:scale-[0.98] transition-all"
                    data-testid="button-define-intent"
                  >
                    <p className="text-xs font-bold text-primary/70">Define your leadership stance</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">What are you optimizing for? What are you protecting? What are you letting go of?</p>
                  </button>
                )}
              </div>
            </Card>
          </section>

          <Sheet open={isIntentBuilderOpen} onOpenChange={setIsIntentBuilderOpen}>
            <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
              <SheetHeader className="pb-4">
                <SheetTitle className="font-serif text-xl text-primary">Strategic Intent</SheetTitle>
              </SheetHeader>
              <div className="space-y-6">
                {intentStep === 0 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground">What are you optimizing for in this season?</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">One or two sentences is enough. Clarity over complexity.</p>
                    </div>
                    <textarea
                      value={intentDraft}
                      onChange={(e) => setIntentDraft(e.target.value)}
                      placeholder="Right now, I am prioritizing stability and energy recovery over aggressive expansion. I will protect sleep, fitness, and deep work consistency."
                      className="w-full min-h-[100px] p-4 rounded-2xl bg-muted/30 border-none text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 placeholder:text-xs"
                      data-testid="textarea-intent"
                    />
                    <p className="text-[10px] text-muted-foreground/50 leading-relaxed italic">
                      Try: "Right now, I am prioritizing ___ over ___." or "I am protecting ___ and intentionally letting go of ___."
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIntentStep(1)}
                        className="flex-1 h-12 rounded-2xl text-[10px] font-bold uppercase"
                        data-testid="button-intent-guided"
                      >
                        Guided Builder
                      </Button>
                      <Button
                        onClick={() => {
                          setStrategicIntent(intentDraft.trim());
                          toast.success('Strategic Intent updated');
                          setIsIntentBuilderOpen(false);
                        }}
                        disabled={!intentDraft.trim()}
                        className="flex-1 h-12 rounded-2xl font-bold"
                        data-testid="button-save-intent"
                      >
                        Save Intent
                      </Button>
                    </div>
                  </div>
                )}

                {intentStep === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1">Step 1: Optimization Focus</p>
                      <p className="text-[10px] text-muted-foreground">What are you optimizing for? Select all that apply.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['Stability', 'Growth', 'Recovery', 'Expansion', 'Discipline', 'Repositioning', 'Financial strength', 'Health resilience', 'Relational depth', 'Spiritual grounding'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setIntentOptimizing(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                          className={`text-left p-3 rounded-xl text-[11px] font-bold transition-all active:scale-[0.97] ${
                            intentOptimizing.includes(opt) ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-muted/20 text-foreground/70 ring-1 ring-border/20'
                          }`}
                          data-testid={`button-intent-opt-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                        >{opt}</button>
                      ))}
                    </div>
                    <Button onClick={() => setIntentStep(2)} disabled={intentOptimizing.length === 0} className="w-full h-12 rounded-2xl font-bold" data-testid="button-intent-step1-next">Next</Button>
                  </div>
                )}

                {intentStep === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1">Step 2: Tradeoff Declaration</p>
                      <p className="text-[10px] text-muted-foreground">What are you intentionally deprioritizing this season?</p>
                    </div>
                    <textarea
                      value={intentTradeoff}
                      onChange={(e) => setIntentTradeoff(e.target.value)}
                      placeholder="e.g., Social commitments, new projects, aggressive timelines..."
                      className="w-full min-h-[80px] p-4 rounded-2xl bg-muted/30 border-none text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 placeholder:text-xs"
                      data-testid="textarea-intent-tradeoff"
                    />
                    <Button onClick={() => setIntentStep(3)} className="w-full h-12 rounded-2xl font-bold" data-testid="button-intent-step2-next">Next</Button>
                  </div>
                )}

                {intentStep === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div>
                      <p className="text-xs font-bold text-foreground mb-1">Step 3: Protection Statement</p>
                      <p className="text-[10px] text-muted-foreground">What must be protected at all costs, even under pressure?</p>
                    </div>
                    <textarea
                      value={intentProtecting}
                      onChange={(e) => setIntentProtecting(e.target.value)}
                      placeholder="e.g., Sleep quality, deep work blocks, family time..."
                      className="w-full min-h-[80px] p-4 rounded-2xl bg-muted/30 border-none text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 placeholder:text-xs"
                      data-testid="textarea-intent-protecting"
                    />
                    <div className="p-4 bg-primary/[0.03] rounded-2xl ring-1 ring-primary/10">
                      <p className="text-[9px] font-bold uppercase text-primary/60 tracking-widest mb-2">Generated Intent</p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {`I am prioritizing ${intentOptimizing.join(', ').toLowerCase()}${intentTradeoff ? ` over ${intentTradeoff.toLowerCase()}` : ''}. ${intentProtecting ? `I will protect ${intentProtecting.toLowerCase()}.` : ''}`}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        const generated = `I am prioritizing ${intentOptimizing.join(', ').toLowerCase()}${intentTradeoff ? ` over ${intentTradeoff.toLowerCase()}` : ''}. ${intentProtecting ? `I will protect ${intentProtecting.toLowerCase()}.` : ''}`.trim();
                        setStrategicIntent(generated);
                        toast.success('Strategic Intent defined');
                        setIsIntentBuilderOpen(false);
                        setIntentStep(0);
                      }}
                      className="w-full h-12 rounded-2xl font-bold"
                      data-testid="button-finalize-intent"
                    >
                      Set Intent
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <div style={{ order: reviewSectionOrder('goals'), ...(isReviewSectionVisible('goals') ? {} : { display: 'none' }) }}>
          <section className="space-y-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-3 ml-1 opacity-60">
              <TrendingUp size={14} className="text-primary opacity-50" /> Goal Roll-up
            </h2>
            <div className="space-y-4">
              {goals.length === 0 && <p className="text-xs text-center py-10 opacity-30 font-bold uppercase tracking-widest">No Strategic Goals Defined.</p>}
              {goals.map(goal => {
                const autoProgress = calculateAutoProgress(goal.id);
                return (
                  <Card key={goal.id} className="border-none bg-card shadow-sm rounded-[1.5rem] p-6 overflow-hidden active:scale-[0.99] transition-all ring-1 ring-border/20">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight text-foreground/80">{goal.title}</span>
                        <span className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase tracking-widest mt-1">Auto: {autoProgress}%</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-transparent text-[8px] font-bold uppercase p-0 h-auto opacity-40 border-none">Manual</Badge>
                          <UISwitch checked={goal.isManualProgress} onCheckedChange={c => updateGoal(goal.id, { isManualProgress: c })} />
                        </div>
                        {goal.isManualProgress && (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              value={goal.currentProgress} 
                              onChange={e => updateGoal(goal.id, { currentProgress: parseInt(e.target.value) || 0 })} 
                              className="w-14 h-8 text-[11px] font-bold text-center bg-muted/40 border-none rounded-xl p-0 focus-visible:ring-primary/20" 
                            />
                            <span className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">/ 100%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Progress value={goal.isManualProgress ? goal.currentProgress : autoProgress} className="h-1.5 rounded-full bg-muted/50" />
                  </Card>
                );
              })}
            </div>
          </section>
          </div>

          <div style={{ order: reviewSectionOrder('system-load'), ...(isReviewSectionVisible('system-load') ? {} : { display: 'none' }) }}>
          <section className="space-y-5" data-testid="section-system-load">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-3 ml-1 opacity-60">
              <Gauge size={14} className="text-primary opacity-50" /> System Load
            </h2>
            <Card className="border-none bg-card shadow-sm rounded-[1.5rem] p-5 ring-1 ring-border/20 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Commitment</span>
                    <ScoringInfoButton type="commitment-budget" size={11} />
                  </div>
                  <span className={`text-[10px] font-bold ${overloaded ? 'text-destructive' : 'text-emerald-600'}`} data-testid="text-commitment-ratio">
                    {commitmentUsage.totalUsed} / {commitmentBudget.totalBudget}
                  </span>
                </div>
                <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${overloaded ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${Math.min((commitmentUsage.totalUsed / Math.max(commitmentBudget.totalBudget, 1)) * 100, 100)}%` }}
                  />
                </div>
                {overloaded && (
                  <p className="text-[10px] text-destructive/80 font-medium">System load elevated — open Coach for actionable mitigations</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Brain size={12} className="text-muted-foreground opacity-60" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Load</span>
                  <ScoringInfoButton type="cognitive-load" size={11} />
                  <Badge
                    className={`text-[8px] font-bold uppercase px-2 py-0.5 border-none ${
                      cognitiveLoad.level === 'Low' ? 'bg-emerald-500/10 text-emerald-600'
                      : cognitiveLoad.level === 'Moderate' ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-destructive/10 text-destructive'
                    }`}
                    data-testid="badge-cognitive-load"
                  >
                    {cognitiveLoad.level}
                  </Badge>
                </div>
                {(burnoutRisk.risk === 'Watch' || burnoutRisk.risk === 'High') && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className={burnoutRisk.risk === 'High' ? 'text-destructive' : 'text-amber-500'} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Burnout</span>
                    <ScoringInfoButton type="burnout-risk" size={11} />
                    <Badge
                      className={`text-[8px] font-bold uppercase px-2 py-0.5 border-none ${
                        burnoutRisk.risk === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
                      }`}
                      data-testid="badge-burnout-risk"
                    >
                      {burnoutRisk.risk}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          </section>
          </div>

          <div style={{ order: reviewSectionOrder('domain-allocation'), ...(isReviewSectionVisible('domain-allocation') ? {} : { display: 'none' }) }}>
          <section className="space-y-5" data-testid="section-domain-allocation">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-3 ml-1 opacity-60">
              <Layers size={14} className="text-secondary opacity-50" /> Domain Allocation
            </h2>
            <Card className="border-none bg-card shadow-sm rounded-[1.5rem] p-5 ring-1 ring-border/20 space-y-4">
              {(() => {
                const domainCounts: Record<string, number> = {};
                const focusDomains = currentPlan?.focusDomains || [];
                allDomains.forEach(d => { domainCounts[d] = 0; });
                tasks.forEach(t => { if (t.domain) domainCounts[t.domain] = (domainCounts[t.domain] || 0) + 1; });
                habits.filter(h => !h.isPaused).forEach(h => { if (h.domain) domainCounts[h.domain] = (domainCounts[h.domain] || 0) + 2; });
                goals.filter(g => !g.isPaused).forEach(g => { if (g.domain) domainCounts[g.domain] = (domainCounts[g.domain] || 0) + 3; });
                const totalActivity = Object.values(domainCounts).reduce((a, b) => a + b, 0);
                const sortedDomains = allDomains.map(d => ({
                  domain: d,
                  count: domainCounts[d] || 0,
                  pct: totalActivity > 0 ? Math.round(((domainCounts[d] || 0) / totalActivity) * 100) : 0,
                  isFocus: focusDomains.includes(d),
                })).sort((a, b) => b.count - a.count);
                const underinvested = sortedDomains.find(d => d.isFocus && d.pct < 10);
                const overinvested = sortedDomains.find(d => !d.isFocus && d.pct > 30);
                return (
                  <>
                    <div className="space-y-2">
                      {sortedDomains.filter(d => d.count > 0 || d.isFocus).map(d => (
                        <div key={d.domain} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-foreground/70">{d.domain}</span>
                              {d.isFocus && <Badge className="text-[7px] bg-primary/10 text-primary border-none font-bold uppercase px-1.5">Focus</Badge>}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{d.pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${d.isFocus ? 'bg-primary' : 'bg-muted-foreground/30'}`} style={{ width: `${Math.max(d.pct, 2)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {totalActivity === 0 && (
                      <p className="text-[10px] text-muted-foreground/50 italic text-center py-2">Add domains to tasks, habits, and goals to see allocation.</p>
                    )}
                    {underinvested && (
                      <div className="p-3 bg-amber-500/[0.04] rounded-xl ring-1 ring-amber-500/10">
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                          <span className="font-bold">{underinvested.domain}</span> is a focus domain but only {underinvested.pct}% of your activity. Consider adding a habit or task.
                        </p>
                      </div>
                    )}
                    {overinvested && (
                      <div className="p-3 bg-blue-500/[0.04] rounded-xl ring-1 ring-blue-500/10">
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          <span className="font-bold">{overinvested.domain}</span> is {overinvested.pct}% of activity but not a focus domain. Intentional or drifting?
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </Card>
          </section>
          </div>

          <div style={{ order: reviewSectionOrder('weekly-memo'), ...(isReviewSectionVisible('weekly-memo') ? {} : { display: 'none' }) }}>
          <section className="space-y-5" data-testid="section-weekly-memo">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-3 ml-1 opacity-60">
              <BookOpen size={14} className="text-secondary opacity-50" /> Weekly Memo
            </h2>
            <Card className="border-none bg-card shadow-sm rounded-[1.5rem] p-5 ring-1 ring-border/20 space-y-4">
              {narrative.executiveSummary ? (
                <>
                  <p className="text-[11px] text-foreground/80 leading-relaxed" data-testid="text-review-memo-summary">
                    {narrative.executiveSummary}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {narrative.protected.length > 0 && (
                      <Badge className="text-[8px] font-bold uppercase px-2 py-0.5 border-none bg-emerald-500/10 text-emerald-600">
                        {narrative.protected.length} Protected
                      </Badge>
                    )}
                    {narrative.drifted.length > 0 && (
                      <Badge className="text-[8px] font-bold uppercase px-2 py-0.5 border-none bg-amber-500/10 text-amber-600">
                        {narrative.drifted.length} Drifted
                      </Badge>
                    )}
                    {narrative.operationalRisks.length > 0 && (
                      <Badge className="text-[8px] font-bold uppercase px-2 py-0.5 border-none bg-destructive/10 text-destructive">
                        {narrative.operationalRisks.length} Risk{narrative.operationalRisks.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 rounded-xl text-[10px] font-bold uppercase bg-primary/5 text-primary hover:bg-primary/10"
                    onClick={() => { setLocation('/coach'); toast.success('Opening full memo in Coach'); }}
                    data-testid="button-review-open-memo"
                  >
                    View Full Executive Memo in Coach
                  </Button>
                </>
              ) : (
                <p className="text-[10px] text-center opacity-40 font-bold uppercase py-4">Not enough data yet. Keep logging to generate your weekly memo.</p>
              )}
            </Card>
          </section>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}