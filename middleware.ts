import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function getRole(supabase: ReturnType<typeof createServerClient>, userId: string) {
    const [{ data: menteeData }, { data: mentorData }, { data: adminData }] = await Promise.all([
        supabase.from("MENTEE_GROUPS").select("role").eq("id", userId).maybeSingle(),
        supabase.from("mentor").select("role, profile_completed").eq("id", userId).maybeSingle(),
        supabase.from("admin").select("role").eq("id", userId).maybeSingle(),
    ])
    return {
        role: menteeData?.role || mentorData?.role || adminData?.role,
        profileCompleted: mentorData?.profile_completed,
    }
}

export async function middleware(request: NextRequest) {
    const response = NextResponse.next()
    const path = request.nextUrl.pathname

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

    // getSession reads from the cookie — no network call, safe in Edge Runtime.
    // getUser() makes a live auth server request which can crash Edge middleware.
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

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
        const { role, profileCompleted } = await getRole(supabase, user.id)

        if (path === "/" || path === "/login" || path === "/register") {
            if (role === "mentee") return NextResponse.redirect(new URL("/mentee/mentee-dashboard", request.url))
            if (role === "mentor") {
                if (!profileCompleted) return NextResponse.redirect(new URL("/mentor/complete-profile", request.url))
                return NextResponse.redirect(new URL("/mentor/mentor-dashboard", request.url))
            }
            if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url))
        }

        if (!role) return NextResponse.redirect(new URL("/unauthorized", request.url))

        if (path.startsWith("/mentee") && role !== "mentee") return NextResponse.redirect(new URL("/unauthorized", request.url))
        if (path.startsWith("/mentor") && role !== "mentor") return NextResponse.redirect(new URL("/unauthorized", request.url))
        if (path.startsWith("/admin") && role !== "admin") return NextResponse.redirect(new URL("/unauthorized", request.url))

        if (role === "mentor") {
            if (path.startsWith("/mentor/complete-profile")) {
                if (profileCompleted) return NextResponse.redirect(new URL("/mentor/mentor-dashboard", request.url))
            } else {
                if (!profileCompleted) return NextResponse.redirect(new URL("/mentor/complete-profile", request.url))
            }
        }
    } catch {
        // If DB lookup fails, pass through rather than crash
        return response
    }

    return response
}

export const config = {
    matcher: [
        "/",
        "/login",
        "/register",
        "/reset-password",
        "/mentee-dashboard/:path*",
        "/mentor-dashboard/:path*",
        "/mentee/:path*",
        "/mentor/:path*",
        "/admin/:path*",
    ],
}
