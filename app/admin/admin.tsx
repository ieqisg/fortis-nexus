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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Users,
    AlertCircle,
    Search,
    TrendingUp,
    Eye,
    Edit,
    CheckCircle2,
    XCircle,
    FileText,
    CheckCircle,
    Clock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllUserData } from "@/lib/actions/adminActions";
import { useEffect } from "react";

export default function Admin() {
    const [mentors, setMentors] = useState<any[]>([])
    const [mentees, setMentees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("");
    const [userFilter, setUserFilter] = useState("all");
    const [selectedMentor, setSelectedMentor] = useState<any>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [matching, setMatching] = useState(false)
    const [matchResult, setMatchResult] = useState<any>(null)

    const handleRunMatching = async () => {
        setMatching(true)
        try {
            const res = await fetch("/api/run-matching", { method: "POST" })
            const data = await res.json()
            setMatchResult(data)
            if (data.success) {
                // refresh data after matching
                const result = await getAllUserData()
                if (result.success) {
                    setMentors(result.data.mentors ?? [])
                    setMentees(result.data.mentee ?? [])
                }
            }
        } catch (err) {
            alert("Failed to run matching")
        }
        setMatching(false)
    }


    const algorithmLogs = [
        {
            phase: 1,
            phaseName: "Data Collection & Preprocessing",
            timestamp: "2026-04-14 08:00 AM",
            entries: [
                { status: "success", action: "Mentor profiles loaded", details: `${mentors.length} mentor profiles successfully parsed and indexed.` },
                { status: "success", action: "Mentee group profiles loaded", details: `${mentees.length} mentee groups successfully parsed and indexed.` },
                { status: "success", action: "Keyword extraction complete", details: "TF-IDF applied to research titles and descriptions." },
            ],
        },
        {
            phase: 2,
            phaseName: "Compatibility Scoring",
            timestamp: "2026-04-14 08:05 AM",
            entries: [
                { status: "success", action: "Cosine similarity computed", details: "Similarity scores calculated for all mentor–mentee pairs." },
                { status: "success", action: "Preference weights applied", details: "Mentee preferences factored into final compatibility scores." },
                { status: "pending", action: "Availability matching", details: "Some groups may have unresolved schedule conflicts." },
            ],
        },
        {
            phase: 3,
            phaseName: "Assignment & Output",
            timestamp: "2026-04-14 08:10 AM",
            entries: [
                { status: "success", action: "Optimal assignments generated", details: "Gale-Shapley algorithm applied for stable matching." },
                { status: "success", action: "Matched pairs finalized", details: `${mentees.filter(m => m.matches?.status === "active").length} groups successfully matched to mentors.` },
                {
                    status: mentees.filter(m => !m.matches).length > 0 ? "error" : "success",
                    action: "Unmatched groups flagged",
                    details: mentees.filter(m => !m.matches).length > 0
                        ? `${mentees.filter(m => !m.matches).length} groups could not be matched due to capacity or preference constraints.`
                        : "All groups have been successfully matched."
                },
            ],
        },
    ]

    useEffect(() => {
        const fetchData = async () => {
            const result = await getAllUserData()
            if (result.success) {
                setMentors(result.data.mentors ?? [])
                setMentees(result.data.mentee ?? [])
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    const totalAssigned = mentors.reduce((sum, m) => sum + (m.matches?.length ?? 0), 0)
    const totalCapacity = mentors.reduce((sum, m) => sum + (m.mentor_capacity ?? 0), 0)
    const matchesCompleted = mentees.filter(m => m.matches).length
    const avgCompatibility = mentees.length
        ? Math.round(mentees.reduce((sum, m) => sum + (m.matches?.compatibility_score ?? 0), 0) / mentees.length * 100) + "%"
        : "N/A"

    const allUsers = [
        ...mentors.map((m: any) => ({ ...m, type: "mentor" })),
        ...mentees.map((m: any) => ({ ...m, type: "mentee" })),
    ]

    const filteredUsers = allUsers.filter((user: any) => {
        const name = user.type === "mentor"
            ? `${user.first_name} ${user.last_name}`
            : user.group_name
        const matchesSearch = name?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = userFilter === "all" || user.type === userFilter
        return matchesSearch && matchesFilter
    })

    if (loading) return <p>Loading...</p>

    return (
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar />
            <div className="flex-1 overflow-auto">
                <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white p-8 md:pl-8 pl-16">
                    <h1 className="text-3xl font-bold mb-2">Mentor–Mentee Matching System</h1>
                    <p className="text-blue-100">Administrative Dashboard</p>
                </div>

                <div className="p-8 space-y-8">
                    {/* OVERVIEW */}
                    <div id="overview">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
                        <div className="grid md:grid-cols-4 gap-6 mb-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Mentors</CardTitle>
                                    <Users className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{mentors.length}</div>
                                    <p className="text-xs text-gray-500">Active faculty</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Mentees</CardTitle>
                                    <Users className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{mentees.length}</div>
                                    <p className="text-xs text-gray-500">Student groups</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Matches Completed</CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{matchesCompleted}</div>
                                    <p className="text-xs text-gray-500">Successful pairs</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Avg Compatibility</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-purple-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{avgCompatibility}</div>
                                    <p className="text-xs text-gray-500">Match quality</p>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <Button
                                onClick={handleRunMatching}
                                disabled={matching}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {matching ? (
                                    <>
                                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                                        Running Matching...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Run Matching Algorithm
                                    </>
                                )}
                            </Button>
                            {matchResult && (
                                <p className={`text-sm ${matchResult.success ? "text-green-600" : "text-red-600"}`}>
                                    {matchResult.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* USER MANAGEMENT */}
                    <div id="users">
                        <Card>
                            <CardHeader>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
                                <CardTitle className="flex items-center">
                                    <Users className="w-5 h-5 mr-2 text-blue-600" /> All Users
                                </CardTitle>
                                <CardDescription>Manage mentors and mentees</CardDescription>
                                <div className="flex items-center space-x-4 mt-4">
                                    <div className="flex items-center space-x-2 flex-1">
                                        <Search className="w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Search by name..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="max-w-sm"
                                        />
                                    </div>
                                    <Select value={userFilter} onValueChange={setUserFilter}>
                                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
                                                    {user.type === "mentor"
                                                        ? `${user.first_name} ${user.last_name}`
                                                        : user.group_name}
                                                </TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={user.type === "mentor" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                                                        {user.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex space-x-2">
                                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setIsEditDialogOpen(true); }}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => alert(`Toggle status for user: ${user.id}`)}>
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

                    {/* MENTOR CAPACITY */}
                    <div id="matches">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-600" /> Mentor Capacity Tracking
                                </CardTitle>
                                <CardDescription>Overview of mentor capacities and remaining slots</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">Overall Capacity Utilization</span>
                                            <span className="text-sm text-slate-600">
                                                {totalAssigned} / {totalCapacity} slots filled ({totalCapacity ? Math.round((totalAssigned / totalCapacity) * 100) : 0}%)
                                            </span>
                                        </div>
                                        <Progress value={totalCapacity ? (totalAssigned / totalCapacity) * 100 : 0} className="h-3" />
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mentor</TableHead>
                                            <TableHead>Total Capacity</TableHead>
                                            <TableHead>Assigned</TableHead>
                                            <TableHead>Remaining</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mentors.map((mentor) => {
                                            const assigned = mentor.matches?.length ?? 0
                                            const capacity = mentor.mentor_capacity ?? 0
                                            const remaining = capacity - assigned
                                            const utilizationPercent = capacity ? (assigned / capacity) * 100 : 0
                                            return (
                                                <TableRow key={mentor.id}>
                                                    <TableCell className="font-medium">{mentor.first_name} {mentor.last_name}</TableCell>
                                                    <TableCell>{capacity}</TableCell>
                                                    <TableCell>{assigned}</TableCell>
                                                    <TableCell>
                                                        <span className={remaining === 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>{remaining}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="w-32">
                                                            <Progress value={utilizationPercent} className={`h-2 ${utilizationPercent === 100 ? "[&>div]:bg-red-500" : "[&>div]:bg-emerald-500"}`} />
                                                            <span className="text-xs text-slate-500">{Math.round(utilizationPercent)}% filled</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" onClick={() => setSelectedMentor(mentor)}>
                                                                    <Eye className="w-4 h-4 mr-1" /> View
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>{mentor.first_name} {mentor.last_name}</DialogTitle>
                                                                    <DialogDescription>Mentor Profile Details</DialogDescription>
                                                                </DialogHeader>
                                                                <ScrollArea className="max-h-[60vh]">
                                                                    <div className="space-y-4 p-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <p className="text-sm text-slate-500">Email</p>
                                                                                <p className="font-medium">{mentor.email}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm text-slate-500">Technical Skills</p>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {mentor.technical_skills?.map((skill: string) => (
                                                                                        <Badge key={skill} variant="secondary">{skill}</Badge>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm text-slate-500">Forte</p>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {mentor.forte?.map((f: string) => (
                                                                                        <Badge key={f} variant="secondary">{f}</Badge>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm text-slate-500">Description</p>
                                                                                <p className="font-medium">{mentor.self_description}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </ScrollArea>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* REGISTERED MENTORS */}
                    <div id="analytics">
                        <Card>
                            <CardHeader>
                                <CardTitle>Registered Mentors</CardTitle>
                                <CardDescription>Complete list of all registered mentors with their profiles</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mentors.map((mentor) => {
                                        const assigned = mentor.matches?.length ?? 0
                                        const capacity = mentor.mentor_capacity ?? 0
                                        return (
                                            <Card key={mentor.id} className="border-slate-200">
                                                <CardContent className="pt-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-semibold text-lg">{mentor.first_name} {mentor.last_name}</h3>
                                                            <p className="text-sm text-slate-500">{mentor.email}</p>
                                                        </div>
                                                        <Badge variant={assigned < capacity ? "default" : "secondary"}>
                                                            {assigned < capacity ? "Available" : "Full"}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-1">Capacity</p>
                                                            <Progress value={capacity ? (assigned / capacity) * 100 : 0} className="h-2" />
                                                            <p className="text-xs text-slate-500 mt-1">{assigned} / {capacity} assigned</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* REGISTERED MENTEE GROUPS */}
                    <div id="adjustment">
                        <Card>
                            <CardHeader>
                                <CardTitle>Registered Mentee Groups</CardTitle>
                                <CardDescription>Complete list of all registered mentee groups</CardDescription>
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
                                        {mentees.map((group) => {
                                            const match = group.matches
                                            const mentor = match?.mentor
                                            const status = match?.status ?? "unmatched"
                                            return (
                                                <TableRow key={group.id}>
                                                    <TableCell className="font-medium">{group.group_name}</TableCell>
                                                    <TableCell>{group.group_members?.length ?? 0} students</TableCell>
                                                    <TableCell className="max-w-xs truncate">{group.research_title}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={status === "active" ? "bg-green-600" : status === "pending" ? "bg-amber-500" : ""}
                                                            variant={status === "active" ? "default" : status === "pending" ? "secondary" : "destructive"}
                                                        >
                                                            {status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {mentor ? `${mentor.first_name} ${mentor.last_name}` : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm">
                                                                    <Eye className="w-4 h-4 mr-1" /> View
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>{group.group_name}</DialogTitle>
                                                                    <DialogDescription>Mentee Group Profile</DialogDescription>
                                                                </DialogHeader>
                                                                <ScrollArea className="max-h-[60vh]">
                                                                    <div className="space-y-4 p-4">
                                                                        <div>
                                                                            <p className="font-bold">Members</p>
                                                                            <div className="space-y-1">
                                                                                {group.group_members?.map((member: string, i: number) => {
                                                                                    const parsed = JSON.parse(member)
                                                                                    return (
                                                                                        <p key={i} className="text-sm">
                                                                                            {parsed.name} ({parsed.student_number})
                                                                                        </p>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold">Thesis Title</p>
                                                                            <p className="text-sm">{group.research_title}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold">Research Description</p>
                                                                            <p className="text-sm">{group.research_description}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold">Mentor Preferences</p>
                                                                            <p className="text-sm">{group.mentor_preference}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold">Availability</p>
                                                                            <p className="text-sm">Days: {group.available_days?.join(", ")} | Time: {group.time_slot?.join(", ")}</p>
                                                                        </div>
                                                                    </div>
                                                                </ScrollArea>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ALGORITHM LOGS */}
                    <div id="alerts">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-600" /> Algorithm Flow Logs
                                </CardTitle>
                                <CardDescription>Visualization of the Matching Algorithm Phases</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {algorithmLogs.map((log) => (
                                        <div key={log.phase} className="border rounded-lg overflow-hidden">
                                            <div className={`p-4 ${log.phase === 1 ? "bg-blue-50 border-b border-blue-200" : log.phase === 2 ? "bg-emerald-50 border-b border-emerald-200" : "bg-amber-50 border-b border-amber-200"}`}>
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-semibold">Phase {log.phase}: {log.phaseName}</h3>
                                                    <span className="text-sm text-slate-500">{log.timestamp}</span>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {log.entries.map((entry, index) => (
                                                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${entry.status === "success" ? "bg-green-50" : entry.status === "pending" ? "bg-amber-50" : "bg-red-50"}`}>
                                                        {entry.status === "success" ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                                        ) : entry.status === "pending" ? (
                                                            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                                                        ) : (
                                                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-sm">{entry.action}</p>
                                                            <p className="text-xs text-slate-500">{entry.details}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="p-4 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                        <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5" /> Perfect Matches
                                        </h3>
                                        <div className="space-y-2">
                                            {mentees.filter(m => m.matches?.status === "active").map((group) => (
                                                <div key={group.id} className="flex items-center justify-between p-2 bg-white rounded">
                                                    <span className="font-medium">{group.group_name}</span>
                                                    <span className="text-emerald-600">
                                                        → {group.matches?.mentor?.first_name} {group.matches?.mentor?.last_name}
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
    )
}
