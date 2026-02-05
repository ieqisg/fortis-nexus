"use client";

import { useState } from "react";
import {
  BarChart3,
  Users,
  UserCheck,
  TrendingUp,
  Settings,
  Bell,
  Menu,
  X,
  GraduationCap,
  BadgeCheck,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const navItems: NavItem[] = [
  {
    id: "overview",
    label: "Dashboard Overview",
    icon: <BarChart3 className="w-5 h-5" />,
    href: "#overview",
  },
  {
    id: "users",
    label: "User Management",
    icon: <Users className="w-5 h-5" />,
    href: "#users",
  },
  {
    id: "matches",
    label: "Mentor Capacity Tracking",
    icon: <GraduationCap className="w-5 h-5" />,
    href: "#matches",
  },
  {
    id: "analytics",
    label: "Registered Mentors",
    icon: <BadgeCheck className="w-5 h-5" />,
    href: "#analytics",
  },
  {
    id: "adjustment",
    label: "Registered Mentee Groups",
    icon: <UserRoundCheck className="w-5 h-5" />,
    href: "#adjustment",
  },
  {
    id: "alerts",
    label: "Algorithm Flow Logs",
    icon: <Bell className="w-5 h-5" />,
    href: "#alerts",
  },
];

export default function AdminSidebar() {
  const [activeSection, setActiveSection] = useState("overview");
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    e.preventDefault();
    setActiveSection(id);
    setIsOpen(false); // Close mobile menu on navigation

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
          md:translate-x-0 md:static md:flex md:flex-col bg-white border-r border-gray-200
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
          <h2 className="text-xl font-bold text-blue-900">Admin Panel</h2>
          <p className="text-sm text-gray-600">Matching System</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.id)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeSection === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {item.icon}
              <span className={activeSection === item.id ? "font-medium" : ""}>
                {item.label}
              </span>
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
