import { Home, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface SidebarProps {
  userType: "mentor" | "mentee" | "admin";
  userName: string;
}

export default function Sidebar({ userType, userName }: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <>
      {userType === "mentor" ? (
        <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-blue-900">FEU Tech</h2>
            <p className="text-sm text-gray-600">Mentor-Mentee System</p>
          </div>

          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Dr. Maria Santos</p>
                <p className="text-xs text-gray-500 capitalize">{userType}</p>
              </div>
            </div>
          </div>

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
      ) : (
        <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-green-900">FEU Tech</h2>
            <p className="text-sm text-gray-600">Mentor-Mentee System</p>
          </div>

          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{userType}</p>
              </div>
            </div>
          </div>

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
      )}
    </>
  );
}
