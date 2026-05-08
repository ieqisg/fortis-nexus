"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { supabase } from "@/app/config/supabaseClient"
import { toast } from "sonner"

export default function ResetPasswordPage() {
    const router = useRouter()

    const [ready, setReady] = useState(false)
    const [invalid, setInvalid] = useState(false)
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [saving, setSaving] = useState(false)

    const isLengthValid = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*\-_]/.test(password)
    const isStrong = isLengthValid && hasUppercase && hasNumber && hasSpecial
    const matches = password === confirm && confirm !== ""

    useEffect(() => {
        // Supabase fires PASSWORD_RECOVERY when it detects the recovery token
        // in the URL hash (#access_token=...&type=recovery) — implicit flow.
        // This works regardless of which browser opens the link.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === "PASSWORD_RECOVERY") {
                    setReady(true)
                }
            }
        )

        // If the URL has no recovery hash at all, mark invalid immediately.
        const hash = typeof window !== "undefined" ? window.location.hash : ""
        const params = new URLSearchParams(hash.slice(1))
        if (params.get("type") !== "recovery") {
            setInvalid(true)
        }

        return () => subscription.unsubscribe()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isStrong || !matches) return
        setSaving(true)

        const { error } = await supabase.auth.updateUser({ password })
        setSaving(false)

        if (error) {
            toast.error("Could not update password. Please request a new link.")
            return
        }

        await supabase.auth.signOut()
        toast.success("Password updated! Please sign in with your new password.")
        router.push("/")
    }

    const renderCheck = (valid: boolean) => (
        <span className={`flex items-center gap-1 ${valid ? "text-green-600" : "text-slate-400"}`}>
            {valid && <Check className="w-4 h-4" />}
        </span>
    )

    // ── Invalid link ────────────────────────────────────────────────────────
    if (invalid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-0">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl text-red-600">Link expired or invalid</CardTitle>
                        <CardDescription className="mt-1">
                            This password reset link is no longer valid. Please request a new one from the login page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => router.push("/")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Back to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── Waiting for Supabase to process the hash ────────────────────────────
    if (!ready) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-slate-500">Verifying reset link…</p>
                </div>
            </div>
        )
    }

    // ── Password form ───────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold text-indigo-700">Set new password</CardTitle>
                    <CardDescription className="text-slate-500 mt-1">
                        Choose a strong password for your account.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative mt-1">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                                </Button>
                            </div>
                            <ul className="mt-2 text-sm space-y-1">
                                <li className="flex items-center gap-1">{renderCheck(isLengthValid)} At least 8 characters</li>
                                <li className="flex items-center gap-1">{renderCheck(hasUppercase)} Contains uppercase letter</li>
                                <li className="flex items-center gap-1">{renderCheck(hasNumber)} Contains number</li>
                                <li className="flex items-center gap-1">{renderCheck(hasSpecial)} Contains special character (!@#$%^&*-_)</li>
                            </ul>
                        </div>

                        <div>
                            <Label htmlFor="confirm">Confirm Password</Label>
                            <div className="relative mt-1">
                                <Input
                                    id="confirm"
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Re-enter new password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowConfirm(v => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                                >
                                    {showConfirm ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                                </Button>
                            </div>
                            {confirm && !matches && (
                                <p className="text-red-500 text-sm mt-1">Passwords do not match.</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={!isStrong || !matches || saving}
                            className="w-full h-11 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium shadow-lg disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Save New Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
