"use client";

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

export default function MentorRegistration({ onNext }: { onNext: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Real-time password validation flags
  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  const isPasswordStrong =
    isLengthValid && hasUppercase && hasNumber && hasSpecialChar;

  // Form valid if password is strong AND matches confirm password
  const isFormValid = isPasswordStrong && password === confirmPassword;

  // Real-time password error messages
  useEffect(() => {
    if (password === "" && confirmPassword === "") {
      setPasswordError("");
    } else if (!isPasswordStrong) {
      setPasswordError(
        "Password must be at least 8 characters, include uppercase, number, and special character.",
      );
    } else if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword, isPasswordStrong]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return; // button is disabled anyway

    console.log("Form submitted:", { password, confirmPassword });
    onNext(); // proceed
  };

  const renderCheck = (valid: boolean) => (
    <span
      className={`flex items-center gap-1 ${valid ? "text-green-600" : "text-gray-400"}`}
    >
      {valid && <Check className="w-4 h-4" />}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50  py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back To Home
        </Button>
        <Card>
          <CardHeader>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserRound className="w-10 h-10 text-blue-700" />
            </div>
            <CardTitle className="text-center text-2xl">
              Mentor Register
            </CardTitle>
            <CardDescription className="text-center">
              Create your mentor profile to guide students
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

                {/* Live password strength UI */}
                <ul className="mt-2 text-sm space-y-1">
                  <li className="flex items-center gap-1">
                    {renderCheck(isLengthValid)} At least 8 characters
                  </li>
                  <li className="flex items-center gap-1">
                    {renderCheck(hasUppercase)} Contains uppercase letter
                  </li>
                  <li className="flex items-center gap-1">
                    {renderCheck(hasNumber)} Contains number
                  </li>
                  <li className="flex items-center gap-1">
                    {renderCheck(hasSpecialChar)} Contains special character
                    (@$!%*?&)
                  </li>
                </ul>
              </div>

              {/* Confirm Password Field */}
              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    variant="ghost"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Password Error */}
              {passwordError && (
                <p className="text-red-600 text-sm">{passwordError}</p>
              )}

              {/* Buttons */}
              <div className="flex gap-2 justify-end">
                <Button type="button" className="bg-gray-400 ">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`bg-blue-700 hover:bg-blue-700 ${
                    !isFormValid
                      ? "opacity-50 cursor-not-allowed hover:bg-green-600"
                      : ""
                  }`}
                  disabled={!isFormValid}
                >
                  Next
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
