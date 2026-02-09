"use client";
import { useState } from "react";
import AdminSidebar from "@/components/ui/AdminSidebar";
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
  DialogTrigger,
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
  Calendar,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  mockMatches,
  getMentorById,
  getMenteeById,
  mockMentors,
  mockMentees,
  type Mentor,
  type Mentee,
  mockAlgorithmLogs,
  mockMenteeGroups,
} from "@/lib/mockData";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);

  const [selectedUser, setSelectedUser] = useState<(Mentor | Mentee) | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [minThreshold, setMinThreshold] = useState(0.1);
  const [maxCapacity, setMaxCapacity] = useState(3);
  const totalAssigned = 20;
  const totalCapacity = 130;

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
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 md:pl-8 pl-16">
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
          </div>
          {/* User Management */}
          <div id="users">
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  User Management
                </h2>
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

          <div id="matches">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Mentor Capacity Tracking
                </CardTitle>
                <CardDescription>
                  Overview of mentor capacities and remaining slots
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">
                        Overall Capacity Utilization
                      </span>
                      <span className="text-sm text-slate-600">
                        {totalAssigned} / {totalCapacity} slots filled (
                        {Math.round((totalAssigned / totalCapacity) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={(totalAssigned / totalCapacity) * 100}
                      className="h-3"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Total Capacity</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockMentors.map((mentor) => {
                      const remaining =
                        mentor.capacity - mentor.assignedMentees;
                      const utilizationPercent =
                        (mentor.assignedMentees / mentor.capacity) * 100;

                      return (
                        <TableRow key={mentor.id}>
                          <TableCell className="font-medium">
                            {mentor.name}
                          </TableCell>
                          <TableCell>{mentor.staffId}</TableCell>
                          <TableCell>{mentor.capacity}</TableCell>
                          <TableCell>{mentor.assignedMentees}</TableCell>
                          <TableCell>
                            <span
                              className={
                                remaining === 0
                                  ? "text-red-600 font-medium"
                                  : "text-green-600 font-medium"
                              }
                            >
                              {remaining}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="w-32">
                              <Progress
                                value={utilizationPercent}
                                className={`h-2 ${
                                  utilizationPercent === 100
                                    ? "[&>div]:bg-red-500"
                                    : "[&>div]:bg-emerald-500"
                                }`}
                              />
                              <span className="text-xs text-slate-500">
                                {Math.round(utilizationPercent)}% filled
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedMentor(mentor)}
                                >
                                  <Eye className="w-4 h-4 mr-1" /> View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{mentor.name}</DialogTitle>
                                  <DialogDescription>
                                    Mentor Profile Details
                                  </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="max-h-[60vh]">
                                  <div className="space-y-4 p-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm text-slate-500">
                                          Staff ID
                                        </p>
                                        <p className="font-medium">
                                          {mentor.staffId}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-500">
                                          Email
                                        </p>
                                        <p className="font-medium">
                                          {mentor.email}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-500">
                                          Technical Expertise
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {mentor.technicalExpertise.map(
                                            (exp) => (
                                              <Badge
                                                key={exp}
                                                variant="secondary"
                                              >
                                                {exp}
                                              </Badge>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-500">
                                          Description
                                        </p>
                                        <p className="font-medium">
                                          {mentor.selfDescription}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div id="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Registered Mentors
                </CardTitle>
                <CardDescription>
                  Complete list of all registered mentors with their profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockMentors.map((mentor) => (
                    <Card key={mentor.id} className="border-slate-200">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {mentor.name}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {mentor.staffId} · {mentor.email}
                            </p>
                          </div>
                          <Badge
                            variant={
                              mentor.assignedMentees < mentor.capacity
                                ? "default"
                                : "secondary"
                            }
                          ></Badge>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">
                              Capacity
                            </p>
                            <Progress
                              value={
                                (mentor.assignedMentees / mentor.capacity) * 100
                              }
                              className="h-2"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              {mentor.assignedMentees} / {mentor.capacity}{" "}
                              assigned
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div id="adjustment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Registered Mentee Groups
                </CardTitle>
                <CardDescription>
                  Complete list of all registered mentee groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Thesis Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Mentor</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockMentees.map((group, index) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">
                          {group.groupName}
                        </TableCell>
                        <TableCell>
                          {group.groupMembers.length} students
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {group.researchTitle}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              group.status === "matched"
                                ? "default"
                                : group.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className={
                              group.status === "matched"
                                ? "bg-green-600"
                                : group.status === "pending"
                                  ? "bg-amber-500"
                                  : ""
                            }
                          >
                            {group.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{group.assignedMentor || "-"}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedMentor(group)}
                              >
                                {" "}
                                <Eye className="w-4 h-4 mr-1" /> View{" "}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{group.groupName}</DialogTitle>
                                <DialogDescription>
                                  Mentee Group Profile
                                </DialogDescription>
                                <ScrollArea className="max-h-[60vh]">
                                  <div className="space-y-4 p-4">
                                    <div>
                                      <p className="font-bold">Members</p>
                                      <div className="space-y-1">
                                        {group.groupMembers.map(
                                          (name, index) => (
                                            <p
                                              key={group.studentNumbers[index]}
                                              className="text-sm"
                                            >
                                              {name} (
                                              {group.studentNumbers[index]})
                                            </p>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-bold">
                                        Representative Email
                                      </p>
                                      <p className="text-sm">{group.email} </p>
                                    </div>
                                    <div>
                                      <p className="font-bold">Thesis Title </p>
                                      <p className="text-sm">
                                        {group.researchTitle}{" "}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-bold">
                                        Research Description{" "}
                                      </p>
                                      <p className="text-sm">
                                        {group.researchDescription}{" "}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-bold">
                                        Mentor Preferences
                                      </p>
                                      <p className="text-sm">
                                        {group.preferences}{" "}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-bold">Availability </p>
                                      <p className="text-sm">
                                        Days: {group.availability.days} | Time:{" "}
                                        {group.availability.timeSlots}
                                      </p>
                                    </div>
                                  </div>
                                </ScrollArea>
                              </DialogHeader>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div id="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" /> Algorithm
                  Flow Logs
                </CardTitle>
                <CardDescription>
                  Visualization of the Matching Algorithm Phases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockAlgorithmLogs.map((log) => (
                    <div
                      key={log.phase}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div
                        className={`p-4 ${log.phase === 1 ? "bg-blue-50 border-b border-blue-200" : log.phase === 2 ? "bg-emerald-50 border-b border-emerald-200" : "bg-amber-50 border-b border-amber-200"}`}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">
                            Phase {log.phase}: {log.phaseName}
                          </h3>
                          <span className="text-sm text-slate-500">
                            {log.timestamp}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {log.entries.map((entry, index) => (
                          <div
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-lg ${entry.status === "success" ? "bg-green-50" : entry.status === "pending" ? "bg-amber-50" : "bg-red-50"}`}
                          >
                            {entry.status === "success" ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : entry.status === "pending" ? (
                              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {entry.action}
                              </p>
                              <p className="text-xs text-slate-500">
                                {entry.details}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Perfect Matches
                    </h3>
                    <div className="space-y-2">
                      {mockMenteeGroups
                        .filter((g) => g.status === "matched")
                        .map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center justify-between p-2 bg-white rounded"
                          >
                            <span className="font-medium">
                              {group.groupName}
                            </span>
                            <span className="text-emerald-600">
                              {" "}
                              →{group.assignedMentor}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
