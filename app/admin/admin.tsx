"use client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users,
  BarChart3,
  AlertCircle,
  Search,
  TrendingUp,
  UserCheck,
  UserX,
  RefreshCw,
  Settings,
  Bell,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  mockMatches,
  getMentorById,
  getMenteeById,
  mockMentors,
  mockMentees,
  type Mentor,
  type Mentee,
} from "@/lib/mockData";

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<(Mentor | Mentee) | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [minThreshold, setMinThreshold] = useState(0.1);
  const [maxCapacity, setMaxCapacity] = useState(3);

  // Calculate statistics
  const totalMatches = mockMatches.length;
  const avgScore =
    mockMatches.reduce((sum, m) => sum + m.score, 0) / totalMatches;
  const unmatchedMentees = mockMentees.length - mockMatches.length;

  // Mentor load calculation
  const mentorLoad = new Map<string, number>();
  mockMatches.forEach((match) => {
    mentorLoad.set(match.mentorId, (mentorLoad.get(match.mentorId) || 0) + 1);
  });

  // Keyword frequency
  const keywordFrequency = new Map<string, number>();
  mockMatches.forEach((match) => {
    match.keywords.forEach((keyword) => {
      keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
    });
  });
  const topKeywords = Array.from(keywordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Filter users
  const allUsers = [
    ...mockMentors.map((m) => ({ ...m, type: "mentor" as const })),
    ...mockMentees.map((m) => ({ ...m, type: "mentee" as const })),
  ];

  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      "name" in user
        ? user.name.toLowerCase().includes(searchTerm.toLowerCase())
        : user.groupMembers[0].toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = userFilter === "all" || user.type === userFilter;
    return matchesSearch && matchesFilter;
  });

  // Filter matches
  const filteredMatches = mockMatches.filter((match) => {
    if (matchFilter === "all") return true;
    if (matchFilter === "high") return match.score >= 0.7;
    if (matchFilter === "medium")
      return match.score >= 0.4 && match.score < 0.7;
    if (matchFilter === "low") return match.score < 0.4;
    return true;
  });

  const handleRerunMatching = () => {
    alert("Matching algorithm re-run initiated with current settings.");
  };

  const handleEditUser = (user: Mentor | Mentee) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleToggleUserStatus = (userId: string) => {
    alert(`User ${userId} status toggled (activate/deactivate)`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-blue-900">Admin Panel</h2>
          <p className="text-sm text-gray-600">Matching System</p>
        </div>

        <nav className="p-4 space-y-2">
          <a
            href="#overview"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Dashboard Overview</span>
          </a>
          <a
            href="#users"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            <Users className="w-5 h-5" />
            <span>User Management</span>
          </a>
          <a
            href="#matches"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            <UserCheck className="w-5 h-5" />
            <span>Match Monitoring</span>
          </a>
          <a
            href="#analytics"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Analytics & Reports</span>
          </a>
          <a
            href="#adjustment"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            <Settings className="w-5 h-5" />
            <span>Match Adjustment</span>
          </a>
          <a
            href="#alerts"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            <Bell className="w-5 h-5" />
            <span>Notifications & Alerts</span>
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
          <h1 className="text-3xl font-bold mb-2">
            Mentor–Mentee Matching System
          </h1>
          <p className="text-blue-100">Administrative Dashboard</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Dashboard Overview */}
          <div id="overview">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard Overview
            </h2>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Mentors
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockMentors.length}</div>
                  <p className="text-xs text-gray-500">Active faculty</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Mentees
                  </CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockMentees.length}</div>
                  <p className="text-xs text-gray-500">Student groups</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Matches Completed
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalMatches}</div>
                  <p className="text-xs text-gray-500">Successful pairs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Compatibility
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(avgScore * 100)}%
                  </div>
                  <p className="text-xs text-gray-500">Match quality</p>
                </CardContent>
              </Card>
            </div>

            {/* Visualizations */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mentees per Mentor</CardTitle>
                  <CardDescription>Workload distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockMentors.map((mentor) => {
                      const count = mentorLoad.get(mentor.id) || 0;
                      const percentage = (count / maxCapacity) * 100;
                      return (
                        <div key={mentor.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{mentor.name}</span>
                            <span className="text-gray-600">
                              {count} / {maxCapacity}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                percentage >= 100
                                  ? "bg-red-500"
                                  : percentage >= 80
                                    ? "bg-amber-500"
                                    : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Match Score Distribution</CardTitle>
                  <CardDescription>Quality breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        label: "High (≥70%)",
                        count: mockMatches.filter((m) => m.score >= 0.7).length,
                        color: "bg-green-500",
                      },
                      {
                        label: "Medium (40-69%)",
                        count: mockMatches.filter(
                          (m) => m.score >= 0.4 && m.score < 0.7,
                        ).length,
                        color: "bg-blue-500",
                      },
                      {
                        label: "Low (<40%)",
                        count: mockMatches.filter((m) => m.score < 0.4).length,
                        color: "bg-amber-500",
                      },
                    ].map((category) => (
                      <div key={category.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{category.label}</span>
                          <span className="text-gray-600">
                            {category.count} matches
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${category.color}`}
                            style={{
                              width: `${(category.count / totalMatches) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* User Management */}
          <div id="users">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              User Management
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  All Users
                </CardTitle>
                <CardDescription>Manage mentors and mentees</CardDescription>
                <div className="flex items-center space-x-4 mt-4">
                  <div className="flex items-center space-x-2 flex-1">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="mentor">Mentors Only</SelectItem>
                      <SelectItem value="mentee">Mentees Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {"name" in user ? user.name : user.groupMembers[0]}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.type === "mentor"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {user.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Match Monitoring */}
          <div id="matches">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Match Monitoring
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-green-600" />
                  All Matches
                </CardTitle>
                <CardDescription>
                  View and monitor mentor-mentee pairs
                </CardDescription>
                <div className="flex items-center space-x-4 mt-4">
                  <Select value={matchFilter} onValueChange={setMatchFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Matches</SelectItem>
                      <SelectItem value="high">High Score (≥70%)</SelectItem>
                      <SelectItem value="medium">
                        Medium Score (40-69%)
                      </SelectItem>
                      <SelectItem value="low">Low Score (&lt;40%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor Name</TableHead>
                      <TableHead>Mentee Group</TableHead>
                      <TableHead>Compatibility Score</TableHead>
                      <TableHead>Top Keywords Matched</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.map((match) => {
                      const mentor = getMentorById(match.mentorId);
                      const mentee = getMenteeById(match.menteeId);
                      if (!mentor || !mentee) return null;

                      return (
                        <TableRow key={match.menteeId}>
                          <TableCell className="font-medium">
                            {mentor.name}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {mentee.groupMembers[0]}
                              </p>
                              <p className="text-xs text-gray-500">
                                {mentee.researchTitle}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">
                                {(match.score * 100).toFixed(0)}%
                              </span>
                              <Badge
                                variant="secondary"
                                className={
                                  match.score >= 0.7
                                    ? "bg-green-100 text-green-800"
                                    : match.score >= 0.4
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-amber-100 text-amber-800"
                                }
                              >
                                {match.score >= 0.7
                                  ? "High"
                                  : match.score >= 0.4
                                    ? "Medium"
                                    : "Low"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {match.keywords
                                .slice(0, 5)
                                .map((keyword, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {keyword}
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {unmatchedMentees > 0 && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unmatched Mentees</AlertTitle>
                    <AlertDescription>
                      {unmatchedMentees} mentee group(s) did not receive a
                      match. Consider adjusting thresholds or adding more
                      mentors.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics & Reporting */}
          <div id="analytics">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Analytics & Reporting
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Matches:</span>
                    <span className="font-bold">{totalMatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Average Compatibility Score:
                    </span>
                    <span className="font-bold">
                      {(avgScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Mentor Capacity Utilization:
                    </span>
                    <span className="font-bold">
                      {Math.round(
                        (totalMatches / (mockMentors.length * maxCapacity)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unmatched Mentees:</span>
                    <span className="font-bold text-amber-600">
                      {unmatchedMentees}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Matched Keywords</CardTitle>
                  <CardDescription>Most in-demand skills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topKeywords.map(([keyword, count]) => (
                      <div
                        key={keyword}
                        className="flex justify-between items-center"
                      >
                        <Badge variant="outline">{keyword}</Badge>
                        <span className="text-sm font-semibold">
                          {count} matches
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Match Adjustment */}
          <div id="adjustment">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Match Adjustment
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-purple-600" />
                  Algorithm Settings & Controls
                </CardTitle>
                <CardDescription>
                  Configure matching parameters and re-run algorithm
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Compatibility Threshold</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={minThreshold}
                      onChange={(e) =>
                        setMinThreshold(parseFloat(e.target.value))
                      }
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum score required for matching (0.0 - 1.0)
                    </p>
                  </div>

                  <div>
                    <Label>Maximum Mentees per Mentor</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Capacity limit for balanced distribution
                    </p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    onClick={handleRerunMatching}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-run Matching Algorithm
                  </Button>
                  <Button variant="outline">Manual Override</Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>
                    Re-running the algorithm will recalculate all matches based
                    on current settings. Manual overrides allow you to adjust
                    specific matches if needed.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Notifications & Alerts */}
          <div id="alerts">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Notifications & Alerts
            </h2>
            <div className="space-y-4">
              {unmatchedMentees > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Unmatched Mentees Alert</AlertTitle>
                  <AlertDescription>
                    {unmatchedMentees} mentee group(s) are currently unmatched.
                    Consider lowering the threshold or adding more mentors.
                  </AlertDescription>
                </Alert>
              )}

              {mockMentors.some(
                (m) => (mentorLoad.get(m.id) || 0) >= maxCapacity,
              ) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Mentor Overload Warning</AlertTitle>
                  <AlertDescription>
                    Some mentors have reached maximum capacity. Consider
                    redistributing mentees or increasing capacity limits.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-blue-600" />
                    System Logs
                  </CardTitle>
                  <CardDescription>
                    Recent algorithm runs and changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        time: "2026-01-29 10:30",
                        action: "Matching algorithm executed",
                        status: "success",
                      },
                      {
                        time: "2026-01-28 15:45",
                        action: "Manual override: Mentee ME002 reassigned",
                        status: "info",
                      },
                      {
                        time: "2026-01-27 09:15",
                        action: "Threshold adjusted to 0.10",
                        status: "info",
                      },
                      {
                        time: "2026-01-26 14:20",
                        action: "New mentor added: Dr. Anna Reyes",
                        status: "success",
                      },
                    ].map((log, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center border-b border-gray-200 pb-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.action}
                          </p>
                          <p className="text-xs text-gray-500">{log.time}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            log.status === "success"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }
                        >
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>Make corrections to user data</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={
                    "name" in selectedUser
                      ? selectedUser.name
                      : selectedUser.groupMembers[0]
                  }
                  readOnly
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={selectedUser.email} />
              </div>
              <div>
                <Label>Account Type</Label>
                <Input
                  value={"name" in selectedUser ? "Mentor" : "Mentee"}
                  readOnly
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsEditDialogOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
