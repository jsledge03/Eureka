import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { StreakMilestone } from "@/lib/streakEngine";
import { getNextMilestone } from "@/lib/streakEngine";
import { hapticAchievement } from "@/lib/haptics";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  label?: string;
  currentStreak: number;
  milestone: StreakMilestone;
}

export function StreakCelebration({ open, onClose, title, label, currentStreak, milestone }: Props) {
  const next = getNextMilestone(currentStreak);

  useEffect(() => {
    if (open) hapticAchievement();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs rounded-3xl text-center p-0 overflow-hidden border-none" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pt-10 pb-6 px-6">
          <div className="text-6xl mb-4 animate-in zoom-in duration-500">{milestone.emoji}</div>
          <h2 className="text-2xl font-serif text-primary mb-1" data-testid="text-streak-milestone">{milestone.label}!</h2>
          <p className="text-sm text-muted-foreground font-medium">{currentStreak}-day streak</p>
        </div>
        <div className="px-6 pb-8 space-y-5">
          <div className="space-y-2">
            {label && <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>}
            <p className="text-xs font-bold uppercase tracking-widest text-primary/60">{title}</p>
            <p className="text-sm text-foreground leading-relaxed font-medium">{milestone.message}</p>
          </div>
          {next && (
            <div className="p-3 bg-muted/30 rounded-2xl">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Next milestone</p>
              <p className="text-xs font-medium text-foreground">{next.emoji} {next.label} — {next.days - currentStreak} days away</p>
            </div>
          )}
          <Button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg"
            data-testid="button-close-celebration"
          >
            Keep Going
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
