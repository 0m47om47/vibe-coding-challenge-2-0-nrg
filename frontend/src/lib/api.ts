import type {
  AcademyListItem,
  AcademySummary,
  CoachAccount,
  Match,
  Mark,
  PhotoUploadTicket,
  Player,
  PlayerHistory,
  PlayerProfileUpdate,
  PlayerStats,
  PracticeSession,
  ScoutAccount,
  SessionUser,
  Sport,
} from "@/types";

// NEXT_PUBLIC_USE_MOCKS=true runs the whole app on in browser mock data, no backend needed.
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Try again.";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (USE_MOCKS) {
    const { mockRequest } = await import("@/mocks/server");
    const res = await mockRequest(method, path, body);
    const data = res.body as { error?: string; details?: unknown };
    if (res.status >= 400) throw new ApiRequestError(data.error ?? "Something went wrong.", res.status, data.details);
    return res.body as T;
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError("Could not reach the server. Check your connection and try again.", 0);
  }

  let data: { error?: string; details?: unknown } | null = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non JSON body */
  }
  if (!res.ok) {
    throw new ApiRequestError(data?.error ?? "Something went wrong. Try again.", res.status, data?.details);
  }
  return data as T;
}

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ user: SessionUser }>("POST", "/auth/login", { username, password }),
    registerScout: (email: string, password: string, academyId: string) =>
      request<{ ok: true; message: string }>("POST", "/auth/register-scout", { email, password, academyId }),
    registerAcademy: (body: { academyName: string; town?: string; sports: Sport[]; username: string; password: string }) =>
      request<{ user: SessionUser }>("POST", "/auth/register-academy", body),
    logout: () => request<{ ok: true }>("POST", "/auth/logout"),
    me: () => request<{ user: SessionUser }>("GET", "/auth/me"),
  },
  academies: {
    list: () => request<{ academies: AcademyListItem[] }>("GET", "/academies"),
  },
  academy: {
    get: () => request<{ academy: AcademySummary }>("GET", "/academy"),
    update: (body: { name?: string; town?: string | null; sports?: Sport[] }) => request<{ academy: AcademySummary }>("PATCH", "/academy", body),
  },
  coaches: {
    list: () => request<{ coaches: CoachAccount[] }>("GET", "/users/coaches"),
    create: (username: string, password: string) => request<{ coach: CoachAccount }>("POST", "/users/coaches", { username, password }),
    remove: (id: string) => request<{ ok: true }>("DELETE", `/users/coaches/${id}`),
  },
  scouts: {
    list: () => request<{ scouts: ScoutAccount[] }>("GET", "/users/scouts"),
    create: (email: string, password: string) => request<{ scout: ScoutAccount }>("POST", "/users/scouts", { email, password }),
    approve: (id: string) => request<{ scout: ScoutAccount }>("PATCH", `/users/scouts/${id}/approve`),
    remove: (id: string) => request<{ ok: true }>("DELETE", `/users/scouts/${id}`),
  },
  players: {
    list: (sport?: Sport) => request<{ players: PlayerStats[] }>("GET", `/players${qs({ sport })}`),
    get: (id: string) => request<{ player: PlayerStats }>("GET", `/players/${id}`),
    history: (id: string) => request<{ history: PlayerHistory }>("GET", `/players/${id}/history`),
    create: (body: { name: string; age: number; sport: Sport; username: string; password: string }) =>
      request<{ player: Player }>("POST", "/players", body),
    update: (id: string, body: PlayerProfileUpdate) =>
      request<{ player: PlayerStats }>("PATCH", `/players/${id}`, body),
    photoSignature: (id: string) =>
      request<{ ticket: PhotoUploadTicket }>("POST", `/players/${id}/photo-signature`),
  },
  sessions: {
    list: () => request<{ sessions: PracticeSession[] }>("GET", "/sessions"),
    get: (id: string) => request<{ session: PracticeSession }>("GET", `/sessions/${id}`),
    open: (body: { date: string; sport: Sport }) =>
      request<{ session: PracticeSession }>("POST", "/sessions", body),
    mark: (id: string, marks: { playerId: string; mark: Mark }[]) =>
      request<{ session: PracticeSession }>("PATCH", `/sessions/${id}/attendance`, { marks }),
    close: (id: string) => request<{ session: PracticeSession }>("POST", `/sessions/${id}/close`),
  },
  matches: {
    list: () => request<{ matches: Match[] }>("GET", "/matches"),
    eligible: (date: string, sport: Sport) =>
      request<{ players: Player[] }>("GET", `/matches/eligible${qs({ date, sport })}`),
    create: (body: {
      date: string;
      sport: Sport;
      opponent: string;
      scores: { playerId: string; stats: Record<string, number> }[];
    }) => request<{ match: Match }>("POST", "/matches", body),
  },
};
