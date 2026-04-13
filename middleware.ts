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

    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    const path = request.nextUrl.pathname;

    const [{ data: menteeData }, { data: mentorData }] = await Promise.all([
        supabase.from("MENTEE_GROUPS").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("mentor").select("role, profile_completed").eq("id", user.id).maybeSingle(),
    ])



    const role = menteeData?.role || mentorData?.role;
    console.log("role:", role)

    if (!role) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (path.startsWith("/mentee") && role !== "mentee") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (path.startsWith("/mentor") && role !== "mentor") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (role === "mentor") {
        if (path.startsWith("/mentor/complete-profile")) {
            if (mentorData?.profile_completed) {
                return NextResponse.redirect(new URL("/mentor-dashboard", request.url))
            }
        } else {
            if (!mentorData?.profile_completed) {
                return NextResponse.redirect(new URL("/mentor/complete-profile", request.url))
            }
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/mentee-dashboard/:path*",
        "/mentor-dashboard/:path*",
        "/mentor/:path*",
    ],
};
