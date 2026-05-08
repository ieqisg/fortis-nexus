"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { UserAuth } from "./context/authContext";
type Role = "mentor" | "mentee";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getEmailByGroupName } from "@/lib/actions/authActions";
import { supabase } from "@/app/config/supabaseClient";
export default function Home() {
    const [role, setRole] = useState<Role>("mentee");
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false)
    const [groupName, setGroupName] = useState("")
    const { userData, signIn, setUserData, getUser } = UserAuth()
    const { email, password } = userData

    const placeholders = {
        mentor: {
            email: "mentor@example.com",
            password: "Enter your mentor password",
            title: "Welcome Back, Mentor",
            description: "Sign in to guide and inspire your mentees",
        },
        mentee: {
            email: "mentee@example.com",
            password: "Enter your mentee password",
            title: "Welcome Back, Mentee",
            description: "Sign in to continue your learning journey",
        },
    };

    const currentPlaceholders = placeholders[role];

    const isMentor = role === "mentor";

    const theme = isMentor
        ? {
            card: "bg-gradient-to-br from-blue-50 to-indigo-50",
            text: "text-blue-700",
            button:
                "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-200/50 hover:shadow-blue-300/50",
            focus: "focus:border-blue-400 focus:ring-blue-400/20",
            logo: "from-blue-500 to-indigo-500 shadow-blue-200",
            link: "text-blue-600 hover:text-blue-700",
        }
        : {
            card: "bg-gradient-to-br from-green-50 to-emerald-50",
            text: "text-green-700",
            button:
                "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-200/50 hover:shadow-green-300/50",
            focus: "focus:border-green-400 focus:ring-green-400/20",
            logo: "from-green-500 to-emerald-500 shadow-green-200",
            link: "text-green-600 hover:text-green-700",
        };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            setLoading(true)

            if (role === "mentee") {
                if (!groupName.trim() || !password) return
                const result = await getEmailByGroupName(groupName)
                if (!result.success) {
                    toast.error(result.message)
                    return
                }
                const { error } = await supabase.auth.signInWithPassword({ email: result.email!, password })
                if (error) {
                    toast.error("Incorrect password.")
                    return
                }
                router.push("/mentee/mentee-dashboard")
                return
            }

            if (!email || !password) return
            const userSignIn = await signIn()
            if (!userSignIn.success) return
            const userRole = userSignIn?.data?.role
            if (userRole === "mentor") {
                router.push("/mentor/mentor-dashboard")
            } else if (userRole === "admin") {
                router.push("/admin")
            } else {
                toast.error("Unknown role")
            }

        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }

    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 flex items-center justify-center p-4">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000" />
            </div>

            <Card
                className={`w-full max-w-md relative backdrop-blur-sm border-0 shadow-2xl transition-all duration-300 ${theme.card}`}
            >
                <CardHeader className="text-center pb-2">
                    {/* Logo / Brand */}
                    <div
                        className={`mx-auto mb-4 w-12 h-12 bg-gradient-to-br ${theme.logo} rounded-xl flex items-center justify-center shadow-lg transition-all duration-300`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                        </svg>
                    </div>

                    {/* Role Toggle */}
                    <div className="relative mx-auto mb-4 bg-white/70 rounded-full p-1 flex w-64 shadow-inner">
                        <div
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-md transition-all duration-300 ease-in-out ${isMentor
                                ? "left-1 bg-blue-100"
                                : "left-[calc(50%+2px)] bg-green-100"
                                }`}
                        />
                        <button
                            onClick={() => setRole("mentor")}
                            className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${isMentor
                                ? "text-blue-700"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Mentor
                        </button>
                        <button
                            onClick={() => setRole("mentee")}
                            className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${!isMentor
                                ? "text-green-700"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Mentee
                        </button>
                    </div>

                    <div className="transition-all duration-300">
                        <CardTitle
                            className={`text-2xl font-bold transition-all duration-300 ${theme.text}`}
                        >
                            {currentPlaceholders.title}
                        </CardTitle>

                        <CardDescription className="text-slate-500 mt-1 transition-all duration-300">
                            {currentPlaceholders.description}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isMentor ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={currentPlaceholders.email}
                                        value={email}
                                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                                        className={`h-11 border-slate-200 transition-all duration-200 ${theme.focus}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={currentPlaceholders.password}
                                            value={password}
                                            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                            className={`h-11 border-slate-200 transition-all duration-200 pr-12 ${theme.focus}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5 text-slate-500" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-slate-500" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="groupName" className="text-slate-700 font-medium">Group Name</Label>
                                    <Input
                                        id="groupName"
                                        type="text"
                                        placeholder="Enter your group name"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className={`h-11 border-slate-200 transition-all duration-200 ${theme.focus}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="menteePassword" className="text-slate-700 font-medium">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="menteePassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                            className={`h-11 border-slate-200 transition-all duration-200 pr-12 ${theme.focus}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5 text-slate-500" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-slate-500" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}

                        <Button
                            type="submit"
                            className={`w-full h-11 text-white font-medium shadow-lg transition-all duration-200 hover:shadow-xl ${theme.button}`}
                            disabled={loading}
                        >
                            {loading
                                ? `Signing In as ${isMentor ? "Mentor" : "Mentee"}...`
                                : `Sign In as ${isMentor ? "Mentor" : "Mentee"}`
                            }

                        </Button>
                    </form>
                    {/* Register link - only visible for Mentee */}
                    <div
                        className={`mt-6 text-center transition-all duration-300 overflow-hidden ${!isMentor
                            ? "max-h-20 opacity-100"
                            : "max-h-0 opacity-0"
                            }`}
                    >
                        <p className="text-sm text-slate-500">
                            Don't have an account?{" "}
                            <a
                                href="./register/mentee-register/"
                                className={`${theme.link} font-medium hover:underline transition-colors duration-200`}
                            >
                                Register as Mentee
                            </a>
                        </p>
                    </div>

                    {/* Forgot password link — only for mentor */}
                    {isMentor && (
                        <div className="mt-4 text-center">
                            <a
                                href="#forgot"
                                className="text-sm text-slate-400 hover:text-slate-600 transition-colors duration-200"
                            >
                                Forgot your password?
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
