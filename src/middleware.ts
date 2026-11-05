import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin";

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
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
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
