import { useState, useMemo } from "react";
import { Plus, Target, Trash2, Edit2, Pause, Star, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Shield, Zap, BookOpen, Brain, Compass, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore, Goal, Identity as IdentityType, DEFAULT_DOMAINS, Domain } from "@/store/useStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { computeTodayAlignment, getWeeklyTrend, type AlignmentBreakdown } from "@/lib/alignmentEngine";
import { computeDriftAlerts, getOverallDriftLevel, type DriftAlert, type DriftAction } from "@/lib/driftEngine";
import { computeWeeklyEvidence, type EvidenceItem, type GapItem } from "@/lib/evidenceEngine";
import { ScoringInfoButton } from "@/components/ScoringTooltip";
import { computeCommitmentBudget, computeCommitmentUsage, isOverloaded, getOverloadSuggestions } from "@/lib/commitmentEngine";

export default function Identity() {
  const store = useStore();
  const { identities, goals, habits, tasks, logs, dailyRhythms, quarterPlans, currentQuarterKey, seasonMode, getAllDomains } = store;
  const { addIdentity, updateIdentity, deleteIdentity, setActiveIdentity, toggleIdentityActive, addGoal, updateGoal, deleteGoal, addTask, updateHabit } = store;
  const allDomains = getAllDomains();
  const [, setLocation] = useLocation();

  const activeIdentities = identities.filter(i => i.isActive);
  if (activeIdentities.length === 0 && identities.length > 0) activeIdentities.push(identities[0]);
  const storeSnapshot = useMemo(() => ({ identities, goals, habits, tasks, logs, dailyRhythms, quarterPlans, currentQuarterKey }), [identities, goals, habits, tasks, logs, dailyRhythms, quarterPlans, currentQuarterKey]);

  const todayAlignment = useMemo(() => computeTodayAlignment(storeSnapshot), [storeSnapshot]);
  const weeklyTrend = useMemo(() => getWeeklyTrend(storeSnapshot), [storeSnapshot]);
  const driftAlerts = useMemo(() => computeDriftAlerts(storeSnapshot, seasonMode), [storeSnapshot, seasonMode]);
  const evidence = useMemo(() => computeWeeklyEvidence(storeSnapshot), [storeSnapshot]);

  const [isIdentityFormOpen, setIsIdentityFormOpen] = useState(false);
  const [editingIdentityId, setEditingIdentityId] = useState<string | null>(null);
  const [identityForm, setIdentityForm] = useState({ statement: "", refuseStatement: "", futureSelf: "", values: "", characterCommitments: "", domainEmphasis: {} as Record<string, number> });

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const emptyGoalForm = { title: "", intention: "", domain: 'none' as Domain | 'none', identityId: 'none', isPaused: false, isManualProgress: false, currentProgress: 0, targetProgress: 100 };
  const [goalForm, setGoalForm] = useState(emptyGoalForm);

  const [isDeleteGoalOpen, setIsDeleteGoalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const [isDeleteIdentityOpen, setIsDeleteIdentityOpen] = useState(false);
  const [identityToDelete, setIdentityToDelete] = useState<string | null>(null);

  const [isDriftOpen, setIsDriftOpen] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [showFormAdvanced, setShowFormAdvanced] = useState(false);
  const [isIdentityListOpen, setIsIdentityListOpen] = useState(false);

  const toggleDomainExpanded = (id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openIdentityForm = (identity?: IdentityType) => {
    if (identity) {
      setEditingIdentityId(identity.id);
      setIdentityForm({
        statement: identity.statement,
        refuseStatement: identity.refuseStatement || "",
        futureSelf: identity.futureSelf || "",
        values: identity.values.join(", "),
        characterCommitments: identity.characterCommitments?.join("\n") || "",
        domainEmphasis: identity.domainEmphasis || {},
      });
    } else {
      setEditingIdentityId(null);
      setIdentityForm({ statement: "", refuseStatement: "", futureSelf: "", values: "", characterCommitments: "", domainEmphasis: {} });
    }
    setShowFormAdvanced(false);
    setIsIdentityFormOpen(true);
  };

  const saveIdentityForm = () => {
    if (!identityForm.statement.trim()) return;
    const data = {
      statement: identityForm.statement,
      futureSelf: identityForm.futureSelf,
      refuseStatement: identityForm.refuseStatement,
      values: identityForm.values.split(',').map(v => v.trim()).filter(Boolean),
      characterCommitments: identityForm.characterCommitments.split('\n').map(c => c.trim()).filter(Boolean),
      domainEmphasis: Object.keys(identityForm.domainEmphasis).length > 0 ? identityForm.domainEmphasis : null,
      isActive: editingIdentityId ? (identities.find(i => i.id === editingIdentityId)?.isActive || false) : true,
    };
    if (editingIdentityId) {
      updateIdentity(editingIdentityId, data);
      hapticLight();
      toast.success("Identity updated");
    } else {
      addIdentity(data);
      hapticSuccess();
      toast.success("Identity created — let's build from here.");
    }
    setIsIdentityFormOpen(false);
  };

  const confirmDeleteIdentity = (id: string) => {
    setIdentityToDelete(id);
    setIsDeleteIdentityOpen(true);
  };

  const executeDeleteIdentity = () => {
    if (!identityToDelete) return;
    const id = identityToDelete;
    const wasActive = identities.find(i => i.id === id)?.isActive;
    const remaining = identities.filter(i => i.id !== id);
    const remainingActive = remaining.filter(i => i.isActive);
    deleteIdentity(id);
    if (wasActive && remainingActive.length === 0 && remaining.length > 0) {
      setActiveIdentity(remaining[0].id);
    }
    setIsDeleteIdentityOpen(false);
    setIdentityToDelete(null);
    setIsIdentityFormOpen(false);
    setIsIdentityListOpen(false);
    hapticWarning();
    toast.success("Identity removed. Your goals have been unlinked.");
  };

  const startEditGoal = (g: Goal) => {
    setActiveGoalId(g.id);
    setGoalForm({ title: g.title, intention: g.intention, domain: g.domain || 'none', identityId: g.identityId || 'none', isPaused: g.isPaused, isManualProgress: g.isManualProgress, currentProgress: g.currentProgress, targetProgress: g.targetProgress });
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = () => {
    if (!goalForm.title.trim()) return;
    const data = { title: goalForm.title, intention: goalForm.intention, identityId: goalForm.identityId === 'none' ? null : goalForm.identityId, domain: goalForm.domain === 'none' ? null : goalForm.domain, isPaused: goalForm.isPaused, isManualProgress: goalForm.isManualProgress, currentProgress: goalForm.currentProgress, targetProgress: goalForm.targetProgress };
    if (activeGoalId) { updateGoal(activeGoalId, data); hapticLight(); toast.success("Goal updated"); }
    else { addGoal(data); hapticSuccess(); toast.success("Goal created"); }
    setIsGoalFormOpen(false); setActiveGoalId(null); setGoalForm(emptyGoalForm);
  };

  const handleDeleteGoal = (cascade: boolean) => {
    if (goalToDelete) { deleteGoal(goalToDelete, cascade); setIsDeleteGoalOpen(false); setGoalToDelete(null); hapticWarning(); toast.success(cascade ? "Goal and linked items deleted" : "Goal deleted — items unlinked"); }
  };

  const executeDriftAction = (action: DriftAction) => {
    switch (action.actionType) {
      case 'simplify-habit':
        if (action.targetId) {
          const habit = habits.find(h => h.id === action.targetId);
          if (habit) { updateHabit(habit.id, { fallback: habit.fallback || "Just show up for 2 minutes" }); hapticMedium(); toast.success("Minimum Version added"); }
        }
        break;
      case 'create-cleanup-task':
        addTask({ title: action.payload?.title || "Quick cleanup sprint", energy: action.payload?.energy || "Low", emotion: "", completed: false, habitId: null, goalId: null, domain: action.payload?.domain || null, dueDate: new Date().toLocaleDateString('en-CA'), priority: "High", label: "", labels: [] });
        hapticSuccess();
        toast.success("Cleanup task created");
        break;
      case 'reduce-goals':
        toast.info("Review your goals and pause the ones that aren't serving you right now.");
        break;
      case 'pause-goal':
        if (action.targetId) { updateGoal(action.targetId, { isPaused: true }); hapticMedium(); toast.success("Goal paused"); }
        break;
      case 'reschedule':
        if (action.targetId) {
          const h = habits.find(x => x.id === action.targetId);
          if (h) {
            updateHabit(h.id, { isMicro: true });
            toast.success(`"${h.title}" switched to Minimum Version`);
          }
        }
        break;
      case 'add-reminder':
        addTask({ title: action.payload?.title || "Set up environment cue", energy: "Low", emotion: "", completed: false, habitId: null, goalId: null, domain: null, dueDate: new Date().toLocaleDateString('en-CA'), priority: "Medium", label: "Coach", labels: ["Coach"] });
        toast.success("Reminder task created");
        break;
      case 'add-boundary':
        addTask({ title: action.payload?.title || "Define a boundary rule", energy: "Low", emotion: "", completed: false, habitId: null, goalId: null, domain: null, dueDate: new Date().toLocaleDateString('en-CA'), priority: "Medium", label: "Reflection", labels: ["Reflection"] });
        toast.success("Boundary task created");
        break;
    }
    setIsDriftOpen(false);
  };

  const executeGapAction = (gap: GapItem) => {
    switch (gap.fixAction.actionType) {
      case 'create-task':
        addTask({ title: gap.fixAction.payload?.title || "Quick action", energy: gap.fixAction.payload?.energy || "Low", emotion: "", completed: false, habitId: null, goalId: null, domain: gap.fixAction.payload?.domain || null, dueDate: new Date().toLocaleDateString('en-CA'), priority: "Medium", label: "", labels: [] });
        toast.success("Task created");
        break;
      case 'adjust-habit':
        if (gap.fixAction.payload?.habitId) { toast.info("Open the habit to make adjustments."); }
        break;
      case 'navigate':
        setLocation(gap.fixAction.payload?.route || '/today');
        break;
      case 'add-reflection':
        toast.info("Take a moment to close the loop tonight.");
        break;
    }
  };

  const commitmentBudget = useMemo(() => computeCommitmentBudget(seasonMode, dailyRhythms, store.commitmentBudgetBase), [seasonMode, dailyRhythms, store.commitmentBudgetBase]);
  const commitmentUsage = useMemo(() => computeCommitmentUsage(goals, habits, tasks, store.frictionEvents), [goals, habits, tasks, store.frictionEvents]);
  const budgetOverloaded = isOverloaded(commitmentUsage.totalUsed, commitmentBudget.totalBudget);
  const overloadSuggestions = useMemo(() => budgetOverloaded ? getOverloadSuggestions(habits, goals).slice(0, 2) : [], [budgetOverloaded, habits, goals]);

  const activeGoals = goals.filter(g => !g.isPaused);
  const pausedGoals = goals.filter(g => g.isPaused);
  const driftLevel = getOverallDriftLevel(driftAlerts);
  const identityToDeleteObj = identityToDelete ? identities.find(i => i.id === identityToDelete) : null;
  const linkedGoalCount = identityToDelete ? goals.filter(g => g.identityId === identityToDelete).length : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="pt-6 pb-1 flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground" data-testid="text-strategy-label">Identity</p>
          <h1 className="text-3xl font-serif text-primary mt-1" data-testid="text-page-title">Who I'm Becoming</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="ghost" size="icon" onClick={() => setIsIdentityListOpen(true)} className="text-muted-foreground rounded-full h-10 w-10 min-h-[44px] min-w-[44px]" data-testid="button-identity-list">
            <Compass size={18} />
          </Button>
          <Button onClick={() => { setGoalForm(emptyGoalForm); setActiveGoalId(null); setIsGoalFormOpen(true); }} size="icon" className="rounded-full h-11 w-11 min-h-[44px] min-w-[44px] bg-primary shadow-md" data-testid="button-add-goal">
            <Plus size={22} />
          </Button>
        </div>
      </header>

      {activeIdentities.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Active Identities</h2>
            <Badge className="bg-primary/10 text-primary border-none text-[8px]">{activeIdentities.length}</Badge>
          </div>
          {activeIdentities.map(identity => {
            const allValues = identity.values;
            const allCommitments = identity.characterCommitments || [];
            return (
            <Card key={identity.id} className="p-5 space-y-4 transition-all" data-testid={`card-active-identity-${identity.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <Star size={12} className="text-primary fill-primary" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Active</span>
              </div>
              <p className="text-lg font-serif text-foreground leading-snug" data-testid={`text-becoming-statement-${identity.id}`}>{identity.statement}</p>
              {identity.futureSelf && (
                <p className="text-xs text-muted-foreground" data-testid={`text-future-self-${identity.id}`}>Future self: {identity.futureSelf}</p>
              )}
              {identity.refuseStatement && (
                <p className="text-xs text-muted-foreground italic" data-testid={`text-refuse-statement-${identity.id}`}>I refuse to become: {identity.refuseStatement}</p>
              )}
              {allValues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Values</p>
                  <div className="flex flex-wrap gap-1.5" data-testid={`values-chips-${identity.id}`}>
                    {allValues.map(v => (
                      <Badge key={v} className="bg-primary/10 text-primary border-none text-[9px] font-bold uppercase px-2 py-1">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {allCommitments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Commitments</p>
                  <div className="space-y-1.5">
                    {allCommitments.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <Shield size={11} className="text-primary mt-0.5 shrink-0" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {identity.domainEmphasis && Object.values(identity.domainEmphasis).some(v => v > 0) && (
                <div className="space-y-1.5">
                  <button onClick={() => toggleDomainExpanded(identity.id)} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    {expandedDomains.has(identity.id) ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    Domain Emphasis
                  </button>
                  {expandedDomains.has(identity.id) && (
                    <div className="space-y-2 pt-1">
                      {allDomains.filter(d => (identity.domainEmphasis?.[d] || 0) > 0).map(d => (
                        <div key={d} className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground w-16 shrink-0">{d}</span>
                          <div className="flex-1 bg-muted/30 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-primary/40 rounded-full transition-all duration-500" style={{ width: `${((identity.domainEmphasis?.[d] || 0) / 3) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-4">{identity.domainEmphasis?.[d] || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => openIdentityForm(identity)} className="text-[10px] rounded-xl min-h-[44px] px-4" data-testid={`button-edit-identity-${identity.id}`}>
                  <Edit2 size={12} className="mr-1.5" /> Edit
                </Button>
              </div>
            </Card>
            );
          })}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDriftOpen(true)} className="text-[10px] flex-1 rounded-xl min-h-[44px]" data-testid="button-view-drift">
              <AlertTriangle size={12} className="mr-1.5" /> Drift {driftLevel !== 'Low' && <Badge className={cn("ml-1 text-[8px] py-0 px-1.5", driftLevel === 'High' ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600")}>{driftLevel}</Badge>}
            </Button>
          </div>
        </section>
      ) : (
        <Card className="p-8 text-center space-y-5" data-testid="card-no-identity">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target size={28} className="text-primary/50" />
          </div>
          <div className="space-y-2">
            <p className="font-serif text-xl text-foreground">Define who you're becoming</p>
            <p className="text-sm text-muted-foreground">Everything starts with identity. Your goals, habits, and daily actions flow from here.</p>
          </div>
          <Button onClick={() => openIdentityForm()} className="rounded-xl min-h-[48px] px-8" data-testid="button-create-first-identity">Create Your First Identity</Button>
        </Card>
      )}

      <section className="space-y-3" data-testid="section-evidence">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Evidence This Week</h2>
        {activeIdentities.length > 0 && (() => {
          const today = new Date();
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          const weekAgoKey = weekAgo.toLocaleDateString('en-CA');
          const recentLogs = logs.filter(l => l.date >= weekAgoKey && l.status === 'completed');
          return (
            <div className="flex flex-wrap gap-2">
              {activeIdentities.map(identity => {
                const identityGoalIds = new Set(goals.filter(g => g.identityId === identity.id).map(g => g.id));
                const linkedHabitIds = new Set(habits.filter(h => h.goalId && identityGoalIds.has(h.goalId)).map(h => h.id));
                const linkedTaskIds = new Set(tasks.filter(t => t.goalId && identityGoalIds.has(t.goalId)).map(t => t.id));
                const count = recentLogs.filter(l => (l.type === 'habit' && linkedHabitIds.has(l.refId)) || (l.type === 'task' && linkedTaskIds.has(l.refId))).length;
                return (
                  <Badge key={identity.id} className="bg-primary/10 text-primary border-none text-[9px] px-2.5 py-1" data-testid={`badge-identity-evidence-${identity.id}`}>
                    {identity.statement.length > 20 ? identity.statement.slice(0, 20) + '…' : identity.statement}: {count} action{count !== 1 ? 's' : ''}
                  </Badge>
                );
              })}
            </div>
          );
        })()}
        {evidence.evidence.length === 0 && evidence.gaps.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Complete habits and tasks to build evidence of who you're becoming.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {evidence.evidence.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-secondary ml-1 flex items-center gap-1"><Check size={10} /> Supporting Evidence</p>
                {evidence.evidence.map((item, i) => (
                  <Card key={i} className="p-4 flex items-start gap-3 transition-all" data-testid={`card-evidence-${i}`}>
                    <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} className="text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                    </div>
                    {item.domain && <Badge className="bg-primary/10 text-primary border-none text-[8px] shrink-0">{item.domain}</Badge>}
                  </Card>
                ))}
              </div>
            )}
            {evidence.gaps.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600 ml-1 flex items-center gap-1"><AlertTriangle size={10} /> Growth Edges</p>
                {evidence.gaps.map((gap, i) => (
                  <Card key={i} className="p-4 space-y-3" data-testid={`card-gap-${i}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle size={14} className="text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{gap.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{gap.whyItMatters}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-[10px] w-full rounded-xl min-h-[44px]" onClick={() => executeGapAction(gap)} data-testid={`button-fix-gap-${i}`}>
                      {gap.fixAction.label}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3" data-testid="section-alignment">
        <div className="flex items-center gap-2 ml-1">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Identity Alignment</h2>
          <ScoringInfoButton type="identity-alignment" />
        </div>
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif text-primary" data-testid="text-alignment-score">{weeklyTrend.current}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="flex items-center gap-1 text-xs" data-testid="text-alignment-trend">
              {weeklyTrend.direction === 'up' && <><TrendingUp size={14} className="text-secondary" /><span className="text-secondary font-medium">+{weeklyTrend.current - weeklyTrend.previous}</span></>}
              {weeklyTrend.direction === 'down' && <><TrendingDown size={14} className="text-destructive" /><span className="text-destructive font-medium">{weeklyTrend.current - weeklyTrend.previous}</span></>}
              {weeklyTrend.direction === 'stable' && <><Minus size={14} className="text-muted-foreground" /><span className="text-muted-foreground">Stable</span></>}
              <span className="text-[10px] text-muted-foreground ml-1">vs last week</span>
            </div>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${weeklyTrend.current}%` }} />
          </div>
          <div className="space-y-3 pt-2">
            <AlignmentSubBar label="Intentionality" value={todayAlignment.intentionality} max={30} icon={<Target size={12} />} description="Setting intentions and completing keystone actions" />
            <AlignmentSubBar label="Congruent Action" value={todayAlignment.congruentAction} max={40} icon={<Zap size={12} />} description="Actions aligned with goals and focus domains" />
            <AlignmentSubBar label="Integrity Under Constraints" value={todayAlignment.integrityUnderConstraints} max={20} icon={<Shield size={12} />} description="Adapting scope to match capacity" />
            <AlignmentSubBar label="Reflection" value={todayAlignment.reflection} max={10} icon={<BookOpen size={12} />} description="Closing the loop and learning from the day" />
          </div>
        </Card>
      </section>

      <section className="space-y-3" data-testid="section-proof-timeline">
        <div className="flex items-center gap-2 ml-1">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Proof Timeline</h2>
          <ScoringInfoButton type="proof-timeline" />
        </div>
        {store.proofEvents.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Complete keystone habits or run a Sunday Reset to start building proof of who you're becoming.</p>
          </Card>
        ) : (
          <ProofTimeline proofEvents={store.proofEvents} habits={habits} goals={goals} tasks={tasks} onNavigate={setLocation} />
        )}
      </section>


      <section className="space-y-4" data-testid="section-goals">
        <div className="flex items-center justify-between ml-1">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Goals</h2>
          <p className="text-[9px] text-muted-foreground/60 italic mr-1">Downstream from identity</p>
        </div>

        {identities.map(identity => {
          const identityGoals = activeGoals.filter(g => g.identityId === identity.id);
          if (identityGoals.length === 0) return null;
          return (
            <div key={identity.id} className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-primary ml-1 flex items-center gap-1.5">
                <Target size={10} /> {identity.statement}
              </p>
              {identityGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} onEdit={() => startEditGoal(goal)} onDelete={() => { setGoalToDelete(goal.id); setIsDeleteGoalOpen(true); }} />
              ))}
            </div>
          );
        })}

        {activeGoals.filter(g => !g.identityId).length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Other Intentions</p>
            {activeGoals.filter(g => !g.identityId).map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={() => startEditGoal(goal)} onDelete={() => { setGoalToDelete(goal.id); setIsDeleteGoalOpen(true); }} />
            ))}
          </div>
        )}

        {pausedGoals.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-dashed">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 ml-1">Paused</p>
            {pausedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={() => startEditGoal(goal)} onDelete={() => { setGoalToDelete(goal.id); setIsDeleteGoalOpen(true); }} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={isIdentityFormOpen} onOpenChange={setIsIdentityFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="font-serif text-xl">{editingIdentityId ? 'Edit Identity' : 'Create Identity'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">I am becoming…</label>
              <Input placeholder="Someone who shows up with discipline and warmth" value={identityForm.statement} onChange={e => setIdentityForm({ ...identityForm, statement: e.target.value })} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-becoming-statement" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Future Self</label>
              <Input placeholder="The version of me 1 year from now" value={identityForm.futureSelf} onChange={e => setIdentityForm({ ...identityForm, futureSelf: e.target.value })} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-future-self" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">I refuse to become…</label>
              <Input placeholder="Someone who settles for comfort over growth" value={identityForm.refuseStatement} onChange={e => setIdentityForm({ ...identityForm, refuseStatement: e.target.value })} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-refuse-statement" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Core Values</label>
              <Input placeholder="Discipline, Growth, Integrity" value={identityForm.values} onChange={e => setIdentityForm({ ...identityForm, values: e.target.value })} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-values" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Commitments</label>
              <Textarea placeholder="I follow through on promises&#10;I rest without guilt&#10;I choose growth over comfort" value={identityForm.characterCommitments} onChange={e => setIdentityForm({ ...identityForm, characterCommitments: e.target.value })} rows={3} className="bg-muted/30 border-none rounded-xl resize-none" data-testid="input-commitments" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowFormAdvanced(!showFormAdvanced)} className="text-[10px] text-muted-foreground w-full min-h-[44px] rounded-xl">
              {showFormAdvanced ? <ChevronUp size={12} className="mr-1" /> : <ChevronDown size={12} className="mr-1" />}
              {showFormAdvanced ? 'Hide' : 'Show'} Domain Emphasis Sliders
            </Button>
            {showFormAdvanced && (
              <div className="space-y-4 p-4 bg-muted/20 rounded-2xl">
                <p className="text-xs text-muted-foreground">Weight each domain (0 = not part of this identity, 3 = central)</p>
                {allDomains.map(d => (
                  <div key={d} className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-sm text-foreground">{d}</label>
                      <span className="text-sm text-muted-foreground font-medium">{identityForm.domainEmphasis[d] || 0}</span>
                    </div>
                    <Slider value={[identityForm.domainEmphasis[d] || 0]} min={0} max={3} step={1} onValueChange={([v]) => setIdentityForm({ ...identityForm, domainEmphasis: { ...identityForm.domainEmphasis, [d]: v } })} />
                  </div>
                ))}
              </div>
            )}
            {editingIdentityId && (
              <Button variant="ghost" size="sm" className="text-destructive/70 text-[10px] w-full min-h-[44px] rounded-xl hover:text-destructive hover:bg-destructive/5" onClick={() => confirmDeleteIdentity(editingIdentityId)} data-testid="button-delete-identity">
                <Trash2 size={12} className="mr-1.5" /> Remove This Identity
              </Button>
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setIsIdentityFormOpen(false)} className="flex-1 h-12 rounded-xl">Cancel</Button>
            <Button onClick={saveIdentityForm} className="flex-1 h-12 rounded-xl bg-primary" data-testid="button-save-identity">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isIdentityListOpen} onOpenChange={setIsIdentityListOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="font-serif text-xl">Your Identities</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">Toggle identities on to make them active. You can shape multiple sides of who you're becoming.</p>
            {identities.map(identity => {
              const isOnlyActive = identity.isActive && identities.filter(i => i.isActive).length <= 1;
              const linkedGoals = goals.filter(g => g.identityId === identity.id).length;
              return (
                <Card key={identity.id} className={cn("p-4 space-y-3 transition-all", identity.isActive && "ring-1 ring-primary/30 bg-primary/[0.02]")} data-testid={`card-identity-${identity.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">{identity.statement}</p>
                      {identity.values.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {identity.values.slice(0, 4).map(v => <Badge key={v} className="bg-primary/10 text-primary border-none text-[8px]">{v}</Badge>)}
                        </div>
                      )}
                      {linkedGoals > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">{linkedGoals} linked goal{linkedGoals > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <Switch
                      checked={identity.isActive}
                      disabled={isOnlyActive}
                      onCheckedChange={() => {
                        toggleIdentityActive(identity.id);
                        hapticMedium();
                        toast.success(identity.isActive ? "Identity deactivated" : "Identity activated");
                      }}
                      data-testid={`toggle-identity-active-${identity.id}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 text-[10px] rounded-xl min-h-[44px]" onClick={() => { openIdentityForm(identity); setIsIdentityListOpen(false); }}>
                      <Edit2 size={11} className="mr-1.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[10px] rounded-xl min-h-[44px] text-destructive/50 hover:text-destructive hover:bg-destructive/5" onClick={() => confirmDeleteIdentity(identity.id)} data-testid={`button-delete-identity-${identity.id}`}>
                      <Trash2 size={11} className="mr-1.5" /> Remove
                    </Button>
                  </div>
                  {identity.isActive && (
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary pt-1">
                      <Star size={10} className="fill-primary" /> Active
                    </div>
                  )}
                </Card>
              );
            })}
            <Button variant="outline" onClick={() => { openIdentityForm(); setIsIdentityListOpen(false); }} className="w-full h-12 rounded-xl" data-testid="button-create-new-identity">
              <Plus size={14} className="mr-1.5" /> New Identity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteIdentityOpen} onOpenChange={setIsDeleteIdentityOpen}>
        <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Remove this identity?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {identityToDeleteObj && (
              <div className="p-4 bg-muted/20 rounded-2xl space-y-2">
                <p className="text-sm font-semibold text-foreground">"{identityToDeleteObj.statement}"</p>
                {linkedGoalCount > 0 && (
                  <p className="text-xs text-muted-foreground">{linkedGoalCount} goal{linkedGoalCount > 1 ? 's' : ''} linked to this identity will be unlinked but kept.</p>
                )}
              </div>
            )}
            {identities.length <= 1 && (
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <p className="text-xs text-amber-700 font-medium">This is your only identity. Removing it means starting fresh — you can always create a new one.</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">This can't be undone. Your goals, habits, and tasks will remain.</p>
            <div className="grid grid-cols-1 gap-2 pt-2">
              <Button variant="destructive" onClick={executeDeleteIdentity} className="h-12 rounded-xl font-bold" data-testid="button-confirm-delete-identity">
                Yes, Remove Identity
              </Button>
              <Button variant="ghost" onClick={() => { setIsDeleteIdentityOpen(false); setIdentityToDelete(null); }} className="h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                Keep It
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="font-serif">{activeGoalId ? 'Edit Goal' : 'New Goal'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Outcome</label>
              <Input placeholder="What will you achieve?" value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} className="h-12 bg-muted/30 border-none rounded-xl" data-testid="input-goal-title" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Intention</label>
              <Input placeholder="Connect this to your purpose" value={goalForm.intention} onChange={e => setGoalForm({ ...goalForm, intention: e.target.value })} className="h-11 bg-muted/30 border-none rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Identity</label>
                <Select value={goalForm.identityId} onValueChange={v => setGoalForm({ ...goalForm, identityId: v })}>
                  <SelectTrigger className="bg-muted/30 border-none rounded-xl h-11"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{identities.length > 0 ? identities.map(i => <SelectItem key={i.id} value={i.id}>{i.statement.length > 25 ? i.statement.slice(0, 25) + '…' : i.statement}</SelectItem>) : null}<SelectItem value="none">None</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Domain</label>
                <Select value={goalForm.domain} onValueChange={(v: any) => setGoalForm({ ...goalForm, domain: v })}>
                  <SelectTrigger className="bg-muted/30 border-none rounded-xl h-11"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{allDomains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-foreground">Pause Goal</label>
                <p className="text-xs text-muted-foreground">Temporarily remove from focus</p>
              </div>
              <Switch checked={goalForm.isPaused} onCheckedChange={c => setGoalForm({ ...goalForm, isPaused: c })} data-testid="switch-goal-paused" />
            </div>
            {activeGoalId && (
              <div className="space-y-4 p-4 bg-muted/20 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-foreground">Manual Progress</label>
                    <p className="text-xs text-muted-foreground">Set progress by hand instead of auto-tracking</p>
                  </div>
                  <Switch checked={goalForm.isManualProgress} onCheckedChange={c => setGoalForm({ ...goalForm, isManualProgress: c })} data-testid="switch-manual-progress" />
                </div>
                {goalForm.isManualProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Progress</label>
                      <span className="text-xs font-semibold text-foreground" data-testid="text-goal-form-progress">{goalForm.currentProgress}/{goalForm.targetProgress}</span>
                    </div>
                    <Slider value={[goalForm.currentProgress]} min={0} max={goalForm.targetProgress} step={1} onValueChange={([v]) => setGoalForm({ ...goalForm, currentProgress: v })} data-testid="slider-goal-progress" />
                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-xs text-muted-foreground">Target:</label>
                      <Input type="number" value={goalForm.targetProgress} onChange={e => setGoalForm({ ...goalForm, targetProgress: Math.max(1, parseInt(e.target.value) || 1) })} className="h-9 w-20 bg-muted/30 border-none rounded-lg text-sm" data-testid="input-goal-target" />
                    </div>
                  </div>
                )}
              </div>
            )}
            {!activeGoalId && budgetOverloaded && !goalForm.isPaused && (
              <div className="p-4 bg-amber-500/5 rounded-2xl ring-1 ring-amber-500/10 space-y-3" data-testid="card-goal-budget-warning">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-700">Adding this goal will increase your load</p>
                    <p className="text-[10px] text-amber-600/70 mt-0.5">You're currently using {commitmentUsage.totalUsed} of {commitmentBudget.totalBudget} capacity units. Each goal costs 12 units.</p>
                  </div>
                </div>
                {overloadSuggestions.length > 0 && (
                  <div className="space-y-1.5 pl-7">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600/80">Consider instead:</p>
                    {overloadSuggestions.map((s, i) => (
                      <p key={i} className="text-[10px] text-amber-600/70">• {s.label}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setIsGoalFormOpen(false)} className="flex-1 h-12 rounded-xl">Cancel</Button>
            <Button onClick={handleSaveGoal} className="flex-1 h-12 rounded-xl bg-primary" data-testid="button-save-goal">Save Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteGoalOpen} onOpenChange={setIsDeleteGoalOpen}>
        <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="font-serif">Delete this goal?</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">What should happen to linked habits and tasks?</p>
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={() => handleDeleteGoal(false)} className="h-12 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-none">Keep items (unlink)</Button>
              <Button variant="destructive" onClick={() => handleDeleteGoal(true)} className="h-12 rounded-xl font-bold">Delete everything</Button>
              <Button variant="ghost" onClick={() => setIsDeleteGoalOpen(false)} className="h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDriftOpen} onOpenChange={setIsDriftOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-serif text-xl">Identity Drift</DialogTitle>
              {driftAlerts.length > 0 && !store.isDriftSnoozed() && (
                <button
                  onClick={() => { store.snoozeDriftAlerts(); toast("Drift alerts snoozed for 7 days"); setIsDriftOpen(false); }}
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground px-3 py-2 rounded-xl min-h-[44px]"
                  data-testid="button-snooze-drift-identity"
                >
                  Snooze 7d
                </button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-2xl">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", driftLevel === 'Low' ? "bg-secondary/10" : driftLevel === 'Medium' ? "bg-amber-500/10" : "bg-destructive/10")}>
                <Compass size={18} className={cn(driftLevel === 'Low' ? "text-secondary" : driftLevel === 'Medium' ? "text-amber-600" : "text-destructive")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Overall: {driftLevel} Drift</p>
                <p className="text-xs text-muted-foreground">{driftLevel === 'Low' ? "Your system is well-calibrated." : driftLevel === 'Medium' ? "Some areas need attention." : "Time for a system redesign."}</p>
              </div>
            </div>
            {driftAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Check size={24} className="mx-auto text-secondary mb-2" />
                <p className="text-sm text-muted-foreground">No drift detected. Your actions align with your identity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {driftAlerts.map(alert => (
                  <Card key={alert.id} className="p-4 space-y-3" data-testid={`card-drift-${alert.id}`}>
                    <div className="flex items-start gap-3">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", alert.level === 'High' ? "bg-destructive/10" : "bg-amber-500/10")}>
                        <AlertTriangle size={14} className={cn(alert.level === 'High' ? "text-destructive" : "text-amber-600")} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      </div>
                    </div>
                    <div className="pl-11 space-y-1.5">
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Why it matters:</span> {alert.whyItMatters}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Likely cause:</span> {alert.likelyCause}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-11">
                      {alert.actions.map((action, i) => (
                        <Button key={i} variant="outline" size="sm" className="text-[10px] rounded-xl min-h-[44px]" onClick={() => executeDriftAction(action)} data-testid={`button-drift-action-${alert.id}-${i}`}>
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground/60 text-center italic pt-2">Drift is a redesign opportunity, not a failure.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlignmentSubBar({ label, value, max, icon, description }: { label: string; value: number; max: number; icon: React.ReactNode; description: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-xs font-semibold text-foreground">{value}/{max}</span>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-primary/50 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground/60">{description}</p>
    </div>
  );
}

function ProofTimeline({ proofEvents, habits, goals, tasks, onNavigate }: {
  proofEvents: import("@/store/useStore").ProofEvent[];
  habits: import("@/store/useStore").Habit[];
  goals: Goal[];
  tasks: import("@/store/useStore").Task[];
  onNavigate: (path: string) => void;
}) {
  const grouped = useMemo(() => {
    const weeks: Record<string, typeof proofEvents> = {};
    const sorted = [...proofEvents].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    sorted.forEach(event => {
      const d = new Date(event.dateKey + 'T12:00:00');
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const weekKey = monday.toLocaleDateString('en-CA');
      if (!weeks[weekKey]) weeks[weekKey] = [];
      weeks[weekKey].push(event);
    });
    return Object.entries(weeks).sort(([a], [b]) => b.localeCompare(a));
  }, [proofEvents]);

  const getWeekLabel = (weekKey: string) => {
    const d = new Date(weekKey + 'T12:00:00');
    const today = new Date();
    const todayMonday = new Date(today);
    todayMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const todayMondayKey = todayMonday.toLocaleDateString('en-CA');
    if (weekKey === todayMondayKey) return 'This Week';
    const lastMonday = new Date(todayMonday);
    lastMonday.setDate(todayMonday.getDate() - 7);
    if (weekKey === lastMonday.toLocaleDateString('en-CA')) return 'Last Week';
    return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const handleTap = (event: typeof proofEvents[0]) => {
    if (event.linkedHabitId) {
      onNavigate('/habits');
    } else if (event.linkedGoalId) {
      onNavigate('/identity');
    } else if (event.linkedTaskId) {
      onNavigate('/tasks');
    } else if (event.source === 'sunday-reset') {
      onNavigate('/review');
    } else if (event.source === 'close-the-loop') {
      onNavigate('/');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'habit-completion': return <Zap size={10} className="text-secondary" />;
      case 'goal-task': return <Target size={10} className="text-primary" />;
      case 'wise-adaptation': return <Shield size={10} className="text-blue-500" />;
      case 'sunday-reset': return <Compass size={10} className="text-primary" />;
      case 'close-the-loop': return <BookOpen size={10} className="text-amber-600" />;
      case 'triage': return <Brain size={10} className="text-emerald-600" />;
      default: return <Star size={10} className="text-primary" />;
    }
  };

  return (
    <div className="space-y-4">
      {grouped.map(([weekKey, events]) => (
        <div key={weekKey} className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary ml-1">{getWeekLabel(weekKey)}</p>
          {events.map((event, i) => (
            <Card
              key={event.id || i}
              className="p-4 active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => handleTap(event)}
              data-testid={`card-proof-${event.id || i}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  {getSourceIcon(event.source)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{event.whyItMatters}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(event.dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                {event.domain && <Badge className="bg-primary/10 text-primary border-none text-[8px] shrink-0">{event.domain}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: () => void; onDelete: () => void }) {
  const { updateGoal } = useStore();
  const pct = goal.targetProgress > 0 ? Math.round((goal.currentProgress / goal.targetProgress) * 100) : 0;
  return (
    <Card className={cn("transition-all active:scale-[0.98]", goal.isPaused && "opacity-50 grayscale")} data-testid={`card-goal-${goal.id}`}>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 space-y-1.5 min-w-0" onClick={onEdit}>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-foreground">{goal.title}</h4>
              {goal.domain && <Badge className="text-[8px] bg-primary/10 text-primary border-none">{goal.domain}</Badge>}
              {goal.isPaused && <Badge variant="outline" className="text-[8px]">Paused</Badge>}
            </div>
            {goal.intention && <p className="text-xs text-muted-foreground italic line-clamp-1">{goal.intention}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground rounded-full" onClick={(e) => { e.stopPropagation(); updateGoal(goal.id, { isPaused: !goal.isPaused }); hapticMedium(); toast.success(goal.isPaused ? "Goal resumed" : "Goal paused"); }} data-testid={`button-pause-goal-${goal.id}`}>
              <Pause size={14} className={goal.isPaused ? "fill-current" : ""} />
            </Button>
            <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={(e) => { e.stopPropagation(); onDelete(); }} data-testid={`button-delete-goal-${goal.id}`}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">{goal.isManualProgress ? 'Manual' : 'Auto'} Progress</span>
            <span className="text-[10px] font-semibold text-foreground" data-testid={`text-goal-progress-${goal.id}`}>{goal.currentProgress}/{goal.targetProgress} ({pct}%)</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
