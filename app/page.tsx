"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  UserPlus,
  LogIn,
  BookOpen,
  Award,
} from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">CS Department</h1>
              <p className="text-xs text-blue-300">Mentor-Mentee System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Fortis Nexus
            <span className="text-4xl block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Mentor-Mentee Matching System
            </span>
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Connect with experienced mentors and guide your thesis journey to
            success
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          {/* MENTEE — GREEN */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <Users className="w-10 h-10" />
              </div>
              <CardTitle className="text-2xl">I'm a Mentee</CardTitle>
              <CardDescription className="text-emerald-200">
                Looking for guidance on your thesis project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-emerald-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Register your thesis group</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Get matched with expert mentors</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white "
                  onClick={() => router.push("/register/mentee-register")}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </Button>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                  onClick={() => router.push("/login/mentee-login")}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MENTOR — BLUE */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <GraduationCap className="w-10 h-10" />
              </div>
              <CardTitle className="text-2xl">I'm a Mentor</CardTitle>
              <CardDescription className="text-blue-200">
                Ready to guide students on their thesis journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Share your expertise and experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span>Help shape future researchers</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push("/register/mentor-register")}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </Button>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                  onClick={() => router.push("/login/mentor-login")}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✅ QUICK STATS — UNCHANGED */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4">
            <p className="text-4xl font-bold text-white">50+</p>
            <p className="text-blue-300 text-sm">Active Mentors</p>
          </div>
          <div className="p-4">
            <p className="text-4xl font-bold text-white">120+</p>
            <p className="text-blue-300 text-sm">Thesis Groups</p>
          </div>
          <div className="p-4">
            <p className="text-4xl font-bold text-white">95%</p>
            <p className="text-blue-300 text-sm">Match Rate</p>
          </div>
          <div className="p-4">
            <p className="text-4xl font-bold text-white">4.8★</p>
            <p className="text-blue-300 text-sm">Satisfaction</p>
          </div>
        </div>
      </div>
    </div>
  );
}
