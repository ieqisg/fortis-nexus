"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, UserRound, Eye, EyeOff, Check } from "lucide-react";

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

export default function MentorLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50  py-12 px-4">
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
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserRound className="w-10 h-10 text-blue-700" />
            </div>
            <CardTitle className="text-center text-2xl">Mentor Login</CardTitle>
            <CardDescription className="text-center">
              Login your mentor profile to guide students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="prof@fit.edu.ph"
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
                    onChange={(e) => setPassword(e.target.value)}
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
                    className="bg-gray-400"
                    onClick={() => router.push("/")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Login
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
