"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, UserRound, Eye, EyeOff, LogOut } from "lucide-react";
import { UserAuth } from "@/app/context/authContext";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "../config/supabaseClient";

export default function Login() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false)
    const { userData, signIn, setUserData, getUser } = UserAuth()
    const { email, password } = userData

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) return;

        try {
            const userSignIn = await signIn()
            if (!userSignIn.success) return;
            const role = userSignIn?.data?.role
            setLoading(true)
            if (role === "mentee") {
                router.push("/mentee/mentee-dashboard")
            } else if (role === "mentor") {
                router.push("/mentor/mentor-dashboard")
            } else if (role === "admin") {
                router.push("/admin")
            } else {
                alert("Unknown role")
            }

        } catch (err) {
            console.error(err)
        }
    }



    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    className="mb-6"
                    onClick={() => router.push("/")}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back To Home
                </Button>
                <Card>
                    <CardHeader>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserRound className="w-10 h-10 text-green-700" />
                        </div>
                        <CardTitle className="text-center text-2xl">Login</CardTitle>
                        <CardDescription className="text-center">
                            Text
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="example@fit.edu.ph"
                                    value={email}
                                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                                />
                            </div>

                            {/* Password Field */}
                            <div>
                                <Label htmlFor="password">Password *</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        required
                                        value={password}
                                        onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                    />
                                    <Button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                                        variant="ghost"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                                <div className="mt-3">
                                    <a
                                        className="text-sm text-decoration-line: underline text-purple-500"
                                        href="https://www.facebook.com/"
                                    >
                                        Forgot Password?
                                    </a>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2 justify-end mt-10">
                                    <Button
                                        type="button"
                                        className="bg-gray-400 hover:bg-green-500"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {loading ? "Signing In..." : "Sign In"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
