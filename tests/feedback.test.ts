import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

type FakeUser = { id: string; email?: string; app_metadata: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null;
const ADMIN: FakeUser = { id: "admin-1", email: "admin@test.dev", app_metadata: { role: "superadmin" } };
const USER: FakeUser = { id: "user-1", email: "ana@test.dev", app_metadata: {}, user_metadata: { role: "superadmin" } };
const ID = "33333333-3333-4333-8333-333333333333";

let currentUser: FakeUser = USER;

vi.mock("@/lib/auth", async (original) => ({
  ...(await original<typeof import("@/lib/auth")>()),
  getApiUser: async () => ({ user: currentUser, supabase: { from: () => ({ select: () => ({ order: () => ({ range: async () => ({ data: [], error: null }) }) }) }) } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
  useRouter: () => ({ refresh: () => {} }),
  usePathname: () => "/dashboard",
}));

const rpc = vi.fn<(fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>>();
const updates: Record<string, unknown>[] = [];
const filters: [string, string][] = [];
let updatedRow: { id: string } | null = { id: ID };
let listed: Record<string, unknown>[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc,
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: `${id}@test.dev` } } }) } },
    from: () => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.update = (row: Record<string, unknown>) => {
        updates.push(row);
        return q;
      };
      q.eq = (column: string, value: string) => {
        filters.push([column, value]);
        return q;
      };
      q.order = () => q;
      q.range = async () => ({ data: listed, count: listed.length, error: null });
      q.maybeSingle = async () => ({ data: updatedRow, error: null });
      return q;
    },
  }),
}));

const nfFeedback = vi.fn<(item: Record<string, unknown>, maxWaitMs: number) => Promise<boolean>>();
vi.mock("@/lib/analytics/nexforge-client.cjs", () => ({
  createNexforge: () => ({ enabled: true, feedback: nfFeedback, track: () => {}, flush: async () => {} }),
}));

const CREATED = "2026-11-05T10:00:00.000Z";

