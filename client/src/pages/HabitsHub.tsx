import { useState, useMemo, useCallback } from "react";
import { Plus, Target, Layers, Trash2, Zap, ArrowRight, X, Pause, Play, Search, Settings2, Eye, EyeOff, GripVertical, Tag, Pencil, Check } from "lucide-react";
import { useDebounce } from "@/lib/useDebounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, Habit, DEFAULT_DOMAINS, Domain, DEFAULT_HABITS_HUB_SECTIONS } from "@/store/useStore";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { computeGravityScores, type GravityMap } from "@/lib/gravityEngine";
import { ScoringInfoButton } from "@/components/ScoringTooltip";
import { computeAllStreaks, getStreakLabel, getNextMilestone } from "@/lib/streakEngine";
import { generateRecommendations, type HabitRecommendation } from "@/lib/recommendationEngine";
import { computeHabitHeatMap } from "@/lib/trendEngine";
import { HeatMap } from "@/components/HeatMap";
import { Lightbulb, ChevronDown, ChevronUp, Sparkles, Calendar } from "lucide-react";

export default function HabitsHub() {
  const { goals, habits, identities, addHabit, updateHabit, deleteHabit, logs, tasks, dailyRhythms, habitsHubSections, toggleSectionVisibility, moveSection, customDomains, addCustomDomain, removeCustomDomain, renameCustomDomain, getAllDomains } = useStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [isDomainManagerOpen, setIsDomainManagerOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [renamingDomain, setRenamingDomain] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [showHighLeverageOnly, setShowHighLeverageOnly] = useState(false);
  const [domainFilter, setDomainFilter] = useState<Domain | 'all'>('all');
  const allDomains = useMemo(() => [...DEFAULT_DOMAINS, ...customDomains], [customDomains]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set());

  const gravityScores: GravityMap = useMemo(
    () => computeGravityScores(habits, logs, tasks, dailyRhythms, goals, identities),
    [habits, logs, tasks, dailyRhythms, goals, identities]
  );

  const todayDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const habitStreaks = useMemo(() => computeAllStreaks(habits, logs, todayDate), [habits, logs, todayDate]);

  const recommendations = useMemo(() =>
    generateRecommendations(goals, habits, identities, logs).filter(r => !dismissedRecs.has(r.id)),
    [goals, habits, identities, logs, dismissedRecs]
  );

  const habitLogMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    logs.filter(l => l.type === 'habit').forEach(l => {
      if (!map.has(l.refId)) map.set(l.refId, new Map());
      const existing = map.get(l.refId)!.get(l.date);
      if (!existing || l.status === 'completed' || (l.status === 'micro' && existing !== 'completed')) {
        map.get(l.refId)!.set(l.date, l.status);
      }
    });
    return map;
  }, [logs]);

  const heatMapData = useMemo(() => computeHabitHeatMap(habits, logs, 90), [habits, logs]);

  const orderedSections = useMemo(() => {
    if (habitsHubSections.length === 0) return DEFAULT_HABITS_HUB_SECTIONS;
    const missing = DEFAULT_HABITS_HUB_SECTIONS.filter(d => !habitsHubSections.some(s => s.id === d.id));
    return missing.length > 0 ? [...habitsHubSections, ...missing] : habitsHubSections;
  }, [habitsHubSections]);
  const isSectionVisible = useCallback((id: string) => {
    const s = orderedSections.find(s => s.id === id);
    return s ? s.visible : true;
  }, [orderedSections]);
  const sectionOrder = useCallback((id: string) => {
    const idx = orderedSections.findIndex(s => s.id === id);
    return idx >= 0 ? idx : 99;
  }, [orderedSections]);

  const SECTION_LABELS: Record<string, string> = {
    'search-filters': 'Search & Filters',
    'heat-map': 'Consistency Heat Map',
    'recommendations': 'Suggested for You',
    'habit-list': 'Habit List',
  };

  const adoptRecommendation = (rec: HabitRecommendation) => {
    setFormData({
      title: rec.title,
      why: rec.why,
      trigger: rec.trigger,
      fallback: rec.fallback,
      schedule: 'Daily',
      difficulty: rec.difficulty,
      isKeystone: false,
      isMicro: rec.category === 'micro-upgrade',
      frictionNote: '',
      cueNote: '',
      goalId: rec.goalId || 'none',
      domain: rec.domain || 'none',
    });
    setActiveHabitId(null);
    setIsFormOpen(true);
    hapticLight();
  };

  const dismissRecommendation = (recId: string) => {
    setDismissedRecs(prev => { const next = new Set(Array.from(prev)); next.add(recId); return next; });
    hapticLight();
  };

  const emptyForm = {
    title: '', why: '', trigger: '', fallback: '', schedule: 'Daily',
    difficulty: 3, isKeystone: false, isMicro: false, frictionNote: '', cueNote: '',
    goalId: 'none', domain: 'none' as Domain | 'none'
  };
  const [formData, setFormData] = useState(emptyForm);

  const startEdit = (habit: Habit) => {
    setActiveHabitId(habit.id);
    setFormData({
      title: habit.title,
      why: habit.why,
      trigger: habit.trigger,
      fallback: habit.fallback,
      schedule: habit.schedule,
      difficulty: habit.difficulty,
      isKeystone: habit.isKeystone,
      isMicro: habit.isMicro,
      frictionNote: habit.frictionNote,
      cueNote: habit.cueNote,
      goalId: habit.goalId || 'none',
      domain: habit.domain || 'none'
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.title) return;
    
    const habitData = {
      title: formData.title,
      why: formData.why,
      trigger: formData.trigger || 'Anytime',
      fallback: formData.fallback,
      schedule: formData.schedule,
      difficulty: formData.difficulty,
      isKeystone: formData.isKeystone,
      isMicro: formData.isMicro,
      frictionNote: formData.frictionNote,
      cueNote: formData.cueNote,
      goalId: formData.goalId === 'none' ? null : formData.goalId,
      domain: formData.domain === 'none' ? null : formData.domain,
    };

    if (activeHabitId) {
      updateHabit(activeHabitId, habitData);
      hapticLight();
      toast.success("Habit refined");
    } else {
      addHabit({ ...habitData, isMicro: formData.isMicro });
      hapticSuccess();
      toast.success("Habit constructed");
    }
    
    setIsFormOpen(false);
    setActiveHabitId(null);
    setFormData(emptyForm);
  };

  const confirmDelete = (id: string) => {
    setHabitToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = (cascade: boolean = false) => {
    if (habitToDelete) {
      deleteHabit(habitToDelete, cascade);
      setIsDeleteConfirmOpen(false);
      setHabitToDelete(null);
      if (activeHabitId === habitToDelete) {
        setIsFormOpen(false);
        setActiveHabitId(null);
      }
      hapticWarning();
      toast.success(cascade ? "Habit and linked tasks removed" : "Habit removed (tasks unlinked)");
    }
  };

  const debouncedSearch = useDebounce(searchQuery, 200);
  const sq = debouncedSearch.toLowerCase().trim();

  const activeHabitsList = useMemo(() => habits.filter(h => {
    if (h.isPaused) return false;
    if (domainFilter !== 'all' && h.domain !== domainFilter) return false;
    if (showHighLeverageOnly) {
      const gravity = gravityScores.get(h.id);
      return gravity?.label === 'High leverage';
    }
    if (sq && !h.title.toLowerCase().includes(sq)) return false;
    return true;
  }), [habits, domainFilter, showHighLeverageOnly, gravityScores, sq]);
  const pausedHabitsList = useMemo(() => habits.filter(h => h.isPaused && (!sq || h.title.toLowerCase().includes(sq))), [habits, sq]);

  const highLeverageCount = useMemo(() => habits.filter(h => !h.isPaused && gravityScores.get(h.id)?.label === 'High leverage').length, [habits, gravityScores]);

  const groupedHabits = useMemo(() => goals.map(goal => ({
    ...goal,
    linkedHabits: activeHabitsList.filter(h => h.goalId === goal.id)
  })), [goals, activeHabitsList]);
  const unlinkedHabits = useMemo(() => activeHabitsList.filter(h => !h.goalId), [activeHabitsList]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="pt-6 pb-1 flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">System <ScoringInfoButton type="gravity-score" size={11} /></p>
          <h1 className="text-3xl font-serif text-primary mt-1">Habits Hub</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground" onClick={() => { setIsDomainManagerOpen(true); hapticLight(); }} data-testid="button-manage-domains">
            <Tag size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground" onClick={() => { setIsLayoutSettingsOpen(true); hapticLight(); }} data-testid="button-habits-hub-layout">
            <Settings2 size={18} />
          </Button>
          <Button onClick={() => { setFormData(emptyForm); setActiveHabitId(null); setIsFormOpen(true); }} size="icon" className="rounded-full bg-primary h-11 w-11 min-h-[44px] min-w-[44px] shadow-md shrink-0" data-testid="button-add-habit">
            <Plus size={22} />
          </Button>
        </div>
      </header>

      <Sheet open={isLayoutSettingsOpen} onOpenChange={setIsLayoutSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif text-lg">Habits Hub Layout</SheetTitle>
          </SheetHeader>
          <div className="space-y-1 mt-4">
            {orderedSections.map((section) => (
              <div key={section.id} className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors" data-testid={`layout-section-${section.id}`}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => { moveSection('habitsHub', section.id, 'up'); hapticLight(); }} className="text-muted-foreground/40 hover:text-muted-foreground p-0.5" data-testid={`button-move-up-${section.id}`}>
                    <ChevronUp size={12} />
                  </button>
                  <button onClick={() => { moveSection('habitsHub', section.id, 'down'); hapticLight(); }} className="text-muted-foreground/40 hover:text-muted-foreground p-0.5" data-testid={`button-move-down-${section.id}`}>
                    <ChevronDown size={12} />
                  </button>
                </div>
                <GripVertical size={14} className="text-muted-foreground/30" />
                <span className="flex-1 text-sm font-medium">{SECTION_LABELS[section.id] || section.id}</span>
                <button onClick={() => { toggleSectionVisibility('habitsHub', section.id); hapticLight(); }} className="p-1.5" data-testid={`button-toggle-visibility-${section.id}`}>
                  {section.visible ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-muted-foreground/40" />}
                </button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isDomainManagerOpen} onOpenChange={setIsDomainManagerOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Tag size={18} className="text-primary" /> Manage Domains
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Create, rename, or remove custom domains. Changes apply across habits, tasks, and goals.
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              data-testid="input-new-domain"
              placeholder="New domain name"
              value={newDomainName}
              onChange={e => setNewDomainName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newDomainName.trim()) {
                  if (allDomains.includes(newDomainName.trim())) {
                    toast.error("Domain already exists");
                    return;
                  }
                  addCustomDomain(newDomainName.trim());
                  setNewDomainName("");
                  hapticSuccess();
                  toast.success("Domain created");
                }
              }}
              className="h-11 bg-muted/30 border-none rounded-xl text-sm flex-1"
            />
            <Button
              size="sm"
              className="h-11 px-4 rounded-xl bg-primary"
              data-testid="button-create-domain"
              onClick={() => {
                if (!newDomainName.trim()) return;
                if (allDomains.includes(newDomainName.trim())) {
                  toast.error("Domain already exists");
                  return;
                }
                addCustomDomain(newDomainName.trim());
                setNewDomainName("");
                hapticSuccess();
                toast.success("Domain created");
              }}
            >
              <Plus size={16} />
            </Button>
          </div>

          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Default Domains</p>
            {DEFAULT_DOMAINS.map(d => {
              const habitCount = habits.filter(h => h.domain === d).length;
              return (
                <div key={d} className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-border/20 bg-card opacity-70" data-testid={`domain-default-${d}`}>
                  <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">{d}</span>
                  <span className="text-[9px] text-muted-foreground/60 shrink-0">{habitCount} {habitCount === 1 ? 'habit' : 'habits'}</span>
                </div>
              );
            })}

            {customDomains.length > 0 && (
              <>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-4">Custom Domains</p>
                {customDomains.map(d => {
                  const habitCount = habits.filter(h => h.domain === d).length;
                  const isRenaming = renamingDomain === d;
                  return (
                    <div key={d} className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-border/20 bg-card" data-testid={`domain-custom-${d}`}>
                      {isRenaming ? (
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && renameValue.trim() && renameValue.trim() !== d) {
                              if (allDomains.includes(renameValue.trim())) {
                                toast.error("Domain already exists");
                                return;
                              }
                              renameCustomDomain(d, renameValue.trim());
                              setRenamingDomain(null);
                              hapticSuccess();
                              toast.success("Domain renamed");
                            } else if (e.key === 'Escape') {
                              setRenamingDomain(null);
                            }
                          }}
                          autoFocus
                          className="h-8 text-xs bg-muted/30 border-none rounded-lg flex-1"
                          data-testid={`input-rename-domain-${d}`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">{d}</span>
                      )}
                      <span className="text-[9px] text-muted-foreground/60 shrink-0">{habitCount} {habitCount === 1 ? 'habit' : 'habits'}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isRenaming ? (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => {
                                if (renameValue.trim() && renameValue.trim() !== d) {
                                  if (allDomains.includes(renameValue.trim())) {
                                    toast.error("Domain already exists");
                                    return;
                                  }
                                  renameCustomDomain(d, renameValue.trim());
                                  hapticSuccess();
                                  toast.success("Domain renamed");
                                }
                                setRenamingDomain(null);
                              }}
                              data-testid={`button-confirm-rename-domain-${d}`}
                            >
                              <Check size={14} className="text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRenamingDomain(null)} data-testid={`button-cancel-rename-domain-${d}`}>
                              <X size={14} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => { setRenamingDomain(d); setRenameValue(d); }}
                              data-testid={`button-rename-domain-${d}`}
                            >
                              <Pencil size={12} className="text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setDeletingDomain(d)}
                              data-testid={`button-delete-domain-${d}`}
                            >
                              <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <Button variant="outline" className="w-full h-11 rounded-2xl mt-4 text-xs font-bold"
            onClick={() => setIsDomainManagerOpen(false)} data-testid="button-close-domain-manager"
          >
            Done
          </Button>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingDomain} onOpenChange={(open) => { if (!open) setDeletingDomain(null); }}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deletingDomain}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const count = habits.filter(h => h.domain === deletingDomain).length + tasks.filter(t => t.domain === deletingDomain).length + goals.filter(g => g.domain === deletingDomain).length;
                return count > 0
                  ? `This domain is used on ${count} item(s). It will be removed from all of them.`
                  : "No items are using this domain. It will be removed from your domain list.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl min-h-[44px] bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deletingDomain) {
                  removeCustomDomain(deletingDomain);
                  hapticWarning();
                  toast.success(`"${deletingDomain}" removed`);
                  setDeletingDomain(null);
                }
              }}
              data-testid="button-confirm-delete-domain"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column' }}>
      {[
        { id: 'search-filters', content: (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                data-testid="input-search-habits"
                placeholder="Search habits..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-10 pl-9 bg-muted/30 border-none rounded-xl text-sm"
              />
            </div>
            <Select value={domainFilter} onValueChange={(val: any) => setDomainFilter(val)}>
              <SelectTrigger className="w-auto min-w-[100px] h-10 rounded-xl bg-muted/30 border-none text-[10px] font-bold uppercase shrink-0" data-testid="select-domain-filter">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {allDomains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {highLeverageCount > 0 && (
              <Button
                variant={showHighLeverageOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHighLeverageOnly(!showHighLeverageOnly)}
                className={cn("rounded-full text-[10px] font-bold uppercase px-3 h-10 shrink-0", showHighLeverageOnly && "bg-emerald-600 hover:bg-emerald-700")}
                data-testid="button-high-leverage-filter"
              >
                ⬆ {highLeverageCount}
              </Button>
            )}
          </div>
        )},
        { id: 'heat-map', content: habits.length > 0 ? (
          <div className="space-y-3">
            <button
              onClick={() => { setShowHeatMap(!showHeatMap); hapticLight(); }}
              className="flex items-center gap-2 w-full text-left"
              data-testid="button-toggle-heatmap"
            >
              <div className="flex items-center gap-2 flex-1">
                <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Calendar size={14} className="text-emerald-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Consistency</span>
              </div>
              {showHeatMap ? <ChevronUp size={14} className="text-muted-foreground/50" /> : <ChevronDown size={14} className="text-muted-foreground/50" />}
            </button>
            {showHeatMap && (
              <Card className="bg-card border-none shadow-sm rounded-2xl p-4 ring-1 ring-border/20">
                <HeatMap data={heatMapData} />
              </Card>
            )}
          </div>
        ) : null},
        { id: 'recommendations', content: recommendations.length > 0 ? (
          <div className="space-y-3">
            <button
              onClick={() => { setShowRecommendations(!showRecommendations); hapticLight(); }}
              className="flex items-center gap-2 w-full text-left"
              data-testid="button-toggle-recommendations"
            >
              <div className="flex items-center gap-2 flex-1">
                <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Lightbulb size={14} className="text-amber-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Suggested for You</span>
                <Badge className="text-[8px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border-none font-bold">{recommendations.length}</Badge>
              </div>
              {showRecommendations ? <ChevronUp size={14} className="text-muted-foreground/50" /> : <ChevronDown size={14} className="text-muted-foreground/50" />}
            </button>
            {showRecommendations && (
              <div className="space-y-2">
                {recommendations.map(rec => (
                  <Card key={rec.id} className="bg-card border-none shadow-sm rounded-2xl overflow-hidden" data-testid={`card-rec-${rec.id}`}>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sparkles size={12} className="text-amber-500" />
                            <h4 className="font-bold text-sm text-foreground">{rec.title}</h4>
                            <Badge className="text-[8px] h-3.5 px-1.5 bg-primary/10 text-primary border-none font-bold uppercase">{rec.domain}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">{rec.why}</p>
                          <p className="text-[10px] text-amber-600/80 font-medium">{rec.reason}</p>
                          {rec.goalTitle && (
                            <p className="text-[10px] text-primary/60 font-medium flex items-center gap-1">
                              <Target size={9} /> {rec.goalTitle}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => dismissRecommendation(rec.id)}
                          className="text-muted-foreground/30 hover:text-muted-foreground p-1"
                          data-testid={`button-dismiss-rec-${rec.id}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => adoptRecommendation(rec)}
                          className="rounded-full text-[10px] font-bold uppercase tracking-wider h-8 px-4 bg-primary"
                          data-testid={`button-adopt-rec-${rec.id}`}
                        >
                          <Plus size={12} className="mr-1" /> Add This Habit
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null},
        { id: 'habit-list', content: (
          <div className="space-y-8 pt-4">
            {groupedHabits.map(goal => (
              <div key={goal.id} className="space-y-4">
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 border-b border-border/50 pb-2">
                  <Target size={14} className="text-primary opacity-50" /> {goal.title}
                  {goal.identityId && (() => {
                    const linked = identities.find(i => i.id === goal.identityId);
                    if (!linked) return null;
                    const preview = linked.statement.length > 20 ? linked.statement.slice(0, 20) + '…' : linked.statement;
                    return <span className="text-[9px] font-medium text-primary/60 normal-case tracking-normal ml-auto" data-testid={`text-identity-link-${goal.id}`}>↗ {preview}</span>;
                  })()}
                </h2>
                {goal.linkedHabits.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-6 opacity-60">No active habits yet.</p>
                ) : (
                  <div className="space-y-3">
                    {goal.linkedHabits.map(habit => (
                      <HabitCard key={habit.id} habit={habit} gravityScores={gravityScores} habitStreaks={habitStreaks} habitLogMap={habitLogMap} onEdit={() => startEdit(habit)} onDelete={() => confirmDelete(habit.id)} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {unlinkedHabits.length > 0 && (
              <div className="space-y-4 pt-4">
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 border-b border-border/50 pb-2">
                  <Layers size={14} className="text-secondary opacity-50" /> Unlinked
                </h2>
                <div className="space-y-3">
                  {unlinkedHabits.map(habit => (
                    <HabitCard key={habit.id} habit={habit} gravityScores={gravityScores} habitStreaks={habitStreaks} habitLogMap={habitLogMap} onEdit={() => startEdit(habit)} onDelete={() => confirmDelete(habit.id)} />
                  ))}
                </div>
              </div>
            )}

            {pausedHabitsList.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-dashed">
                <h2 className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] flex items-center gap-2 pb-2">
                  <Pause size={14} /> Paused Seasons
                </h2>
                <div className="space-y-3">
                  {pausedHabitsList.map(habit => (
                    <HabitCard key={habit.id} habit={habit} gravityScores={gravityScores} habitStreaks={habitStreaks} habitLogMap={habitLogMap} onEdit={() => startEdit(habit)} onDelete={() => confirmDelete(habit.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )},
      ]
        .sort((a, b) => sectionOrder(a.id) - sectionOrder(b.id))
        .map(section => isSectionVisible(section.id) && section.content ? (
          <div key={section.id} style={{ order: sectionOrder(section.id) }}>
            {section.content}
          </div>
        ) : null)}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{activeHabitId ? 'Edit Habit' : 'New Habit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Name (Verb)</label>
              <Input placeholder="e.g., Read 10 pages" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="h-12 bg-muted/30 border-none rounded-xl" />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Why?</label>
              <Input placeholder="To expand my mind" value={formData.why} onChange={e => setFormData({ ...formData, why: e.target.value })} className="h-11 bg-muted/30 border-none rounded-xl text-sm" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">After…</label>
              <div className="flex items-center gap-2 bg-muted/30 p-1 px-3 rounded-xl border-none">
                <span className="text-xs font-bold text-muted-foreground uppercase">IF</span>
                <Input placeholder="I make coffee" value={formData.trigger} onChange={e => setFormData({ ...formData, trigger: e.target.value })} className="bg-transparent border-none h-10 shadow-none focus-visible:ring-0" />
              </div>
            </div>

            <div className="p-4 bg-secondary/10 rounded-2xl border border-secondary/20 space-y-2 shadow-inner">
              <label className="text-xs font-bold uppercase text-secondary flex items-center gap-1.5"><ArrowRight size={14} /> Minimum Version</label>
              <p className="text-[10px] text-muted-foreground font-medium mb-2">The bare minimum to keep your streak on tough days.</p>
              <Input placeholder="e.g., Read 1 sentence" value={formData.fallback} onChange={e => setFormData({ ...formData, fallback: e.target.value })} className="bg-background border-none rounded-xl h-10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Goal</label>
                <Select value={formData.goalId} onValueChange={val => setFormData({...formData, goalId: val})}>
                  <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl"><SelectValue placeholder="No Goal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Goal</SelectItem>
                    {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Domain</label>
                <Select value={formData.domain} onValueChange={(val: any) => setFormData({...formData, domain: val})}>
                  <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl"><SelectValue placeholder="No Domain" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Domain</SelectItem>
                    {allDomains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Schedule</label>
                <Select value={formData.schedule} onValueChange={val => setFormData({...formData, schedule: val})}>
                  <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl" data-testid="select-habit-schedule"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Daily', 'Weekdays', 'Weekends', '3x/week', '2x/week', 'Weekly'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Difficulty</label>
                <Select value={String(formData.difficulty)} onValueChange={val => setFormData({...formData, difficulty: parseInt(val)})}>
                  <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl" data-testid="select-habit-difficulty"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(d => (
                      <SelectItem key={d} value={String(d)}>{d} — {['Effortless', 'Easy', 'Moderate', 'Hard', 'Extreme'][d-1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Behavioral Strategy</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground ml-1">Friction</label>
                  <Textarea className="h-16 text-xs bg-muted/30 border-none rounded-xl resize-none" placeholder="e.g., Book is upstairs" value={formData.frictionNote} onChange={e => setFormData({ ...formData, frictionNote: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground ml-1">Cue</label>
                  <Textarea className="h-16 text-xs bg-muted/30 border-none rounded-xl resize-none" placeholder="e.g., Book on pillow" value={formData.cueNote} onChange={e => setFormData({ ...formData, cueNote: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-foreground">Keystone Habit</label>
                <p className="text-[10px] text-muted-foreground font-medium">Triggers other positive habits naturally.</p>
              </div>
              <Switch checked={formData.isKeystone} onCheckedChange={c => setFormData({...formData, isKeystone: c})} data-testid="switch-keystone" />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-foreground">Micro Habit</label>
                <p className="text-[10px] text-muted-foreground font-medium">Start with the smallest version every time.</p>
              </div>
              <Switch checked={formData.isMicro} onCheckedChange={c => setFormData({...formData, isMicro: c})} data-testid="switch-micro" />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1 h-12 rounded-xl" data-testid="button-cancel-habit">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground" data-testid="button-save-habit">Save Habit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl sm:max-w-xs" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Delete Habit?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
             <p className="text-sm text-muted-foreground">What should happen to tasks linked to this habit?</p>
             <div className="grid grid-cols-1 gap-2">
                <Button onClick={() => handleDelete(false)} className="h-12 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-none" data-testid="button-delete-keep">Keep items (unlink)</Button>
                <Button variant="destructive" onClick={() => handleDelete(true)} className="h-12 rounded-xl font-bold" data-testid="button-delete-cascade">Delete tasks</Button>
                <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="h-11 min-h-[44px] rounded-xl text-[10px] font-bold uppercase tracking-widest" data-testid="button-delete-cancel">Cancel</Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function getDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-CA');
}

type HabitLogMap = Map<string, Map<string, string>>;

function HabitProgressDots({ habitId, habitLogMap }: { habitId: string, habitLogMap: HabitLogMap }) {
  const days = 14;
  const dateMap = habitLogMap.get(habitId);

  const dayData = useMemo(() => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = getDateString(i);
      const status = dateMap?.get(dateStr) || null;
      result.push({ date: dateStr, status, daysAgo: i });
    }
    return result;
  }, [dateMap]);

  const completedCount = dayData.filter(d => d.status === 'completed' || d.status === 'micro').length;
  const rate = Math.round((completedCount / days) * 100);
  const rateColor = rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2 pt-1.5" data-testid={`progress-dots-${habitId}`}>
      <div className="flex gap-[3px] items-center">
        {dayData.map((d, i) => (
          <div
            key={i}
            className={cn(
              "w-[7px] h-[7px] rounded-full transition-colors",
              d.status === 'completed' ? "bg-emerald-500" :
              d.status === 'micro' ? "bg-secondary" :
              d.status === 'skipped' ? "bg-destructive/30" :
              d.status === 'grace' ? "bg-amber-400/40" :
              "bg-muted-foreground/15"
            )}
            title={`${d.date}: ${d.status || 'no entry'}`}
            data-testid={`dot-${habitId}-${i}`}
          />
        ))}
      </div>
      <span className={cn("text-[9px] font-bold tabular-nums", rateColor)} data-testid={`text-rate-${habitId}`}>
        {rate}%
      </span>
    </div>
  );
}

function HabitCard({ habit, gravityScores, habitStreaks, habitLogMap, onEdit, onDelete }: { habit: Habit, gravityScores: GravityMap, habitStreaks: Map<string, import('@/lib/streakEngine').StreakInfo>, habitLogMap: HabitLogMap, onEdit: () => void, onDelete: () => void }) {
  const { updateHabit } = useStore();
  const gravity = gravityScores.get(habit.id);
  const gravityColor = gravity?.label === 'High leverage' ? 'text-emerald-600 bg-emerald-500/10' : gravity?.label === 'Medium' ? 'text-amber-600 bg-amber-500/10' : 'text-muted-foreground bg-muted/30';
  const streak = habitStreaks.get(habit.id);
  const next = streak && streak.currentStreak > 0 ? getNextMilestone(streak.currentStreak) : null;
  return (
    <Card className={cn("bg-card border-none shadow-sm rounded-2xl transition-all active:scale-[0.98]", habit.isPaused && "opacity-50 grayscale")} data-testid={`card-habit-${habit.id}`}>
      <div className="p-4 flex justify-between items-start gap-3">
        <div className="flex-1 space-y-1.5" onClick={onEdit}>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-foreground">{habit.title}</h4>
            {streak && streak.currentStreak >= 2 && (
              <Badge className="text-[8px] h-3.5 px-1.5 bg-orange-500/10 text-orange-600 border-none font-bold uppercase" data-testid={`badge-streak-hub-${habit.id}`}>
                🔥 {getStreakLabel(streak.currentStreak)}
              </Badge>
            )}
            {habit.isMicro && <Badge className="text-[8px] h-3.5 px-1 bg-secondary/10 text-secondary border-none font-bold uppercase" data-testid={`badge-micro-${habit.id}`}>Micro</Badge>}
            {habit.isKeystone && <Badge className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary border-none font-bold uppercase">Keystone</Badge>}
            {habit.isPaused && <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-bold uppercase">Paused</Badge>}
            {gravity && gravity.score > 0 && (
              <Badge className={cn("text-[8px] h-3.5 px-1.5 border-none font-bold uppercase", gravityColor)} data-testid={`badge-gravity-${habit.id}`}>
                {gravity.label === 'High leverage' ? '⬆ High Leverage' : gravity.label === 'Medium' ? '● Medium' : '○ Low'} · {gravity.score}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <Zap size={10} className="text-amber-500" /> If {habit.trigger}
            <span className="text-[9px] opacity-60">· {habit.schedule}</span>
          </p>
          {habit.fallback ? (
            <p className="text-[10px] text-secondary font-medium flex items-center gap-1" data-testid={`text-fallback-${habit.id}`}>
              <ArrowRight size={9} /> Min: {habit.fallback}
            </p>
          ) : null}
          <HabitProgressDots habitId={habit.id} habitLogMap={habitLogMap} />
          {streak && streak.currentStreak > 0 && next && (
            <p className="text-[10px] text-orange-500/60 font-medium" data-testid={`text-next-milestone-${habit.id}`}>
              {next.emoji} {next.label} in {next.days - streak.currentStreak}d · Best: {streak.longestStreak}d
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground rounded-full" onClick={(e) => { e.stopPropagation(); updateHabit(habit.id, { isPaused: !habit.isPaused }); hapticMedium(); toast.success(habit.isPaused ? "Habit resumed" : "Habit paused"); }} data-testid={`button-pause-${habit.id}`}>
            {habit.isPaused ? <Play size={16} /> : <Pause size={16} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={(e) => { e.stopPropagation(); onDelete(); }} data-testid={`button-delete-${habit.id}`}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </Card>
  )
}