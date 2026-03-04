const API_BASE = "/api";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  if (res.status === 204) return undefined;
  return res.json();
}

export const api = {
  getState: () => request("/state"),

  createIdentity: (data: any) => request("/identities", { method: "POST", body: JSON.stringify(data) }),
  updateIdentity: (id: string, data: any) => request(`/identities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteIdentity: (id: string) => request(`/identities/${id}`, { method: "DELETE" }),

  createGoal: (data: any) => request("/goals", { method: "POST", body: JSON.stringify(data) }),
  updateGoal: (id: string, data: any) => request(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGoal: (id: string) => request(`/goals/${id}`, { method: "DELETE" }),

  createHabit: (data: any) => request("/habits", { method: "POST", body: JSON.stringify(data) }),
  updateHabit: (id: string, data: any) => request(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHabit: (id: string) => request(`/habits/${id}`, { method: "DELETE" }),

  createTask: (data: any) => request("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: string) => request(`/tasks/${id}`, { method: "DELETE" }),

  upsertLog: (data: any) => request("/logs", { method: "POST", body: JSON.stringify(data) }),

  createQuarterPlan: (data: any) => request("/quarter-plans", { method: "POST", body: JSON.stringify(data) }),
  updateQuarterPlan: (id: string, data: any) => request(`/quarter-plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteQuarterPlan: (id: string) => request(`/quarter-plans/${id}`, { method: "DELETE" }),

  createWeeklyCheckIn: (data: any) => request("/weekly-check-ins", { method: "POST", body: JSON.stringify(data) }),

  upsertDailyRhythm: (data: any) => request("/daily-rhythms", { method: "POST", body: JSON.stringify(data) }),

  setSetting: (key: string, value: any) => request(`/settings/${key}`, { method: "POST", body: JSON.stringify({ value }) }),
};
