"use client";
import { useState, useEffect } from "react";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
    UserPlus,
    Plus,
    X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllUserData, overrideMentorCapacity, adminEditMentor, adminEditMentee, adminDeleteUser, rollbackMatches, adminCreateMentor, adminCreateMentee } from "@/lib/actions/adminActions"
import { getAnnouncements, createAnnouncement, deleteAnnouncement, type Announcement } from "@/lib/actions/announcementActions"
import { Textarea } from "@/components/ui/textarea"
import { Megaphone, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function Admin() {
    const [mentors, setMentors] = useState<any[]>([])
    const [mentees, setMentees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [userFilter, setUserFilter] = useState("all")
    const [selectedMentor, setSelectedMentor] = useState<any>(null)
    const [selectedMentorCard, setSelectedMentorCard] = useState<any>(null)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editForm, setEditForm] = useState<Record<string, string | number>>({})
    const [savingEdit, setSavingEdit] = useState(false)
    const [userToDelete, setUserToDelete] = useState<any>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [deletingUser, setDeletingUser] = useState(false)
    const [matching, setMatching] = useState(false)
    const [matchResult, setMatchResult] = useState<any>(null)
    const [matchLog, setMatchLog] = useState<any>(null)
    const [rollingBack, setRollingBack] = useState(false)
    const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false)
    // capacity override state: mentorId → draft value while editing
    const [capacityEdits, setCapacityEdits] = useState<Record<string, number>>({})
    const [savingCapacity, setSavingCapacity] = useState<string | null>(null)

    // announcements
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [annForm, setAnnForm] = useState({ title: "", body: "", target: "all" as Announcement["target"] })
    const [postingAnn, setPostingAnn] = useState(false)
    const [deletingAnn, setDeletingAnn] = useState<string | null>(null)

    // create user
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [createRole, setCreateRole] = useState<"mentor" | "mentee">("mentee")
    const [createForm, setCreateForm] = useState({ email: "", password: "", first_name: "", last_name: "", group_name: "", research_title: "", research_description: "", mentor_preference: "" })
    const [createMembers, setCreateMembers] = useState([{ name: "", student_number: "" }])
    const [creatingUser, setCreatingUser] = useState(false)
    const [showCreatePassword, setShowCreatePassword] = useState(false)

    const handleRunMatching = async () => {
        setMatching(true)
        try {
            const res = await fetch("/api/run-matching", { method: "POST" })
            const data = await res.json()
            setMatchResult(data)
            if (data.log) {
                setMatchLog(data.log)
            }
            if (data.success) {
                const result = await getAllUserData()
                if (result.success) {
                    setMentors(result.data.mentors ?? [])
                    setMentees(result.data.mentee ?? [])
                }
            }
        } catch (err) {
            toast.error("Failed to run matching")
        }
        setMatching(false)
    }

    const handleRollback = async () => {
        setRollingBack(true)
        const result = await rollbackMatches()
        if (result.success) {
            setMentors(prev => prev.map(m => ({ ...m, matches: [] })))
            setMentees(prev => prev.map(m => ({ ...m, matches: null })))
            setMatchResult(null)
            setMatchLog(null)
            toast.success("Matches rolled back successfully")
        } else {
            toast.error(result.message ?? "Failed to rollback matches")
        }
        setRollingBack(false)
        setIsRollbackDialogOpen(false)
    }

    const handleCapacitySave = async (mentorId: string) => {
        const newCap = capacityEdits[mentorId]
        if (newCap === undefined || newCap < 1) return
        setSavingCapacity(mentorId)
        const result = await overrideMentorCapacity(mentorId, newCap)
        if (result.success) {
            setMentors((prev) =>
                prev.map((m) => m.id === mentorId ? { ...m, mentor_capacity: newCap } : m)
            )
            setCapacityEdits((prev) => { const n = { ...prev }; delete n[mentorId]; return n })
            toast.success("Capacity updated")
        } else {
            toast.error("Failed to update capacity")
        }
        setSavingCapacity(null)
    }

    const openEditDialog = (user: any) => {
        setSelectedUser(user)
        if (user.type === "mentor") {
            setEditForm({
                first_name: user.first_name ?? "",
                last_name: user.last_name ?? "",
                email: user.email ?? "",
                mentor_capacity: user.mentor_capacity ?? 1,
            })
        } else {
            setEditForm({
                group_name: user.group_name ?? "",
                research_title: user.research_title ?? "",
                email: user.email ?? "",
            })
        }
        setIsEditDialogOpen(true)
    }

    const handleEditSave = async () => {
        if (!selectedUser) return
        setSavingEdit(true)
        let result
        if (selectedUser.type === "mentor") {
            result = await adminEditMentor(selectedUser.id, {
                first_name: editForm.first_name as string,
                last_name: editForm.last_name as string,
                email: editForm.email as string,
                mentor_capacity: Number(editForm.mentor_capacity),
            })
        } else {
            result = await adminEditMentee(selectedUser.id, {
                group_name: editForm.group_name as string,
                research_title: editForm.research_title as string,
                email: editForm.email as string,
            })
        }
        if (result.success) {
            // update local state
            if (selectedUser.type === "mentor") {
                setMentors(prev => prev.map(m =>
                    m.id === selectedUser.id ? { ...m, ...editForm } : m
                ))
            } else {
                setMentees(prev => prev.map(m =>
                    m.id === selectedUser.id ? { ...m, ...editForm } : m
                ))
            }
            setIsEditDialogOpen(false)
            toast.success("Changes saved")
        } else {
            toast.error(result.message ?? "Failed to save changes")
        }
        setSavingEdit(false)
    }

    const openDeleteDialog = (user: any) => {
        setUserToDelete(user)
        setIsDeleteDialogOpen(true)
    }

    const handlePostAnnouncement = async () => {
        if (!annForm.title.trim() || !annForm.body.trim()) return
        setPostingAnn(true)
        const result = await createAnnouncement(annForm.title, annForm.body, annForm.target)
        if (result.success && result.data) {
            setAnnouncements(prev => [result.data!, ...prev])
            setAnnForm({ title: "", body: "", target: "all" })
            toast.success("Announcement posted")
        } else {
            toast.error(result.message ?? "Failed to post announcement")
        }
        setPostingAnn(false)
    }

    const handleDeleteAnnouncement = async (id: string) => {
        setDeletingAnn(id)
        const result = await deleteAnnouncement(id)
        if (result.success) {
            setAnnouncements(prev => prev.filter(a => a.id !== id))
            toast.success("Announcement deleted")
        } else {
            toast.error(result.message ?? "Failed to delete announcement")
        }
        setDeletingAnn(null)
    }

    const handleCreateUser = async () => {
        setCreatingUser(true)
        let result
        if (createRole === "mentor") {
            result = await adminCreateMentor({
                email: createForm.email,
                password: createForm.password,
                first_name: createForm.first_name,
                last_name: createForm.last_name,
            })
        } else {
            result = await adminCreateMentee({
                email: createForm.email,
                password: createForm.password,
                group_name: createForm.group_name,
                research_title: createForm.research_title,
                research_description: createForm.research_description,
                mentor_preference: createForm.mentor_preference,
                group_members: createMembers.map(m => JSON.stringify(m)),
            })
        }
        if (result.success) {
            const userResult = await getAllUserData()
            if (userResult.success) {
                setMentors(userResult.data.mentors ?? [])
                setMentees(userResult.data.mentee ?? [])
            }
            setCreateForm({ email: "", password: "", first_name: "", last_name: "", group_name: "", research_title: "", research_description: "", mentor_preference: "" })
            setCreateMembers([{ name: "", student_number: "" }])
            setIsCreateDialogOpen(false)
            toast.success(`${createRole === "mentor" ? "Mentor" : "Mentee"} account created`)
        } else {
            toast.error(result.message ?? "Failed to create user")
        }
        setCreatingUser(false)
    }

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return
        setDeletingUser(true)
        const result = await adminDeleteUser(userToDelete.id, userToDelete.type)
        if (result.success) {
            if (userToDelete.type === "mentor") {
                setMentors(prev => prev.filter(m => m.id !== userToDelete.id))
            } else {
                setMentees(prev => prev.filter(m => m.id !== userToDelete.id))
            }
            setIsDeleteDialogOpen(false)
            setUserToDelete(null)
            toast.success("User deleted")
        } else {
            toast.error(result.message ?? "Failed to delete user")
        }
        setDeletingUser(false)
    }

    useEffect(() => {
        const fetchData = async () => {
            const [userResult, annResult] = await Promise.all([
                getAllUserData(),
                getAnnouncements("mentor"), // fetches "all" + "mentor" — admin sees everything
            ])
            if (userResult.success) {
                setMentors(userResult.data.mentors ?? [])
                setMentees(userResult.data.mentee ?? [])
            }
            if (annResult.success) setAnnouncements(annResult.data)
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
    const capacityGap = mentees.length - totalCapacity   // negative = surplus, positive = deficit

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

                    {/* ── OVERVIEW ── */}
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

                        {/* Capacity Balance Banner */}
                        <div className={`flex items-center gap-3 p-4 rounded-lg border mt-4 ${capacityGap > 0
                            ? "bg-red-50 border-red-200"
                            : capacityGap < 0
                                ? "bg-blue-50 border-blue-200"
                                : "bg-green-50 border-green-200"
                            }`}>
                            {capacityGap > 0
                                ? <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                : <CheckCircle2 className={`w-5 h-5 shrink-0 ${capacityGap < 0 ? "text-blue-600" : "text-green-600"}`} />
                            }
                            <div className="flex-1">
                                <p className={`font-semibold text-sm ${capacityGap > 0 ? "text-red-700" : capacityGap < 0 ? "text-blue-700" : "text-green-700"}`}>
                                    {capacityGap > 0
                                        ? `Capacity deficit — ${capacityGap} mentee group${capacityGap > 1 ? "s" : ""} cannot be matched`
                                        : capacityGap < 0
                                            ? `Capacity surplus — ${Math.abs(capacityGap)} extra slot${Math.abs(capacityGap) > 1 ? "s" : ""} available`
                                            : "Capacity balanced — all mentee groups can be matched"}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Total mentor capacity: <strong>{totalCapacity}</strong> &nbsp;|&nbsp; Registered mentee groups: <strong>{mentees.length}</strong>
                                    {capacityGap > 0 && " — increase mentor capacities below before running matching"}
                                </p>
                            </div>
                        </div>

                        {/* Run Matching Button */}
                        <div className="flex items-center gap-4 mt-4">
                            <Button
                                onClick={handleRunMatching}
                                disabled={matching || rollingBack}
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
                            <Button
                                variant="outline"
                                onClick={() => setIsRollbackDialogOpen(true)}
                                disabled={matching || rollingBack}
                                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Rollback Matches
                            </Button>
                            {matchResult && (
                                <p className={`text-sm ${matchResult.success ? "text-green-600" : "text-red-600"}`}>
                                    {matchResult.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── ANNOUNCEMENTS ── */}
                    <div id="announcements">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-blue-600" /> Announcements
                                </CardTitle>
                                <CardDescription>Post announcements visible on mentor and mentee dashboards</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Compose form */}
                                <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-700">New Announcement</h3>
                                    <div className="space-y-1">
                                        <Label htmlFor="ann-title">Title</Label>
                                        <Input
                                            id="ann-title"
                                            placeholder="Announcement title"
                                            value={annForm.title}
                                            onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ann-body">Message</Label>
                                        <Textarea
                                            id="ann-body"
                                            placeholder="Write your announcement here…"
                                            rows={3}
                                            value={annForm.body}
                                            onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="space-y-1 flex-1">
                                            <Label>Audience</Label>
                                            <Select
                                                value={annForm.target}
                                                onValueChange={v => setAnnForm(f => ({ ...f, target: v as Announcement["target"] }))}
                                            >
                                                <SelectTrigger className="w-44">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Everyone</SelectItem>
                                                    <SelectItem value="mentor">Mentors only</SelectItem>
                                                    <SelectItem value="mentee">Mentees only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            className="bg-blue-600 hover:bg-blue-700 self-end"
                                            disabled={postingAnn || !annForm.title.trim() || !annForm.body.trim()}
                                            onClick={handlePostAnnouncement}
                                        >
                                            <Megaphone className="w-4 h-4 mr-2" />
                                            {postingAnn ? "Posting…" : "Post"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Existing announcements */}
                                {announcements.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic text-center py-4">No announcements yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {announcements.map(ann => (
                                            <div key={ann.id} className="border rounded-lg p-4 bg-white flex gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-slate-800 text-sm">{ann.title}</p>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                ann.target === "mentor" ? "text-blue-700 border-blue-200 bg-blue-50 text-xs" :
                                                                    ann.target === "mentee" ? "text-green-700 border-green-200 bg-green-50 text-xs" :
                                                                        "text-slate-600 border-slate-200 bg-slate-50 text-xs"
                                                            }
                                                        >
                                                            {ann.target === "all" ? "Everyone" : ann.target === "mentor" ? "Mentors" : "Mentees"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 whitespace-pre-line">{ann.body}</p>
                                                    <p className="text-xs text-slate-400 mt-1.5">
                                                        {new Date(ann.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                                    disabled={deletingAnn === ann.id}
                                                    onClick={() => handleDeleteAnnouncement(ann.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── USER MANAGEMENT ── */}
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
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={() => {
                                            setCreateForm({ email: "", password: "", first_name: "", last_name: "", group_name: "", research_title: "", research_description: "", mentor_preference: "" })
                                            setCreateMembers([{ name: "", student_number: "" }])
                                            setCreateRole("mentee")
                                            setIsCreateDialogOpen(true)
                                        }}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" /> Create User
                                    </Button>
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
                                                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteDialog(user)}>
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

                    {/* ── MENTOR CAPACITY ── */}
                    <div id="matches">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-600" /> Mentor Capacity Tracking
                                </CardTitle>
                                <CardDescription>Overview of mentor capacities and remaining slots</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {/* Balance vs mentees */}
                                    <div className={`p-4 rounded-lg border ${capacityGap > 0 ? "bg-red-50 border-red-200"
                                        : capacityGap < 0 ? "bg-blue-50 border-blue-200"
                                            : "bg-green-50 border-green-200"
                                        }`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-sm">
                                                {capacityGap > 0
                                                    ? `⚠️ Deficit: ${capacityGap} slot${capacityGap > 1 ? "s" : ""} short`
                                                    : capacityGap < 0
                                                        ? `ℹ️ Surplus: ${Math.abs(capacityGap)} extra slot${Math.abs(capacityGap) > 1 ? "s" : ""}`
                                                        : "✅ Balanced"}
                                            </span>
                                            <span className="text-sm text-slate-600">
                                                Capacity <strong>{totalCapacity}</strong> / Mentees <strong>{mentees.length}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    {/* Utilization bar */}
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">Overall Capacity Utilization</span>
                                            <span className="text-sm text-slate-600">
                                                {totalAssigned} / {mentees.length} mentees assigned ({mentees.length ? Math.round((totalAssigned / mentees.length) * 100) : 0}%)
                                            </span>
                                        </div>
                                        <Progress value={mentees.length ? (totalAssigned / mentees.length) * 100 : 0} className="h-3" />
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mentor</TableHead>
                                            <TableHead>Capacity</TableHead>
                                            <TableHead>Assigned</TableHead>
                                            <TableHead>Remaining</TableHead>
                                            <TableHead>Utilization</TableHead>
                                            <TableHead>Override Capacity</TableHead>
                                            <TableHead>Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mentors.map((mentor) => {
                                            const assigned = mentor.matches?.length ?? 0
                                            const capacity = mentor.mentor_capacity ?? 0
                                            const remaining = capacity - assigned
                                            const utilizationPercent = capacity ? (assigned / capacity) * 100 : 0
                                            const draftCap = capacityEdits[mentor.id] ?? capacity
                                            const isDirty = capacityEdits[mentor.id] !== undefined && capacityEdits[mentor.id] !== capacity
                                            const isSaving = savingCapacity === mentor.id
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
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                min={assigned}
                                                                max={20}
                                                                value={draftCap}
                                                                onChange={(e) =>
                                                                    setCapacityEdits((prev) => ({
                                                                        ...prev,
                                                                        [mentor.id]: Number(e.target.value),
                                                                    }))
                                                                }
                                                                className="w-20 h-8 text-sm"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                disabled={!isDirty || isSaving}
                                                                onClick={() => handleCapacitySave(mentor.id)}
                                                                className="h-8 bg-blue-600 hover:bg-blue-700 text-xs px-2"
                                                            >
                                                                {isSaving ? "Saving…" : "Save"}
                                                            </Button>
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

                    {/* ── REGISTERED MENTORS ── */}
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
                                            <Card
                                                key={mentor.id}
                                                className="border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                                                onClick={() => setSelectedMentorCard(mentor)}
                                            >
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

                    {/* ── REGISTERED MENTEE GROUPS ── */}
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

                    {/* ── ALGORITHM LOGS ── */}
                    <div id="alerts">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-600" /> Algorithm Flow Logs
                                </CardTitle>
                                <CardDescription>
                                    {matchLog
                                        ? `Last run: ${new Date(matchLog.timestamp).toLocaleString()}`
                                        : "Run the matching algorithm to see real-time logs"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!matchLog ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p className="font-medium">No logs yet</p>
                                        <p className="text-sm mt-1">Click "Run Matching Algorithm" above to generate logs.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">

                                        {/* Phase 1: Data Collection */}
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="p-4 bg-blue-50 border-b border-blue-200">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-semibold">Phase 1: Data Collection & Preprocessing</h3>
                                                    <span className="text-sm text-slate-500">{new Date(matchLog.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Mentor profiles loaded</p>
                                                        <p className="text-xs text-slate-500">{matchLog.phase1.mentors_count} mentor profiles successfully parsed and indexed.</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Mentee group profiles loaded</p>
                                                        <p className="text-xs text-slate-500">{matchLog.phase1.mentees_count} mentee groups successfully parsed and indexed.</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Keyword extraction complete</p>
                                                        <p className="text-xs text-slate-500">TF-IDF with bigram prioritization and domain expansion applied to all profiles.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phase 2: Compatibility Scoring */}
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="p-4 bg-emerald-50 border-b border-emerald-200">
                                                <h3 className="font-semibold">Phase 2: Compatibility Scoring</h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Cosine similarity computed</p>
                                                        <p className="text-xs text-slate-500">TF-IDF keyword vectors compared across all mentor-mentee pairs.</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Weighted scores applied</p>
                                                        <p className="text-xs text-slate-500">Keyword similarity (70%), availability (20%), experience (10%)</p>
                                                    </div>
                                                </div>

                                                {/* Score table per mentee */}
                                                {matchLog.phase2.scores?.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="font-medium text-sm mb-3">Top compatibility scores per mentee group:</p>
                                                        <div className="space-y-3">
                                                            {matchLog.phase2.scores.map((entry: any) => (
                                                                <div key={entry.mentee_id} className="border rounded-lg p-3 bg-white">
                                                                    <p className="font-semibold text-sm text-gray-800 mb-2">{entry.mentee_name}</p>
                                                                    <div className="space-y-1">
                                                                        {entry.top_matches.map((match: any, idx: number) => (
                                                                            <div key={idx} className="flex flex-wrap items-center justify-between text-xs bg-gray-50 rounded px-3 py-2 gap-2">
                                                                                <span className="font-medium w-32 shrink-0">{match.mentor_name}</span>
                                                                                <div className="flex gap-2 text-slate-500 flex-wrap">
                                                                                    <span>keyword: <strong>{match.keyword_score}</strong></span>
                                                                                    <span>exp: <strong>{match.experience_score}</strong></span>
                                                                                    <span>avail: <strong>{match.availability_score}</strong></span>
                                                                                    <span>comm: <strong>{match.communication_score}</strong></span>
                                                                                    <span>freq: <strong>{match.meeting_frequency_score}</strong></span>
                                                                                    <span className="text-blue-600 font-semibold">
                                                                                        final: {(match.final_score * 100).toFixed(1)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.communication_mode && (
                                                                                    <Badge variant="outline" className="text-xs">
                                                                                        {match.communication_mode}
                                                                                    </Badge>
                                                                                )}
                                                                                <div className="flex gap-1 flex-wrap">
                                                                                    {match.matched_keywords?.slice(0, 3).map((kw: string) => (
                                                                                        <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phase 3: Matching */}
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="p-4 bg-amber-50 border-b border-amber-200">
                                                <h3 className="font-semibold">Phase 3: Hospital-Resident Matching (Gale-Shapley)</h3>
                                            </div>
                                            <div className="p-4 space-y-3">

                                                {/* Preferences */}
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div className="w-full">
                                                        <p className="font-medium text-sm mb-2">Preference lists generated</p>
                                                        <div className="grid md:grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600 mb-2">Mentee Preferences (top 3 mentors):</p>
                                                                <div className="space-y-1">
                                                                    {matchLog.phase3.preferences?.mentee_preferences?.map((pref: any) => (
                                                                        <div key={pref.mentee_name} className="text-xs text-slate-600 bg-white rounded px-2 py-1">
                                                                            <span className="font-medium text-gray-800">{pref.mentee_name}:</span>{" "}
                                                                            <span>{pref.ranked_mentors.slice(0, 3).join(" → ")}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600 mb-2">Mentor Preferences (top 3 mentees):</p>
                                                                <div className="space-y-1">
                                                                    {matchLog.phase3.preferences?.mentor_preferences?.map((pref: any) => (
                                                                        <div key={pref.mentor_name} className="text-xs text-slate-600 bg-white rounded px-2 py-1">
                                                                            <span className="font-medium text-gray-800">{pref.mentor_name}:</span>{" "}
                                                                            <span>{pref.ranked_mentees.slice(0, 3).join(" → ")}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Mentee-optimal HR completed</p>
                                                        <p className="text-xs text-slate-500">{matchLog.phase3.mentee_optimal_matches} pairs matched (best outcome for mentees)</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Mentor-optimal HR completed</p>
                                                        <p className="text-xs text-slate-500">{matchLog.phase3.mentor_optimal_matches} pairs matched (best outcome for mentors)</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-sm">Fairer matching selected</p>
                                                        <p className="text-xs text-slate-500">
                                                            Selected: <strong>{matchLog.phase3.selected_algorithm}</strong> — minimizes combined dissatisfaction from both sides
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`flex items-start gap-3 p-3 rounded-lg ${matchLog.phase3.is_stable ? "bg-green-50" : "bg-red-50"}`}>
                                                    {matchLog.phase3.is_stable
                                                        ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                                        : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                                    }
                                                    <div>
                                                        <p className="font-medium text-sm">Stability verification</p>
                                                        <p className="text-xs text-slate-500">
                                                            {matchLog.phase3.is_stable
                                                                ? " Matching is stable — no blocking pairs found"
                                                                : " Blocking pairs detected — matching may be unstable"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Final Matches */}
                                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5" />
                                                Final Matches ({matchLog.matched} matched
                                                {matchLog.unmatched > 0 && `, ${matchLog.unmatched} unmatched`})
                                            </h3>
                                            <div className="space-y-2">
                                                {matchLog.phase3.matches?.map((match: any, idx: number) => (
                                                    <div key={idx} className="flex flex-wrap items-center justify-between p-2 bg-white rounded gap-2">
                                                        <span className="font-medium text-sm w-36 shrink-0">{match.mentee_name}</span>
                                                        <span className="text-emerald-600 text-sm">→ {match.mentor_name}</span>
                                                        <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded">score: {match.score}</span>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {match.keywords?.slice(0, 3).map((kw: string) => (
                                                                <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>

            {/* ── Edit User Dialog ── */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit {selectedUser?.type === "mentor" ? "Mentor" : "Mentee"}</DialogTitle>
                        <DialogDescription>
                            Update the details for this user. Changes are saved immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {selectedUser?.type === "mentor" ? (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>First Name</Label>
                                        <Input
                                            value={editForm.first_name as string ?? ""}
                                            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Last Name</Label>
                                        <Input
                                            value={editForm.last_name as string ?? ""}
                                            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={editForm.email as string ?? ""}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Mentor Capacity</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={editForm.mentor_capacity as number ?? 1}
                                        onChange={(e) => setEditForm({ ...editForm, mentor_capacity: Number(e.target.value) })}
                                        className="w-28"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <Label>Group Name</Label>
                                    <Input
                                        value={editForm.group_name as string ?? ""}
                                        onChange={(e) => setEditForm({ ...editForm, group_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Research Title</Label>
                                    <Input
                                        value={editForm.research_title as string ?? ""}
                                        onChange={(e) => setEditForm({ ...editForm, research_title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={editForm.email as string ?? ""}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSave} disabled={savingEdit} className="bg-blue-600 hover:bg-blue-700">
                            {savingEdit ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Mentor Mentees Dialog ── */}
            <Dialog open={!!selectedMentorCard} onOpenChange={(open) => !open && setSelectedMentorCard(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedMentorCard?.first_name} {selectedMentorCard?.last_name}</DialogTitle>
                        <DialogDescription>
                            {selectedMentorCard?.matches?.length ?? 0} assigned mentee group{(selectedMentorCard?.matches?.length ?? 0) !== 1 ? "s" : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        {!selectedMentorCard?.matches?.length ? (
                            <div className="py-8 text-center text-slate-500 text-sm">No mentees assigned yet.</div>
                        ) : (
                            <div className="space-y-3 p-1">
                                {selectedMentorCard.matches.map((match: any, idx: number) => {
                                    const mentee = match.mentee
                                    if (!mentee) return null
                                    return (
                                        <div key={idx} className="border rounded-lg p-4 space-y-2 bg-slate-50">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-sm">{mentee.group_name}</p>
                                                <Badge className="bg-green-100 text-green-800 text-xs">
                                                    {Math.round((match.compatibility_score ?? 0) * 100)}% match
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-600 line-clamp-2">{mentee.research_title}</p>
                                            {match.matched_keywords?.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {match.matched_keywords.slice(0, 3).map((kw: string) => (
                                                        <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedMentorCard(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Rollback Confirmation Dialog ── */}
            <Dialog open={isRollbackDialogOpen} onOpenChange={setIsRollbackDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Rollback All Matches</DialogTitle>
                        <DialogDescription>
                            This will delete <strong>all existing matches</strong> from the database so you can run the algorithm fresh. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRollbackDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleRollback}
                            disabled={rollingBack}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {rollingBack ? "Rolling back..." : "Rollback"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>
                                {userToDelete?.type === "mentor"
                                    ? `${userToDelete.first_name} ${userToDelete.last_name}`
                                    : userToDelete?.group_name}
                            </strong>?
                            This action cannot be undone and will remove all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            disabled={deletingUser}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deletingUser ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Create User Dialog ── */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create User</DialogTitle>
                        <DialogDescription>
                            Create a new mentor or mentee account.
                            {createRole === "mentor" && " The mentor will complete their full profile on first login."}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-1">
                        <div className="space-y-4 py-2 px-1">
                            {/* Role selector */}
                            <div className="space-y-1">
                                <Label>Account Type</Label>
                                <Select value={createRole} onValueChange={(v) => setCreateRole(v as "mentor" | "mentee")}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mentee">Mentee</SelectItem>
                                        <SelectItem value="mentor">Mentor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Shared fields */}
                            <div className="space-y-1">
                                <Label>Email *</Label>
                                <Input
                                    type="email"
                                    placeholder="user@fit.edu.ph"
                                    value={createForm.email}
                                    onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Temporary Password *</Label>
                                <div className="relative">
                                    <Input
                                        type={showCreatePassword ? "text" : "password"}
                                        placeholder="At least 8 characters"
                                        value={createForm.password}
                                        onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                        onClick={() => setShowCreatePassword(p => !p)}
                                    >
                                        {showCreatePassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 text-gray-400" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Mentor-specific fields */}
                            {createRole === "mentor" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>First Name *</Label>
                                        <Input
                                            placeholder="Juan"
                                            value={createForm.first_name}
                                            onChange={e => setCreateForm(f => ({ ...f, first_name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Last Name *</Label>
                                        <Input
                                            placeholder="Dela Cruz"
                                            value={createForm.last_name}
                                            onChange={e => setCreateForm(f => ({ ...f, last_name: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Mentee-specific fields */}
                            {createRole === "mentee" && (
                                <>
                                    <div className="space-y-1">
                                        <Label>Group Name *</Label>
                                        <Input
                                            placeholder="e.g. Fortis Programmatores"
                                            value={createForm.group_name}
                                            onChange={e => setCreateForm(f => ({ ...f, group_name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Research / Thesis Title *</Label>
                                        <Textarea
                                            rows={2}
                                            placeholder="Enter research title"
                                            value={createForm.research_title}
                                            onChange={e => setCreateForm(f => ({ ...f, research_title: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Research Description *</Label>
                                        <Textarea
                                            rows={3}
                                            placeholder="Describe the research, tools, and algorithms"
                                            value={createForm.research_description}
                                            onChange={e => setCreateForm(f => ({ ...f, research_description: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Mentor Preferences *</Label>
                                        <Textarea
                                            rows={2}
                                            placeholder="What the group looks for in a mentor"
                                            value={createForm.mentor_preference}
                                            onChange={e => setCreateForm(f => ({ ...f, mentor_preference: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Group Members *</Label>
                                        {createMembers.map((member, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input
                                                    placeholder="Member name"
                                                    value={member.name}
                                                    onChange={e => setCreateMembers(prev => prev.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))}
                                                />
                                                <Input
                                                    placeholder="Student no."
                                                    type="number"
                                                    value={member.student_number}
                                                    onChange={e => setCreateMembers(prev => prev.map((m, i) => i === idx ? { ...m, student_number: e.target.value } : m))}
                                                    className="w-36"
                                                />
                                                {idx > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => setCreateMembers(prev => prev.filter((_, i) => i !== idx))}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCreateMembers(prev => [...prev, { name: "", student_number: "" }])}
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Add Member
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreateUser}
                            disabled={
                                creatingUser ||
                                !createForm.email ||
                                !createForm.password ||
                                (createRole === "mentor" && (!createForm.first_name || !createForm.last_name)) ||
                                (createRole === "mentee" && (!createForm.group_name || !createForm.research_title || !createForm.research_description || !createForm.mentor_preference || !createMembers[0]?.name))
                            }
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {creatingUser ? "Creating..." : `Create ${createRole === "mentor" ? "Mentor" : "Mentee"}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Toaster richColors position="top-right" />
        </div>
    )
}
