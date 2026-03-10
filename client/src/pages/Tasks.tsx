import { useState, useMemo } from "react";
import { Plus, Search, Zap, Trash2, Shield, X, Tag, Pencil, Check } from "lucide-react";
import { useDebounce } from "@/lib/useDebounce";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStore, Task, Domain } from "@/store/useStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from "@/lib/haptics";

export default function Tasks() {
  const { tasks, habits, goals, addTask, updateTask, deleteTask, applyGrace, taskLabels, addTaskLabel, removeTaskLabel, renameTaskLabel, getAllDomains } = useStore();
  const allDomains = getAllDomains();
  const [activeTab, setActiveTab] = useState("today");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [renamingLabel, setRenamingLabel] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingLabel, setDeletingLabel] = useState<string | null>(null);
  
  const todayDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const emptyForm = {
    title: '', energy: 'Medium', emotion: 'Neutral', 
    dueDate: todayDate, priority: 'Medium', labels: [] as string[],
    label: '',
    domain: 'none' as Domain | 'none',
    habitId: 'none', goalId: 'none'
  };
  const [formData, setFormData] = useState(emptyForm);

  const handleSave = () => {
    if (!formData.title) return;
    const taskData = {
      ...formData,
      domain: formData.domain === 'none' ? null : formData.domain,
      habitId: formData.habitId === 'none' ? null : formData.habitId,
      goalId: formData.goalId === 'none' ? null : formData.goalId,
      completed: editingTask ? editingTask.completed : false,
      label: formData.labels[0] ?? '',
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
      hapticLight();
      toast.success("Task updated");
    } else {
      addTask(taskData);
      hapticSuccess();
      toast.success("Task added");
    }
    setIsFormOpen(false);
    setEditingTask(null);
    setFormData(emptyForm);
  };

  const moveToRecovery = (id: string) => {
    applyGrace(id, 'task', todayDate);
    hapticMedium();
    toast.success("Task moved to Recovery Lane");
  };

  const toggleLabel = (label: string) => {
    setFormData(prev => {
      const has = prev.labels.includes(label);
      const newLabels = has ? prev.labels.filter(l => l !== label) : [...prev.labels, label];
      return { ...prev, labels: newLabels, label: newLabels[0] ?? '' };
    });
    hapticLight();
  };

  const debouncedSearch = useDebounce(searchQuery, 200);
  const sq = debouncedSearch.toLowerCase().trim();

  const sortedTasks = useMemo(() => tasks
    .filter(t => filterLabel === "all" || t.labels.includes(filterLabel))
    .filter(t => !sq || t.title.toLowerCase().includes(sq))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.dueDate || '') > (b.dueDate || '') ? 1 : -1;
    }), [tasks, filterLabel, sq]);

  const overdueTasks = useMemo(() => sortedTasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayDate && !t.labels.includes('Recovery')), [sortedTasks, todayDate]);
  const todayTasks = useMemo(() => sortedTasks.filter(t => !t.completed && t.dueDate === todayDate && !t.labels.includes('Recovery')), [sortedTasks, todayDate]);
  const soonTasks = useMemo(() => sortedTasks.filter(t => !t.completed && t.dueDate && t.dueDate > todayDate && !t.labels.includes('Recovery')), [sortedTasks, todayDate]);
  const recoveryTasks = useMemo(() => sortedTasks.filter(t => !t.completed && t.labels.includes('Recovery')), [sortedTasks]);
  const doneTasks = useMemo(() => sortedTasks.filter(t => t.completed), [sortedTasks]);

  const labelUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => t.labels.forEach(l => { counts[l] = (counts[l] || 0) + 1; }));
    return counts;
  }, [tasks]);

  const openForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        ...task,
        labels: task.labels ?? (task.label ? [task.label] : []),
        dueDate: task.dueDate || '',
        domain: task.domain || 'none',
        habitId: task.habitId || 'none',
        goalId: task.goalId || 'none'
      });
    } else {
      setEditingTask(null);
      setFormData(emptyForm);
    }
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="pt-6 pb-1 flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</p>
          <h1 className="text-3xl font-serif text-primary mt-1">Task Engine</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIsLabelManagerOpen(true); hapticLight(); }}
            className="rounded-full h-10 w-10 min-h-[44px] min-w-[44px] bg-muted/30 text-muted-foreground"
            data-testid="button-label-manager"
          >
            <Tag size={18} />
          </Button>
          <Button data-testid="button-add-task" onClick={() => openForm()} size="icon" className="rounded-full h-11 w-11 min-h-[44px] min-w-[44px] bg-primary shadow-md">
            <Plus size={22} />
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            data-testid="input-search-tasks"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 pl-9 bg-muted/30 border-none rounded-xl text-sm"
          />
        </div>
        <Select value={filterLabel} onValueChange={setFilterLabel}>
          <SelectTrigger className="w-auto min-w-[100px] h-10 rounded-xl bg-muted/30 border-none text-[10px] font-bold uppercase shrink-0" data-testid="select-filter-label">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {taskLabels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 bg-muted/30 p-1 rounded-2xl h-12">
          <TabsTrigger value="overdue" className="rounded-xl text-[10px] uppercase font-bold relative" data-testid="tab-overdue">
            Past {overdueTasks.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[8px] flex items-center justify-center animate-pulse">{overdueTasks.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="today" className="rounded-xl text-[10px] uppercase font-bold" data-testid="tab-today">Today</TabsTrigger>
          <TabsTrigger value="soon" className="rounded-xl text-[10px] uppercase font-bold" data-testid="tab-soon">Soon</TabsTrigger>
          <TabsTrigger value="recovery" className="rounded-xl text-[10px] uppercase font-bold text-secondary flex items-center gap-1" data-testid="tab-recovery"><Shield size={10}/> Recovery</TabsTrigger>
          <TabsTrigger value="done" className="rounded-xl text-[10px] uppercase font-bold" data-testid="tab-done">Done</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-4">
          <TabsContent value="overdue" className="space-y-3">
            {overdueTasks.length === 0 ? <EmptyState text="Clean slate! No overdue tasks." /> : 
              overdueTasks.map(t => <TaskCard key={t.id} task={t} onEdit={() => openForm(t)} onRecover={() => moveToRecovery(t.id)} />)}
          </TabsContent>
          <TabsContent value="today" className="space-y-3">
            {todayTasks.length === 0 ? <EmptyState text="Everything set for today." /> : 
              todayTasks.map(t => <TaskCard key={t.id} task={t} onEdit={() => openForm(t)} onRecover={() => moveToRecovery(t.id)} />)}
          </TabsContent>
          <TabsContent value="soon" className="space-y-3">
            {soonTasks.length === 0 ? <EmptyState text="No upcoming tasks." /> : 
              soonTasks.map(t => <TaskCard key={t.id} task={t} onEdit={() => openForm(t)} onRecover={() => moveToRecovery(t.id)} />)}
          </TabsContent>
          <TabsContent value="recovery" className="space-y-3">
            {recoveryTasks.length === 0 ? <EmptyState text="No tasks in recovery." /> : 
              recoveryTasks.map(t => <TaskCard key={t.id} task={t} onEdit={() => openForm(t)} />)}
          </TabsContent>
          <TabsContent value="done" className="space-y-3">
            {doneTasks.length === 0 ? <EmptyState text="Complete your first task!" /> : 
              doneTasks.map(t => <TaskCard key={t.id} task={t} onEdit={() => openForm(t)} />)}
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="font-serif text-xl">{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">What needs doing?</label>
              <Input data-testid="input-task-title" placeholder="e.g., Review quarterly budget" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="h-12 bg-muted/30 border-none rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Energy</label>
                <Select value={formData.energy} onValueChange={v => setFormData({...formData, energy: v})}>
                  <SelectTrigger className="bg-muted/30 border-none rounded-xl h-11" data-testid="select-energy"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Low', 'Medium', 'High'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Due Date</label>
                <Input data-testid="input-due-date" type="date" value={formData.dueDate || ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="h-11 bg-muted/30 border-none rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Priority</label>
                <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                  <SelectTrigger className="bg-muted/30 border-none rounded-xl h-11" data-testid="select-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Low', 'Medium', 'High'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Domain</label>
                <Select value={formData.domain} onValueChange={v => setFormData({...formData, domain: v as Domain | 'none'})}>
                  <SelectTrigger className="bg-muted/30 border-none rounded-xl h-11" data-testid="select-domain"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Domain</SelectItem>
                    {allDomains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Goal</label>
              <Select value={formData.goalId} onValueChange={v => setFormData({...formData, goalId: v})}>
                <SelectTrigger className="bg-muted/30 border-none rounded-xl h-11" data-testid="select-goal"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No Goal</SelectItem>{goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Habit</label>
              <Select value={formData.habitId} onValueChange={v => setFormData({...formData, habitId: v})}>
                <SelectTrigger className="bg-muted/30 border-none rounded-xl h-11" data-testid="select-habit"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No Habit</SelectItem>{habits.map(h => <SelectItem key={h.id} value={h.id}>{h.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Labels</label>
              <div className="flex flex-wrap gap-1.5" data-testid="label-picker">
                {taskLabels.filter(l => l !== 'Recovery').map(l => {
                  const selected = formData.labels.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleLabel(l)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95 min-h-[32px]",
                        selected
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      )}
                      data-testid={`label-toggle-${l}`}
                    >
                      {selected && <Check size={10} className="inline mr-1 -mt-0.5" />}
                      {l}
                    </button>
                  );
                })}
              </div>
              {formData.labels.length === 0 && (
                <p className="text-[10px] text-muted-foreground/60 ml-1">Tap labels to tag this task</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1 h-12 rounded-xl" data-testid="button-cancel-task">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 h-12 rounded-xl bg-primary" data-testid="button-save-task">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isLabelManagerOpen} onOpenChange={setIsLabelManagerOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto overscroll-contain pb-8" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-4">
            <SheetTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Tag size={18} className="text-primary" /> Manage Labels
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Create, rename, or remove labels. Changes apply to all tasks using that label.
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              data-testid="input-new-label"
              placeholder="New label name"
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newLabelName.trim()) {
                  if (taskLabels.includes(newLabelName.trim())) {
                    toast.error("Label already exists");
                    return;
                  }
                  addTaskLabel(newLabelName.trim());
                  setNewLabelName("");
                  hapticSuccess();
                  toast.success("Label created");
                }
              }}
              className="h-11 bg-muted/30 border-none rounded-xl text-sm flex-1"
            />
            <Button
              size="sm"
              className="h-11 px-4 rounded-xl bg-primary"
              data-testid="button-create-label"
              onClick={() => {
                if (!newLabelName.trim()) return;
                if (taskLabels.includes(newLabelName.trim())) {
                  toast.error("Label already exists");
                  return;
                }
                addTaskLabel(newLabelName.trim());
                setNewLabelName("");
                hapticSuccess();
                toast.success("Label created");
              }}
            >
              <Plus size={16} />
            </Button>
          </div>

          <div className="space-y-1.5">
            {taskLabels.map(l => {
              const count = labelUsageCount[l] || 0;
              const isRenaming = renamingLabel === l;
              return (
                <div
                  key={l}
                  className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-border/20 bg-card"
                  data-testid={`label-manage-${l}`}
                >
                  {isRenaming ? (
                    <Input
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && renameValue.trim() && renameValue.trim() !== l) {
                          if (taskLabels.includes(renameValue.trim())) {
                            toast.error("Label already exists");
                            return;
                          }
                          renameTaskLabel(l, renameValue.trim());
                          setRenamingLabel(null);
                          hapticSuccess();
                          toast.success("Label renamed");
                        } else if (e.key === 'Escape') {
                          setRenamingLabel(null);
                        }
                      }}
                      autoFocus
                      className="h-8 text-xs bg-muted/30 border-none rounded-lg flex-1"
                      data-testid={`input-rename-${l}`}
                    />
                  ) : (
                    <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">{l}</span>
                  )}
                  <span className="text-[9px] text-muted-foreground/60 shrink-0">
                    {count} {count === 1 ? 'task' : 'tasks'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isRenaming ? (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => {
                            if (renameValue.trim() && renameValue.trim() !== l) {
                              if (taskLabels.includes(renameValue.trim())) {
                                toast.error("Label already exists");
                                return;
                              }
                              renameTaskLabel(l, renameValue.trim());
                              hapticSuccess();
                              toast.success("Label renamed");
                            }
                            setRenamingLabel(null);
                          }}
                          data-testid={`button-confirm-rename-${l}`}
                        >
                          <Check size={14} className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => setRenamingLabel(null)}
                          data-testid={`button-cancel-rename-${l}`}
                        >
                          <X size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => { setRenamingLabel(l); setRenameValue(l); }}
                          data-testid={`button-rename-${l}`}
                        >
                          <Pencil size={12} className="text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => setDeletingLabel(l)}
                          data-testid={`button-delete-${l}`}
                        >
                          <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="outline" className="w-full h-11 rounded-2xl mt-4 text-xs font-bold"
            onClick={() => setIsLabelManagerOpen(false)} data-testid="button-close-label-manager"
          >
            Done
          </Button>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingLabel} onOpenChange={(open) => { if (!open) setDeletingLabel(null); }}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deletingLabel}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(labelUsageCount[deletingLabel || ''] || 0) > 0
                ? `This label is used on ${labelUsageCount[deletingLabel || ''] || 0} task(s). It will be removed from all of them.`
                : "No tasks are using this label. It will be removed from your label list."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-label">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-label"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingLabel) {
                  removeTaskLabel(deletingLabel);
                  if (filterLabel === deletingLabel) setFilterLabel("all");
                  hapticWarning();
                  toast.success("Label removed");
                }
                setDeletingLabel(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TaskCard({ task, onEdit, onRecover }: { task: Task, onEdit: () => void, onRecover?: () => void }) {
  const { updateTask, deleteTask, goals, habits } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const displayLabels = task.labels.filter(l => l !== 'Recovery');
  const isRecovery = task.labels.includes('Recovery');
  const linkedGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
  const linkedHabit = task.habitId ? habits.find(h => h.id === task.habitId) : null;
  return (
    <>
      <Card data-testid={`card-task-${task.id}`} className={cn("border-none bg-card shadow-sm rounded-2xl overflow-hidden transition-all active:scale-[0.99]", task.completed && "opacity-60")}>
        <div className="p-4 flex items-start gap-3">
          <button
            data-testid={`button-toggle-${task.id}`}
            onClick={() => { updateTask(task.id, { completed: !task.completed }); task.completed ? hapticLight() : hapticSuccess(); }}
            className="mt-0.5 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", task.completed ? "bg-primary border-primary" : "border-muted-foreground/30")}>
              {task.completed && <Zap size={10} className="text-primary-foreground fill-current" />}
            </div>
          </button>
          <div className="flex-1 min-w-0 min-h-[44px] flex flex-col justify-center" onClick={onEdit}>
            <p className={cn("text-sm font-bold truncate tracking-tight", task.completed && "line-through")}>{task.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[7px] font-bold uppercase border-muted-foreground/20 px-1.5 h-4">{task.energy} NRG</Badge>
              {task.priority && task.priority !== 'Medium' && (
                <Badge variant="outline" className={cn("text-[7px] font-bold uppercase px-1.5 h-4", task.priority === 'High' ? "border-destructive/30 text-destructive" : "border-muted-foreground/20")}>{task.priority}</Badge>
              )}
              {task.domain && (
                <Badge variant="outline" className="text-[7px] font-bold uppercase border-primary/20 text-primary/70 px-1.5 h-4">{task.domain}</Badge>
              )}
              {displayLabels.map(l => (
                <Badge key={l} className="text-[7px] bg-muted/50 text-muted-foreground border-none uppercase h-4 px-1.5">{l}</Badge>
              ))}
              {task.dueDate && <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">{task.dueDate === new Date().toLocaleDateString('en-CA') ? 'Today' : task.dueDate}</span>}
              {isRecovery && <Badge className="text-[7px] bg-secondary/10 text-secondary border-none uppercase h-4">Recovery</Badge>}
            </div>
            {(linkedGoal || linkedHabit) && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {linkedGoal && (
                  <Badge className="text-[7px] bg-emerald-500/5 text-emerald-600/70 border-none font-medium h-4 px-1.5" data-testid={`badge-goal-${task.id}`}>
                    → Goal: {linkedGoal.title}
                  </Badge>
                )}
                {linkedHabit && (
                  <Badge className="text-[7px] bg-blue-500/5 text-blue-600/70 border-none font-medium h-4 px-1.5" data-testid={`badge-habit-${task.id}`}>
                    → Habit: {linkedHabit.title}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {onRecover && !task.completed && (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] h-11 w-11 text-secondary/60 rounded-full"
                data-testid={`button-recover-${task.id}`}
                onClick={(e) => { e.stopPropagation(); onRecover(); }}
              >
                <Shield size={16} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] h-11 w-11 text-destructive/40 hover:text-destructive rounded-full"
              data-testid={`button-delete-${task.id}`}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </Card>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{task.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteTask(task.id); hapticWarning(); toast.success("Action removed"); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center space-y-2 opacity-40">
      <Shield size={24} className="mx-auto mb-2 text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest">{text}</p>
    </div>
  );
}
