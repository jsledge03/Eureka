export function hapticLight(): void {
  try { navigator?.vibrate?.(10); } catch {}
}

export function hapticMedium(): void {
  try { navigator?.vibrate?.(20); } catch {}
}

export function hapticSuccess(): void {
  try { navigator?.vibrate?.([10, 30, 10]); } catch {}
}

export function hapticWarning(): void {
  try { navigator?.vibrate?.([30, 50, 30]); } catch {}
}

export function hapticAchievement(): void {
  try { navigator?.vibrate?.([10, 30, 10, 30, 40]); } catch {}
}
