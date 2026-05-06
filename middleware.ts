import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const response = NextResponse.next()
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
    const path = request.nextUrl.pathname

    if (user && (path === "/" || path === "/login" || path === "/register")) {
        const [{ data: menteeData }, { data: mentorData }, { data: adminData }] = await Promise.all([
            supabase.from("MENTEE_GROUPS").select("role").eq("id", user.id).maybeSingle(),
            supabase.from("mentor").select("role, profile_completed").eq("id", user.id).maybeSingle(),
            supabase.from("admin").select("role").eq("id", user.id).maybeSingle(),
        ])

        const role = menteeData?.role || mentorData?.role || adminData?.role

        if (role === "mentee") return NextResponse.redirect(new URL("/mentee/mentee-dashboard", request.url))
        if (role === "mentor") {
            if (!mentorData?.profile_completed) {
                return NextResponse.redirect(new URL("/mentor/complete-profile", request.url))
            }
            return NextResponse.redirect(new URL("/mentor/mentor-dashboard", request.url))
        }
        if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url))
    }

    if (!user && (
        path.startsWith("/mentee-dashboard") ||
        path.startsWith("/mentor-dashboard") ||
        path.startsWith("/mentor/") ||
        path.startsWith("/admin")
    )) {
        return NextResponse.redirect(new URL("/", request.url))
    }

    if (user) {
        const [{ data: menteeData }, { data: mentorData }, { data: adminData }] = await Promise.all([
            supabase.from("MENTEE_GROUPS").select("role").eq("id", user.id).maybeSingle(),
            supabase.from("mentor").select("role, profile_completed").eq("id", user.id).maybeSingle(),
            supabase.from("admin").select("role").eq("id", user.id).maybeSingle(),
        ])

        const role = menteeData?.role || mentorData?.role || adminData?.role

        if (!role) {
            return NextResponse.redirect(new URL("/unauthorized", request.url))
        }

        if (path.startsWith("/mentee") && role !== "mentee") {
            return NextResponse.redirect(new URL("/unauthorized", request.url))
        }
        if (path.startsWith("/mentor") && role !== "mentor") {
            return NextResponse.redirect(new URL("/unauthorized", request.url))
        }
        if (path.startsWith("/admin") && role !== "admin") {
            return NextResponse.redirect(new URL("/unauthorized", request.url))
        }

        if (role === "mentor") {
            if (path.startsWith("/mentor/complete-profile")) {
                if (mentorData?.profile_completed) {
                    return NextResponse.redirect(new URL("/mentor/mentor-dashboard", request.url))
                }
            } else {
                if (!mentorData?.profile_completed) {
                    return NextResponse.redirect(new URL("/mentor/complete-profile", request.url))
                }
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        "/",
        "/login",
        "/register",
        "/mentee-dashboard/:path*",
        "/mentor-dashboard/:path*",
        "/mentee/:path",
        "/mentor/:path*",
        "/admin/:path*",
    ],
}