async function submit(body: unknown) {
  const { POST } = await import("@/app/api/feedback/route");
  const res = await POST(new Request("http://localhost/api/feedback", { method: "POST", body: JSON.stringify(body) }), {});
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function patchStatus(body: unknown, id = ID) {
  const { PATCH } = await import("@/app/api/admin/feedback/[id]/route");
  const res = await PATCH(new Request(`http://localhost/api/admin/feedback/${id}`, { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function adminPage(searchParams: Record<string, string> = {}) {
  const { default: Page } = await import("@/app/(app)/admin/feedback/page");
  return Page({ searchParams: Promise.resolve(searchParams) });
}

beforeEach(() => {
  currentUser = USER;
  updatedRow = { id: ID };
  listed = [];
  updates.length = 0;
  filters.length = 0;
  rpc.mockReset();
  rpc.mockResolvedValue({ data: { id: ID, created_at: CREATED }, error: null });
  nfFeedback.mockReset();
  nfFeedback.mockResolvedValue(true);
});

describe("POST /api/feedback validation", () => {
  it("requires a session", async () => {
    currentUser = null;
    expect((await submit({ kind: "problem", message: "x" })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown kind", { kind: "other", message: "x" }],
    ["no kind", { message: "x" }],
    ["an empty message", { kind: "problem", message: "" }],
    ["a blank message", { kind: "problem", message: " \n\t " }],
    ["a message over 4000 characters", { kind: "problem", message: "a".repeat(4001) }],
    ["a NUL character", { kind: "problem", message: "a\0b" }],
    ["a non-text message", { kind: "problem", message: 5 }],
  ])("rejects %s", async (_name, body) => {
    expect((await submit(body)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(nfFeedback).not.toHaveBeenCalled();
  });

  it("trims before measuring: 4000 characters plus spaces is accepted", async () => {
    expect((await submit({ kind: "suggestion", message: `  ${"a".repeat(4000)}  ` })).status).toBe(200);
    expect((rpc.mock.calls[0][1].p_message as string).length).toBe(4000);
  });

  it("answers with the feedback-specific message when the hourly limit is reached", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "rate_limited" } });
    const res = await submit({ kind: "problem", message: "x" });
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: "rate_limited", detail: "feedback_limit" });
    expect(nfFeedback).not.toHaveBeenCalled();
  });
});

describe("POST /api/feedback saving and forwarding", () => {
  it("saves first, for the session's user, with a limit of 10 per hour", async () => {
    const order: string[] = [];
    rpc.mockImplementation(async () => {
      order.push("db");
      return { data: { id: ID, created_at: CREATED }, error: null };
    });
    nfFeedback.mockImplementation(async () => {
      order.push("nexforge");
      return true;
    });
    expect((await submit({ kind: "problem", message: " Quebrou ", page: "/jobs", userId: "someone-else" })).status).toBe(200);
    expect(order).toEqual(["db", "nexforge"]);
    expect(rpc).toHaveBeenCalledWith("submit_product_feedback", { p_user: "user-1", p_kind: "problem", p_message: "Quebrou", p_page: "/jobs", p_per_hour: 10 });
  });

  it("sends the panel the row id and path, never the author's identity", async () => {
    await submit({ kind: "suggestion", message: "Mais modelos", page: "/resumes/1?token=secret#x" });
    expect(nfFeedback).toHaveBeenCalledWith({ externalId: ID, kind: "suggestion", message: "Mais modelos", page: "/resumes/1", occurredAt: new Date(CREATED) }, 2500);
    const sent = JSON.stringify(nfFeedback.mock.calls[0][0]);
    expect(sent).not.toContain("user-1");
    expect(sent).not.toContain("ana@test.dev");
    expect(sent).not.toContain("secret");
  });

  it("a panel failure never fails the request", async () => {
    nfFeedback.mockRejectedValue(new Error("panel down"));
    expect((await submit({ kind: "problem", message: "x" })).status).toBe(200);
    nfFeedback.mockResolvedValue(false);
    expect((await submit({ kind: "problem", message: "x" })).status).toBe(200);
  });

  it("does not reach the panel when saving fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    expect((await submit({ kind: "problem", message: "x" })).status).toBe(500);
    expect(nfFeedback).not.toHaveBeenCalled();
  });
});

describe("data export", () => {
  it("includes the user's own feedback, which their client cannot read under RLS", async () => {
    listed = [{ id: ID, kind: "problem", message: "Quebrou" }];
    const { GET } = await import("@/app/api/account/route");
    const res = await GET(new Request("http://localhost/api/account"), {});
    expect(((await res.json()) as Record<string, unknown>).product_feedback).toEqual(listed);
    expect(filters).toEqual([["user_id", "user-1"]]);
  });
});

describe("cleanPage", () => {
  it.each([
    ["/jobs", "/jobs"],
    ["/analyses/abc?tab=letter#top", "/analyses/abc"],
    ["", ""],
    ["https://evil.example/x", ""],
    ["//evil.example/x", ""],
    ["/a\\b", ""],
    ["/a\nb", ""],
  ])("%j becomes %j", async (raw, clean) => {
    const { cleanPage } = await import("@/lib/feedback");
    expect(cleanPage(raw)).toBe(clean);
  });

  it("fits the column", async () => {
    const { cleanPage } = await import("@/lib/feedback");
    expect(cleanPage(`/${"a".repeat(600)}`)).toHaveLength(500);
  });
});

describe("admin guard", () => {
  it("only app_metadata counts, never the user-editable user_metadata", async () => {
    const { isAdmin } = await import("@/lib/admin");
    expect(isAdmin({ app_metadata: { role: "superadmin" } })).toBe(true);
    expect(isAdmin({ app_metadata: { role: "admin" } })).toBe(false);
    expect(isAdmin({ app_metadata: { provider: "email" } })).toBe(false);
    expect(isAdmin(USER as never)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it.each([
    ["logged out", null],
    ["a regular user", USER],
  ])("the status endpoint answers 404 when %s, and writes nothing", async (_name, user) => {
    currentUser = user;
    expect((await patchStatus({ status: "resolved" })).status).toBe(404);
    expect(updates).toEqual([]);
  });

  it("the page is a 404 for regular users and reads nothing", async () => {
    await expect(adminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(filters).toEqual([]);
  });

  it("the page sends logged-out visitors to the login", async () => {
    currentUser = null;
    await expect(adminPage()).rejects.toThrow("NEXT_REDIRECT /login?next=%2Fadmin%2Ffeedback");
  });
});

describe("admin status endpoint", () => {
  beforeEach(() => {
    currentUser = ADMIN;
  });

  it("changes the status", async () => {
    expect((await patchStatus({ status: "reviewing" })).status).toBe(200);
    expect(updates).toEqual([{ status: "reviewing" }]);
    expect(filters).toEqual([["id", ID]]);
  });

  it("rejects unknown statuses and malformed ids, and answers 404 for missing rows", async () => {
    expect((await patchStatus({ status: "done" })).status).toBe(400);
    expect((await patchStatus({ status: "new" }, "nope")).status).toBe(404);
    expect(updates).toEqual([]);
    updatedRow = null;
    expect((await patchStatus({ status: "new" })).status).toBe(404);
  });
});

describe("admin page", () => {
  beforeEach(() => {
    currentUser = ADMIN;
    listed = [{ id: ID, user_id: "author", kind: "problem", message: "<b>Quebrou</b>", page: "/jobs", status: "new", created_at: CREATED }];
  });

  it("lists the author's e-mail, kind, page and date, with the message as plain text", async () => {
    const html = renderToStaticMarkup((await adminPage()) as ReactElement);
    expect(html).toContain("author@test.dev");
    expect(html).toContain("Problema");
    expect(html).toContain("/jobs");
    expect(html).toContain("05 de nov.");
    expect(html).toContain("&lt;b&gt;Quebrou&lt;/b&gt;");
  });

  it("applies valid filters and ignores anything else", async () => {
    await adminPage({ status: "resolved", kind: "javascript" });
    expect(filters).toEqual([["status", "resolved"]]);
  });

  it("shows the empty state", async () => {
    listed = [];
    expect(renderToStaticMarkup((await adminPage()) as ReactElement)).toContain("Nenhuma mensagem");
  });
});

describe("middleware", () => {
  async function visit(path: string, method = "GET", headers: Record<string, string> = {}) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.doMock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }) }));
    const { middleware } = await import("@/middleware");
    return middleware(new NextRequest(`http://localhost${path}`, { method, headers }));
  }

  it("sends logged-out visitors of /admin to the login", async () => {
    currentUser = null;
    const res = await visit("/admin/feedback");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?next=%2Fadmin%2Ffeedback");
  });

  it("rewrites regular users to a route that does not exist", async () => {
    const res = await visit("/admin/feedback");
    expect(res.headers.get("x-middleware-rewrite")).toContain("/__not-found");
  });

  it("lets admins through, and leaves other routes alone", async () => {
    expect((await visit("/dashboard")).headers.get("x-middleware-rewrite")).toBeNull();
    currentUser = ADMIN;
    expect((await visit("/admin/feedback")).headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("blocks cross-site writes to the feedback endpoint", async () => {
    expect((await visit("/api/feedback", "POST", { origin: "https://evil.example" })).status).toBe(403);
  });
});

describe("balloon texts", () => {
  it("offers the two options in every language", async () => {
    const { dictionaries } = await import("@/lib/i18n/dictionaries");
    expect(dictionaries.pt.feedback).toMatchObject({ suggestion: "Ajude-nos a melhorar", problem: "Reportar um problema" });
    expect(dictionaries.es.feedback).toMatchObject({ suggestion: "Ayúdanos a mejorar", problem: "Reportar un problema" });
    expect(dictionaries.en.feedback).toMatchObject({ suggestion: "Help us improve", problem: "Report a problem" });
  });
});

describe("balloon", () => {
  it("is a labelled button, closed until used", async () => {
    const { createElement } = await import("react");
    const { FeedbackWidget } = await import("@/components/app/FeedbackWidget");
    const html = renderToStaticMarkup(createElement(FeedbackWidget));
    expect(html).toContain('aria-label="Enviar feedback"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("textarea");
  });
});

describe("NexForge SDK feedback()", () => {
  const options = { endpoint: "https://panel.example/api/ingest", ingestKey: "key", pseudonymSecret: "secret" };

  async function sdk() {
    return vi.importActual<typeof import("@/lib/analytics/nexforge-client.cjs")>("@/lib/analytics/nexforge-client.cjs");
  }

  it("posts to /api/feedback, derived from the ingest endpoint", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { createNexforge } = await sdk();
    await expect(createNexforge(options).feedback({ externalId: ID, kind: "problem", message: "x", page: "/jobs", occurredAt: new Date(CREATED) }, 2500)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://panel.example/api/feedback");
    expect(JSON.parse(init.body as string)).toEqual({ external_id: ID, kind: "problem", message: "x", page: "/jobs", occurred_at: CREATED });
    vi.unstubAllGlobals();
  });

  it.each([
    ["/analyses/3f1c0b9e-5d2a-4c11-9a77-0d1e2f3a4b5c", "/analyses/:id"],
    ["/resumes/abc123/versions/7?tab=x#y", "/resumes/:id/versions/:id"],
    ["/jobs", "/jobs"],
    [undefined, ""],
  ])("never sends ids from the path: %s", async (page, sent) => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { createNexforge } = await sdk();
    await createNexforge(options).feedback({ externalId: ID, kind: "problem", message: "x", page });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).page).toBe(sent);
    vi.unstubAllGlobals();
  });

  it("does nothing without the NexForge variables", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { createNexforge } = await sdk();
    await expect(createNexforge({ ...options, endpoint: undefined }).feedback({ externalId: ID, kind: "problem", message: "x" })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("reports network failures instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("down"))));
    const onError = vi.fn();
    const { createNexforge } = await sdk();
    await expect(createNexforge({ ...options, onError }).feedback({ externalId: ID, kind: "problem", message: "x" })).resolves.toBe(false);
    expect(onError).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
