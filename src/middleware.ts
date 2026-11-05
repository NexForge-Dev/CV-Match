import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin";
import { isAuthOutage } from "@/lib/authOutage";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { timedFetch } from "@/lib/supabase/timedFetch";

const PROTECTED = ["/dashboard", "/new", "/resumes", "/analyses", "/jobs", "/documents", "/profile", "/billing", "/account", "/admin"];

/** Rejects cross-site API writes, refreshes the Supabase session cookie and guards app routes. */
export async function middleware(request: NextRequest) {
  // CSRF defence in depth (cookies are SameSite=Lax): state-changing API calls must come from our own origin.
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if ((origin && origin !== request.nextUrl.origin) || fetchSite === "cross-site") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    global: { fetch: timedFetch() },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  // Auth did not answer, so nothing is known about the session: the page shows the error, not the login form.
  if (isAuthOutage(error)) return response;

  const path = request.nextUrl.pathname;
  // A signed-in user on a new device: start from the language saved in the profile. Once per device.
  if (user && !path.startsWith("/api/") && !request.cookies.has(LOCALE_COOKIE)) {
    const { data } = await supabase.from("profiles").select("ui_locale").maybeSingle();
    if (isLocale(data?.ui_locale)) {
      request.cookies.set(LOCALE_COOKIE, data.ui_locale);
      const refreshed = response.cookies.getAll();
      response = NextResponse.next({ request });
      refreshed.forEach((cookie) => response.cookies.set(cookie));
      response.cookies.set(LOCALE_COOKIE, data.ui_locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
  }
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  // Answered here because (app)/loading.tsx makes the page stream: notFound() there would come with status 200.
  if (user && !isAdmin(user) && (path === "/admin" || path.startsWith("/admin/"))) {
    const notFound = NextResponse.rewrite(new URL("/__not-found", request.url));
    response.cookies.getAll().forEach((cookie) => notFound.cookies.set(cookie));
    return notFound;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
