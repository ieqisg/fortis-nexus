import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const ROLE_CACHE_COOKIE = "x-role-cache";
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type RoleCache = {
    uid: string;
    role: string | undefined;
    profileCompleted: boolean | undefined;
    isMentorAdmin: boolean;
    exp: number;
};

function signRoleCache(data: RoleCache, secret: string): string {
    const payload = JSON.stringify(data);
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    return Buffer.from(payload).toString("base64url") + "." + sig;
}

function verifyRoleCache(value: string, secret: string): RoleCache | null {
    const dot = value.indexOf(".");
    if (dot === -1) return null;
    const b64 = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    try {
        const payload = Buffer.from(b64, "base64url").toString("utf8");
        const expected = createHmac("sha256", secret).update(payload).digest("hex");
        if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
        return JSON.parse(payload) as RoleCache;
    } catch {
        return null;
    }
}

async function getRole(supabase: ReturnType<typeof createServerClient>, userId: string) {
    const [{ data: menteeData }, { data: mentorData }, { data: adminData }] = await Promise.all([
        supabase.from("MENTEE_GROUPS").select("role").eq("id", userId).maybeSingle(),
        supabase.from("mentor").select("role, profile_completed, is_admin").eq("id", userId).maybeSingle(),
        supabase.from("admin").select("role").eq("id", userId).maybeSingle(),
    ])
    return {
        role: menteeData?.role || mentorData?.role || adminData?.role,
        profileCompleted: mentorData?.profile_completed,
        isMentorAdmin: mentorData?.is_admin === true,
    }
}

export async function proxy(request: NextRequest) {
    const response = NextResponse.next()
    const path = request.nextUrl.pathname

    if (path.startsWith("/_next/") || path === "/favicon.ico") return response

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        if (
            path.startsWith("/mentee/") ||
            path.startsWith("/mentor/") ||
            path.startsWith("/admin")
        ) {
            return NextResponse.redirect(new URL("/", request.url))
        }
        return response
    }

    try {
        let role: string | undefined;
        let profileCompleted: boolean | undefined;
        let isMentorAdmin: boolean;

        const secret = process.env.ROLE_CACHE_SECRET;
        const cached = secret ? request.cookies.get(ROLE_CACHE_COOKIE) : null;
        const cachedData = cached && secret ? verifyRoleCache(cached.value, secret) : null;

        if (cachedData && cachedData.uid === user.id && cachedData.exp > Date.now()) {
            role = cachedData.role;
            profileCompleted = cachedData.profileCompleted;
            isMentorAdmin = cachedData.isMentorAdmin;
        } else {
            ({ role, profileCompleted, isMentorAdmin } = await getRole(supabase, user.id));
            if (secret) {
                const cacheValue = signRoleCache(
                    { uid: user.id, role, profileCompleted, isMentorAdmin, exp: Date.now() + ROLE_CACHE_TTL_MS },
                    secret
                );
                response.cookies.set(ROLE_CACHE_COOKIE, cacheValue, {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    maxAge: ROLE_CACHE_TTL_MS / 1000,
                });
            }
        }

        if (path === "/" || path === "/login" || path === "/register") {
            if (role === "mentee") return NextResponse.redirect(new URL("/mentee/mentee-dashboard", request.url))
            if (role === "mentor") {
                // Mentor-admins skip profile completion and go straight to admin
                if (isMentorAdmin) return NextResponse.redirect(new URL("/admin", request.url))
                if (!profileCompleted) return NextResponse.redirect(new URL("/mentor/complete-profile", request.url))
                return NextResponse.redirect(new URL("/mentor/mentor-dashboard", request.url))
            }
            if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url))
        }

        if (!role) {
            const publicPaths = ["/", "/login", "/register", "/reset-password"]
            if (!publicPaths.includes(path)) return NextResponse.redirect(new URL("/", request.url))
            return response
        }

        if (path.startsWith("/mentee") && role !== "mentee") return NextResponse.redirect(new URL("/", request.url))
        if (path.startsWith("/mentor") && role !== "mentor") return NextResponse.redirect(new URL("/", request.url))
        // Allow mentor-admins to access /admin paths without having the "admin" table role
        if (path.startsWith("/admin") && role !== "admin" && !isMentorAdmin) return NextResponse.redirect(new URL("/", request.url))

        if (role === "mentor" && path.startsWith("/mentor")) {
            if (path.startsWith("/mentor/complete-profile")) {
                if (profileCompleted) return NextResponse.redirect(new URL("/mentor/mentor-dashboard", request.url))
            } else {
                if (!profileCompleted) return NextResponse.redirect(new URL("/mentor/complete-profile", request.url))
            }
        }
    } catch {
        return response
    }

    return response
}

export const proxyConfig = {
    runtime: 'nodejs',
    matcher: [
        "/",
        "/login",
        "/register",
        "/reset-password",
        "/mentee/:path*",
        "/mentor/:path*",
        "/admin/:path*",
    ],
}
