"use client";

import { Home, User, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
  userType: "mentor" | "mentee" | "admin";
  userName: string;
}

export default function Sidebar({ userType, userName }: SidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    router.push("/");
  };

  const bgColor = userType === "mentor" ? "bg-white" : "bg-white";
  const accentColor =
    userType === "mentor" ? "text-blue-900" : "text-green-900";
  const userBg = userType === "mentor" ? "bg-blue-100" : "bg-green-100";
  const userIconColor =
    userType === "mentor" ? "text-blue-600" : "text-green-600";

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="p-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-screen w-64 z-50 transform
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:flex md:flex-col ${bgColor} border-r border-gray-200
        `}
      >
        {/* Close button for mobile */}
        <div className="md:hidden flex justify-end p-4">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className={`text-xl font-bold ${accentColor}`}>FEU Tech</h2>
          <p className="text-sm text-gray-600">Mentor-Mentee System</p>
        </div>

        {/* User info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 ${userBg} rounded-full flex items-center justify-center`}
            >
              <User className={`w-6 h-6 ${userIconColor}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500 capitalize">{userType}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start mb-2"
            onClick={() => router.push(`/${userType}-dashboard`)}
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start mb-2">
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
