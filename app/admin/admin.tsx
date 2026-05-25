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
  EyeOff,
  Edit,
  CheckCircle2,
  XCircle,
  FileText,
  CheckCircle,
  UserPlus,
  Plus,
  X,
  Scale,
  Loader2,
  Crown,
  ChevronDown,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getAllUserData, overrideMentorCapacity, adminEditMentor, adminEditMentee, adminDeleteUser, rollbackMatches, adminCreateMentor, adminCreateMentee, getMentorDetail, getMenteeDetail, cleanupOrphanedMentees, getLatestAlgorithmLog, fetchPapersByORCID, fetchPapersByIEEE, setMentorAdminRole, adminUpdateMentorPassword, adminUpdateMentorEmail } from "@/lib/actions/adminActions"
import type { PublishedPaper, PrevMentoredThesis } from "@/types/mentorTypes"
import type { GroupMembers } from "@/types/menteeTypes"
import { AvailabilitySelector } from "@/components/ui/AvailabilitySelector"
import { Skeleton } from "@/components/ui/skeleton"
import { getAnnouncements, createAnnouncement, deleteAnnouncement, type Announcement } from "@/lib/actions/announcementActions"
import { Textarea } from "@/components/ui/textarea"
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

function mergePapers(existing: PublishedPaper[], incoming: PublishedPaper[]): PublishedPaper[] {
  const merged = [...existing]
  for (const paper of incoming) {
    const normTitle = paper.title.toLowerCase().trim()
    const isDup = merged.some(p =>
      (paper.url && p.url && p.url === paper.url) ||
      p.title.toLowerCase().trim() === normTitle
    )
    if (!isDup) merged.push(paper)
  }
  return merged
}

export default function Admin() {
  const [mentors, setMentors] = useState<any[]>([])
  const [mentees, setMentees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [userFilter, setUserFilter] = useState("all")
  const [selectedMentorCard, setSelectedMentorCard] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string | number>>({})
  const [editMentorPapers, setEditMentorPapers] = useState<PublishedPaper[]>([])
  const [editMentorSkills, setEditMentorSkills] = useState<string[]>([])
  const [editMentorForte, setEditMentorForte] = useState<string[]>([])
  const [editMentorTheses, setEditMentorTheses] = useState<PrevMentoredThesis[]>([])
  const [editMentorAvailDays, setEditMentorAvailDays] = useState<string[]>([])
  const [editMentorTimeSlots, setEditMentorTimeSlots] = useState<string[]>([])
  const [editMenteeAvailDays, setEditMenteeAvailDays] = useState<string[]>([])
  const [editMenteeTimeSlots, setEditMenteeTimeSlots] = useState<string[]>([])
  const [editMenteeMembers, setEditMenteeMembers] = useState<GroupMembers[]>([])
  const [editMenteeLeaderIndex, setEditMenteeLeaderIndex] = useState(0)
  const [skillInput, setSkillInput] = useState("")
  const [forteInput, setForteInput] = useState("")
  const [fetchingPapers, setFetchingPapers] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [matchingMode, setMatchingMode] = useState<string | null>(null)
  const matching = matchingMode !== null
  const [matchResult, setMatchResult] = useState<any>(null)
  const [matchLog, setMatchLog] = useState<any>(null)
  const [visibleUsers, setVisibleUsers] = useState(10)
  const [visibleCapacity, setVisibleCapacity] = useState(8)
  const [visibleMentorGrid, setVisibleMentorGrid] = useState(6)
  const [visibleMentees, setVisibleMentees] = useState(8)
  const [visibleScores, setVisibleScores] = useState(5)
  const [visibleMentorScores, setVisibleMentorScores] = useState(5)
  const [visibleMatches, setVisibleMatches] = useState(5)
  const [showAllProposals, setShowAllProposals] = useState(false)
  const [phase1Open, setPhase1Open] = useState(false)
  const [phase2Open, setPhase2Open] = useState(false)
  const [phase3Open, setPhase3Open] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)
  const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false)
  // capacity override state: mentorId → draft value while editing
  const [capacityEdits, setCapacityEdits] = useState<Record<string, number>>({})
  const [savingCapacity, setSavingCapacity] = useState<string | null>(null)

  const [mentorDetailCache, setMentorDetailCache] = useState<Record<string, { technical_skills?: string[]; forte?: string[]; self_description?: string; published_papers?: PublishedPaper[] }>>({})
  const [menteeDetailCache, setMenteeDetailCache] = useState<Record<string, { research_description?: string; mentor_preference?: string; time_slot?: string[]; available_days?: string[] }>>({})

  const loadMentorDetail = async (id: string) => {
    if (mentorDetailCache[id]) return
    const r = await getMentorDetail(id)
    if (!r.success || !r.data) return
    const data = r.data
    setMentorDetailCache(prev => ({ ...prev, [id]: data }))
  }
  const loadMenteeDetail = async (id: string) => {
    if (menteeDetailCache[id]) return
    const r = await getMenteeDetail(id)
    if (!r.success || !r.data) return
    const data = r.data
    setMenteeDetailCache(prev => ({ ...prev, [id]: data }))
  }

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
  const [createLeaderIndex, setCreateLeaderIndex] = useState(0)
  const [creatingUser, setCreatingUser] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null)
  const [editNewPassword, setEditNewPassword] = useState("")
  const [showEditPassword, setShowEditPassword] = useState(false)

  const handleToggleAdmin = async (mentorId: string, currentIsAdmin: boolean) => {
    setTogglingAdmin(mentorId)
    const result = await setMentorAdminRole(mentorId, !currentIsAdmin)
    if (result.success) {
      setMentors(prev => prev.map(m => m.id === mentorId ? { ...m, is_admin: !currentIsAdmin } : m))
      toast.success(!currentIsAdmin ? "Mentor promoted to admin" : "Admin access removed")
    } else {
      toast.error(result.message ?? "Failed to update admin role")
    }
    setTogglingAdmin(null)
  }

  const handleRunMatching = async () => {
    const mode = "fair-matching"
    setMatchingMode(mode)
    try {
      const res = await fetch("/api/run-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
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
    setMatchingMode(null)
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
    if (newCap === undefined || newCap < 0) return
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

  const openEditDialog = async (user: any) => {
    setSelectedUser(user)
    setSkillInput("")
    setForteInput("")
    setEditNewPassword("")
    setShowEditPassword(false)
    if (user.type === "mentor") {
      setEditForm({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        email: user.email ?? "",
        mentor_capacity: user.mentor_capacity ?? 1,
        experience: "",
        self_description: "",
        profile_completed: "",
        orcid: "",
        ieee_id: "",
      })
      setEditMentorPapers([])
      setEditMentorSkills([])
      setEditMentorForte([])
      setEditMentorTheses([])
      setEditMentorAvailDays([])
      setEditMentorTimeSlots([])
      const detail = await getMentorDetail(user.id)
      if (detail.success && detail.data) {
        const d = detail.data as any
        setEditForm(prev => ({
          ...prev,
          experience: d.experience ?? 0,
          self_description: d.self_description ?? "",
          profile_completed: d.profile_completed ? "true" : "false",
          orcid: d.orcid ?? "",
          ieee_id: d.ieee_id ?? "",
        }))
        setEditMentorSkills(Array.isArray(d.technical_skills) ? d.technical_skills : [])
        setEditMentorForte(Array.isArray(d.forte) ? d.forte : [])
        setEditMentorTheses(Array.isArray(d.prev_mentored_thesis) ? d.prev_mentored_thesis : [])
        setEditMentorAvailDays(Array.isArray(d.available_days) ? d.available_days : [])
        setEditMentorTimeSlots(Array.isArray(d.time_slot) ? d.time_slot : [])
        setEditMentorPapers(Array.isArray(d.published_papers) ? d.published_papers : [])
        setMentorDetailCache(prev => ({ ...prev, [user.id]: d }))
      }
    } else {
      setEditForm({
        group_name: user.group_name ?? "",
        research_title: user.research_title ?? "",
        email: user.email ?? "",
        research_description: "",
        mentor_preference: "",
      })
      setEditMenteeAvailDays([])
      setEditMenteeTimeSlots([])
      setEditMenteeMembers([])
      setEditMenteeLeaderIndex(0)
      const detail = await getMenteeDetail(user.id)
      if (detail.success && detail.data) {
        const d = detail.data as any
        setEditForm(prev => ({
          ...prev,
          research_description: d.research_description ?? "",
          mentor_preference: d.mentor_preference ?? "",
        }))
        setEditMenteeAvailDays(Array.isArray(d.available_days) ? d.available_days : [])
        setEditMenteeTimeSlots(Array.isArray(d.time_slot) ? d.time_slot : [])
        const parsedMembers: GroupMembers[] = (d.group_members ?? []).map((m: string) => {
          try { return JSON.parse(m) } catch { return { name: m, student_number: "" } }
        })
        setEditMenteeMembers(parsedMembers)
        const leaderIdx = parsedMembers.findIndex(m => m.is_leader)
        setEditMenteeLeaderIndex(leaderIdx >= 0 ? leaderIdx : 0)
      }
    }
    setIsEditDialogOpen(true)
  }

  const handleEditSave = async () => {
    if (!selectedUser) return
    setSavingEdit(true)
    let result
    if (selectedUser.type === "mentor") {
      if ((editForm.email as string) !== selectedUser.email) {
        const emailResult = await adminUpdateMentorEmail(selectedUser.id, editForm.email as string)
        if (!emailResult.success) {
          toast.error(emailResult.message ?? "Failed to update email")
          setSavingEdit(false)
          return
        }
      }

      result = await adminEditMentor(selectedUser.id, {
        first_name: editForm.first_name as string,
        last_name: editForm.last_name as string,
        email: editForm.email as string,
        mentor_capacity: Number(editForm.mentor_capacity),
        experience: Number(editForm.experience),
        self_description: editForm.self_description as string,
        profile_completed: editForm.profile_completed === "true",
        technical_skills: editMentorSkills,
        forte: editMentorForte,
        available_days: editMentorAvailDays,
        time_slot: editMentorTimeSlots,
        prev_mentored_thesis: editMentorTheses,
        published_papers: editMentorPapers,
        orcid: (editForm.orcid as string) || null,
        ieee_id: (editForm.ieee_id as string) || null,
      })
    } else {
      result = await adminEditMentee(selectedUser.id, {
        group_name: editForm.group_name as string,
        research_title: editForm.research_title as string,
        email: editForm.email as string,
        research_description: editForm.research_description as string,
        mentor_preference: editForm.mentor_preference as string,
        available_days: editMenteeAvailDays,
        time_slot: editMenteeTimeSlots,
        group_members: editMenteeMembers.map((m, idx) =>
          JSON.stringify({ ...m, is_leader: idx === editMenteeLeaderIndex })
        ),
      })
    }
    if (result.success) {
      if (selectedUser.type === "mentor" && editNewPassword.trim()) {
        const pwResult = await adminUpdateMentorPassword(selectedUser.id, editNewPassword.trim())
        if (!pwResult.success) {
          toast.error(pwResult.message ?? "Profile saved but password update failed")
          setSavingEdit(false)
          return
        }
      }
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
        group_members: createMembers.map((m, idx) => JSON.stringify({ ...m, is_leader: idx === createLeaderIndex })),
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
      setCreateLeaderIndex(0)
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
      const [userResult, annResult, logResult] = await Promise.all([
        getAllUserData(),
        getAnnouncements("mentor"), // fetches "all" + "mentor" — admin sees everything
        getLatestAlgorithmLog(),
      ])
      cleanupOrphanedMentees()
      if (userResult.success) {
        setMentors(userResult.data.mentors ?? [])
        setMentees(userResult.data.mentee ?? [])
      }
      if (annResult.success) setAnnouncements(annResult.data)
      if (logResult.success && logResult.log) setMatchLog(logResult.log)
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

  if (loading) return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-8 md:pl-8 pl-16">
          <h1 className="text-3xl font-bold mb-2">Mentor–Mentee Matching System</h1>
          <p className="text-blue-100">Administrative Dashboard</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-8 md:pl-8 pl-16">
          <h1 className="text-3xl font-bold mb-2">Mentor–Mentee Matching System</h1>
          <p className="text-blue-100">Administrative Dashboard</p>
        </div>

        <div className="p-8 space-y-8">

          {/* ── OVERVIEW ── */}
          <div id="overview">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
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

            {/* Run Matching Buttons */}
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col items-start gap-1">
                  <Button
                    onClick={() => handleRunMatching()}
                    disabled={matching || rollingBack}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {matching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Scale className="w-4 h-4 mr-2" />
                        Run Matching
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-400">Runs both HR variants · picks fairer result</p>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <Button
                    variant="outline"
                    onClick={() => setIsRollbackDialogOpen(true)}
                    disabled={matching || rollingBack}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rollback Matches
                  </Button>
                  <p className="text-xs text-slate-400">Undo last run</p>
                </div>
              </div>
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
                <div className="flex flex-wrap items-center gap-3 mt-4">
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
                    {filteredUsers.slice(0, visibleUsers).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.type === "mentor"
                            ? `${user.first_name} ${user.last_name}`
                            : user.group_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={user.type === "mentor" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                              {user.type}
                            </Badge>
                            {user.type === "mentor" && user.is_admin && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                                <Crown className="w-3 h-3" /> Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {user.type === "mentor" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title={user.is_admin ? "Remove admin access" : "Grant admin access"}
                                disabled={togglingAdmin === user.id}
                                className={user.is_admin ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"}
                                onClick={() => handleToggleAdmin(user.id, !!user.is_admin)}
                              >
                                {togglingAdmin === user.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Crown className="w-4 h-4" />}
                              </Button>
                            )}
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
                {filteredUsers.length > 10 && (
                  <button
                    onClick={() => setVisibleUsers(v => v >= filteredUsers.length ? 10 : Math.min(v + 10, filteredUsers.length))}
                    className="text-sm text-blue-600 hover:underline mt-2 w-full text-center py-2"
                  >
                    {visibleUsers >= filteredUsers.length
                      ? "Show Less"
                      : `Show More (${filteredUsers.length - visibleUsers} remaining)`}
                  </button>
                )}
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
                          ? ` Deficit: ${capacityGap} slot${capacityGap > 1 ? "s" : ""} short`
                          : capacityGap < 0
                            ? ` Surplus: ${Math.abs(capacityGap)} extra slot${Math.abs(capacityGap) > 1 ? "s" : ""}`
                            : " Balanced"}
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
                    {mentors.slice(0, visibleCapacity).map((mentor) => {
                      const assigned = mentor.matches?.filter((m: any) => m.status === "active").length ?? 0
                      const capacity = mentor.mentor_capacity ?? 0
                      const remaining = capacity - assigned
                      const utilizationPercent = capacity ? (assigned / capacity) * 100 : 0
                      const draftCap = capacityEdits[mentor.id] ?? capacity
                      const isDirty = capacityEdits[mentor.id] !== undefined && capacityEdits[mentor.id] !== capacity
                      const isSaving = savingCapacity === mentor.id
                      return (
                        <TableRow key={mentor.id} className={capacity === 0 ? "bg-amber-50" : ""}>
                          <TableCell className="font-medium">{mentor.first_name} {mentor.last_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {capacity}
                              {capacity === 0 && (
                                <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">Excluded</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{assigned}</TableCell>
                          <TableCell>
                            {capacity === 0
                              ? <span className="text-xs text-amber-600 font-medium">—</span>
                              : <span className={remaining <= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>{remaining}</span>
                            }
                          </TableCell>
                          <TableCell>
                            {capacity === 0
                              ? <span className="text-xs text-amber-600">Excluded from matching</span>
                              : <div className="w-32">
                                <Progress value={utilizationPercent} className={`h-2 ${utilizationPercent === 100 ? "[&>div]:bg-red-500" : "[&>div]:bg-emerald-500"}`} />
                                <span className="text-xs text-slate-500">{Math.round(utilizationPercent)}% filled</span>
                              </div>
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
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
                            <Dialog onOpenChange={(open) => { if (open) loadMentorDetail(mentor.id) }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-1" /> View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{mentor.first_name} {mentor.last_name}</DialogTitle>
                                  <DialogDescription>Mentor Profile Details</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="max-h-[60vh]">
                                  <div className="space-y-4 p-1">
                                    {/* Info card */}
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                        <p className="text-sm font-semibold text-slate-700">Profile Details</p>
                                      </div>
                                      <div className="p-4 space-y-3">
                                        <div>
                                          <p className="text-xs text-slate-500 mb-0.5">Email</p>
                                          <p className="text-sm font-medium text-slate-900">{mentor.email}</p>
                                        </div>
                                        <div className="h-px bg-slate-100" />
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Forte</p>
                                            {mentorDetailCache[mentor.id] ? (
                                              <div className="flex flex-wrap gap-1">
                                                {(mentorDetailCache[mentor.id].forte ?? []).length > 0
                                                  ? (mentorDetailCache[mentor.id].forte ?? []).map((f: string) => (
                                                    <Badge key={f} variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">{f}</Badge>
                                                  ))
                                                  : <span className="text-xs text-slate-400">Not set</span>}
                                              </div>
                                            ) : <Skeleton className="h-5 w-32" />}
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Technical Skills</p>
                                            {mentorDetailCache[mentor.id] ? (
                                              <div className="flex flex-wrap gap-1">
                                                {(mentorDetailCache[mentor.id].technical_skills ?? []).length > 0
                                                  ? (mentorDetailCache[mentor.id].technical_skills ?? []).map((s: string) => (
                                                    <Badge key={s} variant="outline" className="text-xs border-slate-200 text-slate-600">{s}</Badge>
                                                  ))
                                                  : <span className="text-xs text-slate-400">Not set</span>}
                                              </div>
                                            ) : <Skeleton className="h-5 w-32" />}
                                          </div>
                                        </div>
                                        <div className="h-px bg-slate-100" />
                                        <div>
                                          <p className="text-xs text-slate-500 mb-0.5">Description</p>
                                          {mentorDetailCache[mentor.id] ? (
                                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                              {mentorDetailCache[mentor.id].self_description || <span className="text-slate-400">Not provided</span>}
                                            </p>
                                          ) : <Skeleton className="h-10 w-full" />}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Published Papers */}
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                                        <p className="text-sm font-semibold text-slate-700">Published / Authored Papers</p>
                                        {mentorDetailCache[mentor.id] && (
                                          <span className="ml-auto text-xs text-slate-400">
                                            {(mentorDetailCache[mentor.id].published_papers ?? []).length} entr{(mentorDetailCache[mentor.id].published_papers ?? []).length !== 1 ? "ies" : "y"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="p-4">
                                        {mentorDetailCache[mentor.id] ? (
                                          (() => {
                                            const papers: PublishedPaper[] = mentorDetailCache[mentor.id].published_papers ?? []
                                            return papers.length > 0 ? (
                                              <div className="overflow-x-auto rounded-lg border border-slate-200">
                                                <table className="w-full text-sm">
                                                  <thead className="bg-slate-50 text-slate-500">
                                                    <tr>
                                                      <th className="px-4 py-2.5 text-left font-medium">Title</th>
                                                      <th className="px-4 py-2.5 text-left font-medium">Year</th>
                                                      <th className="px-4 py-2.5 text-left font-medium">Link</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {papers.map((paper, pi) => (
                                                      <tr key={pi} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2.5 text-slate-900 font-medium">{paper.title}</td>
                                                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{paper.year}</td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                          {paper.url ? (
                                                            <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                                                              View ↗
                                                            </a>
                                                          ) : (
                                                            <span className="text-slate-300 text-xs">—</span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ) : (
                                              <p className="text-sm text-slate-400 italic">No published papers listed.</p>
                                            )
                                          })()
                                        ) : (
                                          <Skeleton className="h-16 w-full" />
                                        )}
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
                {mentors.length > 8 && (
                  <button
                    onClick={() => setVisibleCapacity(v => v >= mentors.length ? 8 : Math.min(v + 8, mentors.length))}
                    className="text-sm text-blue-600 hover:underline mt-2 w-full text-center py-2"
                  >
                    {visibleCapacity >= mentors.length
                      ? "Show Less"
                      : `Show More (${mentors.length - visibleCapacity} remaining)`}
                  </button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── REGISTERED MENTORS ── */}
          <div id="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Registered Mentors</CardTitle>
                <CardDescription>Complete list of all registered mentors with their mentees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mentors.slice(0, visibleMentorGrid).map((mentor) => {
                    const assigned = mentor.matches?.filter((m: any) => m.status === "active").length ?? 0
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
                {mentors.length > 6 && (
                  <button
                    onClick={() => setVisibleMentorGrid(v => v >= mentors.length ? 6 : Math.min(v + 6, mentors.length))}
                    className="text-sm text-blue-600 hover:underline mt-3 w-full text-center py-2"
                  >
                    {visibleMentorGrid >= mentors.length
                      ? "Show Less"
                      : `Show More (${mentors.length - visibleMentorGrid} remaining)`}
                  </button>
                )}
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
                    {mentees.slice(0, visibleMentees).map((group) => {
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
                            <Dialog onOpenChange={(open) => { if (open) loadMenteeDetail(group.id) }}>
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
                                <ScrollArea className="max-h-[60vh] overflow-hidden">
                                  <div className="space-y-4 p-4">
                                    <div>
                                      <p className="font-bold">Members</p>
                                      <div className="space-y-1">
                                        {group.group_members?.map((member: string, i: number) => {
                                          try {
                                            const parsed = JSON.parse(member)
                                            return (
                                              <p key={i} className="text-sm flex items-center gap-1.5">
                                                {parsed.is_leader && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                                <span className={parsed.is_leader ? "font-medium" : ""}>
                                                  {parsed.name} ({parsed.student_number})
                                                  {parsed.is_leader && <span className="ml-1 text-xs text-amber-600">Leader</span>}
                                                </span>
                                              </p>
                                            )
                                          } catch {
                                            return <p key={i} className="text-sm">{member}</p>
                                          }
                                        })}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-bold">Thesis Title</p>
                                      <p className="text-sm">{group.research_title}</p>
                                    </div>
                                    <div>
                                      <p className="font-bold">Research Description</p>
                                      {menteeDetailCache[group.id] ? (
                                        <p className="text-sm">{menteeDetailCache[group.id].research_description}</p>
                                      ) : (
                                        <Skeleton className="h-4 w-full mt-1" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold">Mentor Preferences</p>
                                      {menteeDetailCache[group.id] ? (
                                        <p className="text-sm">{menteeDetailCache[group.id].mentor_preference}</p>
                                      ) : (
                                        <Skeleton className="h-4 w-3/4 mt-1" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold">Availability</p>
                                      {menteeDetailCache[group.id] ? (
                                        <p className="text-sm">Days: {menteeDetailCache[group.id].available_days?.join(", ")} | Time: {menteeDetailCache[group.id].time_slot?.join(", ")}</p>
                                      ) : (
                                        <Skeleton className="h-4 w-2/3 mt-1" />
                                      )}
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
                {mentees.length > 8 && (
                  <button
                    onClick={() => setVisibleMentees(v => v >= mentees.length ? 8 : Math.min(v + 8, mentees.length))}
                    className="text-sm text-blue-600 hover:underline mt-2 w-full text-center py-2"
                  >
                    {visibleMentees >= mentees.length
                      ? "Show Less"
                      : `Show More (${mentees.length - visibleMentees} remaining)`}
                  </button>
                )}
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

                    {/* Summary Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{matchLog.matched}</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Matched</p>
                      </div>
                      {matchLog.unmatched > 0 ? (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                          <p className="text-2xl font-bold text-amber-700">{matchLog.unmatched}</p>
                          <p className="text-xs text-amber-600 mt-0.5">Unmatched</p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                          <p className="text-2xl font-bold text-green-700">0</p>
                          <p className="text-xs text-green-600 mt-0.5">Unmatched</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                        <p className="text-sm font-semibold text-slate-700 leading-tight truncate">{matchLog.algorithm}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Algorithm</p>
                      </div>
                      <div className={`rounded-lg border p-3 text-center ${matchLog.is_stable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                        <p className={`text-sm font-semibold ${matchLog.is_stable ? "text-green-700" : "text-red-700"}`}>
                          {matchLog.is_stable ? "Stable" : "Unstable"}
                        </p>
                        <p className={`text-xs mt-0.5 ${matchLog.is_stable ? "text-green-600" : "text-red-600"}`}>Stability</p>
                      </div>
                    </div>

                    {/* Phase 1: Data Collection */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setPhase1Open(v => !v)}
                        className="w-full p-4 bg-blue-50 border-b border-blue-200 flex justify-between items-center text-left"
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">Phase 1: Data Collection & Preprocessing</h3>
                          <span className="text-xs text-slate-500 bg-blue-100 px-2 py-0.5 rounded-full">
                            {matchLog.phase1.mentors_count} mentors · {matchLog.phase1.mentees_count} mentees
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${phase1Open ? "rotate-180" : ""}`} />
                      </button>
                      {phase1Open && (
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
                      )}
                    </div>

                    {/* Phase 2: Compatibility Scoring */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setPhase2Open(v => !v)}
                        className="w-full p-4 bg-emerald-50 border-b border-emerald-200 flex justify-between items-center text-left"
                      >
                        <h3 className="font-semibold">Phase 2: Compatibility Scoring</h3>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${phase2Open ? "rotate-180" : ""}`} />
                      </button>
                      {phase2Open && (
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
                              <p className="text-xs text-slate-500">Keyword similarity (60%), experience (20%), availability (10%), communication (5%), meeting frequency (5%)</p>
                            </div>
                          </div>

                          {/* Score table per mentee */}
                          {matchLog.phase2.scores?.length > 0 && (
                            <div className="mt-4">
                              <p className="font-medium text-sm mb-3">Top compatibility scores per mentee group:</p>
                              <div className="space-y-3">
                                {matchLog.phase2.scores.slice(0, visibleScores).map((entry: any) => (
                                  <div key={entry.mentee_id} className="border rounded-lg p-3 bg-white">
                                    <p className="font-semibold text-sm text-gray-800 mb-2">{entry.mentee_name}</p>
                                    <div className="space-y-2">
                                      {entry.top_matches.map((match: any, idx: number) => {
                                        const scoreColor = match.final_score >= 0.65 ? "bg-green-100 text-green-700"
                                          : match.final_score >= 0.40 ? "bg-amber-100 text-amber-700"
                                          : "bg-red-100 text-red-700"
                                        return (
                                          <div key={idx} className="text-xs bg-gray-50 rounded px-3 py-2 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                                              <span className="font-medium w-32 shrink-0">{match.mentor_name}</span>
                                              <div className="flex gap-2 text-slate-500 flex-wrap flex-1">
                                                <span>kw: <strong>{match.keyword_score}</strong></span>
                                                <span>exp: <strong>{match.experience_score}</strong></span>
                                                <span>avail: <strong>{match.availability_score}</strong></span>
                                                <span>comm: <strong>{match.communication_score}</strong></span>
                                                <span>freq: <strong>{match.meeting_frequency_score}</strong></span>
                                              </div>
                                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${scoreColor}`}>
                                                {(match.final_score * 100).toFixed(1)}%
                                              </span>
                                              {match.communication_mode && (
                                                <Badge variant="outline" className="text-[10px]">{match.communication_mode}</Badge>
                                              )}
                                            </div>
                                            {match.matched_keywords?.length > 0 && (
                                              <div className="flex gap-1 flex-wrap pl-7 pt-1 border-t border-slate-100">
                                                {match.matched_keywords.map((kw: string) => (
                                                  <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                                {matchLog.phase2.scores.length > 5 && (
                                  <button
                                    onClick={() => setVisibleScores(v => v >= matchLog.phase2.scores.length ? 5 : Math.min(v + 5, matchLog.phase2.scores.length))}
                                    className="text-sm text-blue-600 hover:underline mt-1 w-full text-center py-2"
                                  >
                                    {visibleScores >= matchLog.phase2.scores.length
                                      ? "Show Less"
                                      : `Show More (${matchLog.phase2.scores.length - visibleScores} remaining)`}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Score table per mentor */}
                          {matchLog.phase2.mentor_scores?.length > 0 && (
                            <div className="mt-4">
                              <p className="font-medium text-sm mb-3">Top compatibility scores per mentor:</p>
                              <div className="space-y-3">
                                {matchLog.phase2.mentor_scores.slice(0, visibleMentorScores).map((entry: any) => (
                                  <div key={entry.mentor_id} className="border rounded-lg p-3 bg-white">
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="font-semibold text-sm text-gray-800">{entry.mentor_name}</p>
                                      {entry.experience_score != null && (
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">exp: {entry.experience_score}</span>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      {entry.top_matches.map((match: any, idx: number) => {
                                        const scoreColor = match.final_score >= 0.65 ? "bg-green-100 text-green-700"
                                          : match.final_score >= 0.40 ? "bg-amber-100 text-amber-700"
                                          : "bg-red-100 text-red-700"
                                        return (
                                          <div key={idx} className="text-xs bg-gray-50 rounded px-3 py-2 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                                              <span className="font-medium w-32 shrink-0">{match.mentee_name}</span>
                                              <div className="flex gap-2 text-slate-500 flex-wrap flex-1">
                                                <span>kw: <strong>{match.keyword_score}</strong></span>
                                                <span>avail: <strong>{match.availability_score}</strong></span>
                                                <span>comm: <strong>{match.communication_score}</strong></span>
                                                <span>freq: <strong>{match.meeting_frequency_score}</strong></span>
                                              </div>
                                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${scoreColor}`}>
                                                {(match.final_score * 100).toFixed(1)}%
                                              </span>
                                              {match.communication_mode && (
                                                <Badge variant="outline" className="text-[10px]">{match.communication_mode}</Badge>
                                              )}
                                            </div>
                                            {match.matched_keywords?.length > 0 && (
                                              <div className="flex gap-1 flex-wrap pl-7 pt-1 border-t border-slate-100">
                                                {match.matched_keywords.map((kw: string) => (
                                                  <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                                {matchLog.phase2.mentor_scores.length > 5 && (
                                  <button
                                    onClick={() => setVisibleMentorScores(v => v >= matchLog.phase2.mentor_scores.length ? 5 : Math.min(v + 5, matchLog.phase2.mentor_scores.length))}
                                    className="text-sm text-blue-600 hover:underline mt-1 w-full text-center py-2"
                                  >
                                    {visibleMentorScores >= matchLog.phase2.mentor_scores.length
                                      ? "Show Less"
                                      : `Show More (${matchLog.phase2.mentor_scores.length - visibleMentorScores} remaining)`}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Phase 3: Matching */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setPhase3Open(v => !v)}
                        className="w-full p-4 bg-amber-50 border-b border-amber-200 flex justify-between items-center text-left"
                      >
                        <h3 className="font-semibold">Phase 3: Hospital-Resident Matching (Gale-Shapley)</h3>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${phase3Open ? "rotate-180" : ""}`} />
                      </button>
                      {phase3Open && (
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

                          {/* Proposal Phase */}
                          {(() => {
                            const typeColors: Record<string, string> = {
                              propose: "bg-blue-100 text-blue-700",
                              accept: "bg-green-100 text-green-700",
                              reject: "bg-red-100 text-red-700",
                              replace: "bg-orange-100 text-orange-700",
                            }
                            const blocks: { label: string; events: any[]; key: string }[] = []
                            if (matchLog.phase3.proposal_events_mo?.length) {
                              blocks.push({ label: "Mentee-Optimal", events: matchLog.phase3.proposal_events_mo, key: "mo" })
                            }
                            if (matchLog.phase3.proposal_events_meo?.length) {
                              blocks.push({ label: "Mentor-Optimal", events: matchLog.phase3.proposal_events_meo, key: "meo" })
                            }
                            if (blocks.length === 0) return null
                            return blocks.map(({ label, events, key }) => (
                              <div key={key} className="rounded-lg border border-slate-200 overflow-hidden">
                                <div className="p-3 bg-slate-50 border-b border-slate-200">
                                  <p className="text-xs font-semibold text-slate-700">
                                    Proposal Phase · {label} ({events.length} events)
                                  </p>
                                </div>
                                <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
                                  {(showAllProposals ? events : events.slice(0, 20)).map((ev: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs font-mono">
                                      <span className="text-slate-400 w-8 text-right shrink-0">#{ev.round}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${typeColors[ev.type] ?? "bg-slate-100 text-slate-600"}`}>
                                        {ev.type}
                                      </span>
                                      <span className="text-slate-700 truncate">{ev.proposer}</span>
                                      <span className="text-slate-400 shrink-0">→</span>
                                      <span className="text-slate-700 truncate">{ev.to}</span>
                                      {ev.replaced && (
                                        <span className="text-orange-600 truncate">(replaced: {ev.replaced})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {events.length > 20 && (
                                  <button
                                    onClick={() => setShowAllProposals(v => !v)}
                                    className="text-xs text-blue-600 hover:underline w-full text-center py-2 border-t border-slate-100"
                                  >
                                    {showAllProposals ? "Show Less" : `Show All ${events.length} Events`}
                                  </button>
                                )}
                              </div>
                            ))
                          })()}

                          {/* Algorithm comparison + stability */}
                          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-600">Algorithm Comparison</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded bg-slate-50 px-3 py-2 text-center">
                                <p className="text-lg font-bold text-slate-700">{matchLog.phase3.mentee_optimal_matches}</p>
                                <p className="text-[10px] text-slate-500">Mentee-Optimal pairs</p>
                              </div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-center">
                                <p className="text-lg font-bold text-slate-700">{matchLog.phase3.mentor_optimal_matches}</p>
                                <p className="text-[10px] text-slate-500">Mentor-Optimal pairs</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              <p className="text-xs text-slate-600">
                                Selected <strong>{matchLog.phase3.selected_algorithm}</strong> — minimizes combined dissatisfaction
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
                                  ? "Matching is stable — no blocking pairs found"
                                  : "Blocking pairs detected — matching may be unstable"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Final Matches */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Final Matches ({matchLog.matched} matched
                        {matchLog.unmatched > 0 && `, ${matchLog.unmatched} unmatched`})
                      </h3>
                      <div className="space-y-2">
                        {matchLog.phase3.matches?.slice(0, visibleMatches).map((match: any, idx: number) => {
                          const pct = (match.score * 100).toFixed(1)
                          const scoreColor = match.score >= 0.65 ? "bg-green-100 text-green-700"
                            : match.score >= 0.40 ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                          return (
                            <div key={idx} className="p-3 bg-white rounded-lg border border-green-100 space-y-1.5">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-sm flex-1">{match.mentee_name}</span>
                                <span className="text-slate-400 text-sm shrink-0">→</span>
                                <span className="text-emerald-700 font-medium text-sm flex-1 text-right">{match.mentor_name}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${scoreColor}`}>{pct}%</span>
                              </div>
                              {match.keywords?.length > 0 && (
                                <div className="flex gap-1 flex-wrap pl-9">
                                  {match.keywords.map((kw: string) => (
                                    <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                                  ))}
                                </div>
                              )}
                              {match.overlapping_slots?.length > 0 && (
                                <div className="pl-9 flex flex-wrap gap-1 mt-0.5">
                                  <span className="text-[10px] font-medium text-slate-600 self-center mr-1">Schedule:</span>
                                  {(match.overlapping_slots as string[]).map((entry: string) => {
                                    const colon = entry.indexOf(":")
                                    const display = colon !== -1
                                      ? `${entry.slice(0, colon)} ${entry.slice(colon + 1)}`
                                      : entry
                                    return <Badge key={entry} variant="outline" className="text-[10px]">{display}</Badge>
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {(matchLog.phase3.matches?.length ?? 0) > 5 && (
                        <button
                          onClick={() => setVisibleMatches(v => v >= matchLog.phase3.matches.length ? 5 : Math.min(v + 5, matchLog.phase3.matches.length))}
                          className="text-sm text-blue-600 hover:underline mt-2 w-full text-center py-2"
                        >
                          {visibleMatches >= matchLog.phase3.matches.length
                            ? "Show Less"
                            : `Show More (${matchLog.phase3.matches.length - visibleMatches} remaining)`}
                        </button>
                      )}
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {selectedUser?.type === "mentor" ? "Mentor" : "Mentee"}</DialogTitle>
            <DialogDescription>Update all profile details for this user.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            <div className="space-y-6 py-2 pr-3 min-w-0">
              {selectedUser?.type === "mentor" ? (
                <>
                  {/* ── Basic Info ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Basic Info</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>First Name</Label>
                        <Input value={editForm.first_name as string ?? ""} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Last Name</Label>
                        <Input value={editForm.last_name as string ?? ""} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input type="email" value={editForm.email as string ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Experience (years)</Label>
                        <Input type="number" min={0} value={editForm.experience ?? ""} onChange={(e) => setEditForm({ ...editForm, experience: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Mentor Capacity</Label>
                        <Input type="number" min={0} max={20} value={editForm.mentor_capacity as number ?? 1} onChange={(e) => setEditForm({ ...editForm, mentor_capacity: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label>Profile Completed</Label>
                      <input
                        type="checkbox"
                        checked={editForm.profile_completed === "true"}
                        onChange={e => setEditForm({ ...editForm, profile_completed: e.target.checked ? "true" : "false" })}
                        className="w-4 h-4 accent-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>ORCID</Label>
                      <Input
                        placeholder="e.g. 0000-0003-4870-8326"
                        value={(editForm.orcid as string) ?? ""}
                        onChange={e => setEditForm({ ...editForm, orcid: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>IEEE Author ID or Profile URL</Label>
                      <Input
                        placeholder="e.g. 37089333571"
                        value={(editForm.ieee_id as string) ?? ""}
                        onChange={e => setEditForm({ ...editForm, ieee_id: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Security ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Security</p>
                    <div className="space-y-1">
                      <Label>New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></Label>
                      <div className="relative">
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="Enter new password…"
                          value={editNewPassword}
                          onChange={e => setEditNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          onClick={() => setShowEditPassword(v => !v)}
                          tabIndex={-1}
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Profile ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Profile</p>
                    <div className="space-y-1">
                      <Label>Self Description</Label>
                      <Textarea rows={4} value={editForm.self_description as string ?? ""} onChange={(e) => setEditForm({ ...editForm, self_description: e.target.value })} placeholder="Describe the mentor's background..." />
                    </div>
                    <div className="space-y-1">
                      <Label>Forte / Specialization</Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {editMentorForte.map((f, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50 flex items-center gap-1">
                            {f}
                            <button type="button" onClick={() => setEditMentorForte(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Add specialization..." value={forteInput} onChange={e => setForteInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && forteInput.trim()) { e.preventDefault(); setEditMentorForte(prev => [...prev, forteInput.trim()]); setForteInput("") } }} />
                        <Button type="button" variant="outline" size="sm" onClick={() => { if (forteInput.trim()) { setEditMentorForte(prev => [...prev, forteInput.trim()]); setForteInput("") } }}>Add</Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Technical Skills</Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {editMentorSkills.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-slate-200 text-slate-600 flex items-center gap-1">
                            {s}
                            <button type="button" onClick={() => setEditMentorSkills(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Add skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && skillInput.trim()) { e.preventDefault(); setEditMentorSkills(prev => [...prev, skillInput.trim()]); setSkillInput("") } }} />
                        <Button type="button" variant="outline" size="sm" onClick={() => { if (skillInput.trim()) { setEditMentorSkills(prev => [...prev, skillInput.trim()]); setSkillInput("") } }}>Add</Button>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Availability ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Availability</p>
                    <AvailabilitySelector
                      selectedDays={editMentorAvailDays}
                      selectedTimeSlots={editMentorTimeSlots}
                      onDaysChange={setEditMentorAvailDays}
                      onTimeSlotsChange={setEditMentorTimeSlots}
                    />
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Past Mentored Theses ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Past Mentored Theses</p>
                      <span className="text-xs text-slate-400">{editMentorTheses.length} entr{editMentorTheses.length !== 1 ? "ies" : "y"}</span>
                    </div>
                    <div className="space-y-2">
                      {editMentorTheses.map((thesis, idx) => (
                        <div key={idx} className="flex gap-2 items-start p-3 rounded-lg border border-slate-200 bg-slate-50">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                              <Input placeholder="Title No." value={thesis.title_no ?? ""} onChange={e => setEditMentorTheses(prev => prev.map((t, i) => i === idx ? { ...t, title_no: e.target.value } : t))} className="col-span-1" />
                              <Input placeholder="Year" value={thesis.year ?? ""} onChange={e => setEditMentorTheses(prev => prev.map((t, i) => i === idx ? { ...t, year: e.target.value } : t))} className="col-span-1" />
                              <Input placeholder="Adviser name" value={thesis.mentor ?? ""} onChange={e => setEditMentorTheses(prev => prev.map((t, i) => i === idx ? { ...t, mentor: e.target.value } : t))} className="col-span-2" />
                            </div>
                            <Input placeholder="Thesis title" value={thesis.title ?? ""} onChange={e => setEditMentorTheses(prev => prev.map((t, i) => i === idx ? { ...t, title: e.target.value } : t))} />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => setEditMentorTheses(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditMentorTheses(prev => [...prev, { title_no: "", title: "", mentor: "", year: "" }])}>
                      <Plus className="w-4 h-4 mr-1" /> Add Thesis
                    </Button>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Published Papers ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Published Papers</p>
                      <span className="text-xs text-slate-400">{editMentorPapers.length} entr{editMentorPapers.length !== 1 ? "ies" : "y"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={fetchingPapers || !editForm.orcid}
                        onClick={async () => {
                          setFetchingPapers(true)
                          const res = await fetchPapersByORCID(editForm.orcid as string)
                          setFetchingPapers(false)
                          if (!res.success) { toast.error(res.message); return }
                          setEditMentorPapers(prev => mergePapers(prev, res.papers))
                          toast.success(`Fetched ${res.papers.length} paper${res.papers.length !== 1 ? "s" : ""}`)
                        }}
                      >
                        {fetchingPapers && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                        Auto-fetch via ORCID
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={fetchingPapers || !editForm.ieee_id}
                        onClick={async () => {
                          setFetchingPapers(true)
                          const res = await fetchPapersByIEEE(editForm.ieee_id as string)
                          setFetchingPapers(false)
                          if (!res.success) { toast.error(res.message); return }
                          setEditMentorPapers(prev => mergePapers(prev, res.papers))
                          toast.success(`Fetched ${res.papers.length} paper${res.papers.length !== 1 ? "s" : ""}`)
                        }}
                      >
                        {fetchingPapers && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                        Auto-fetch via IEEE
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editMentorPapers.map((paper, idx) => (
                        <div key={idx} className="flex gap-2 items-start p-3 rounded-lg border border-slate-200 bg-slate-50">
                          <div className="flex-1 space-y-2">
                            <Textarea rows={2} placeholder="Paper title" value={paper.title ?? ""} onChange={e => setEditMentorPapers(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))} className="resize-none text-sm" />
                            <div className="flex gap-2">
                              <Input placeholder="Year" value={paper.year ?? ""} onChange={e => setEditMentorPapers(prev => prev.map((p, i) => i === idx ? { ...p, year: e.target.value } : p))} className="w-24" />
                              <Textarea rows={1} placeholder="URL (optional)" value={paper.url ?? ""} onChange={e => setEditMentorPapers(prev => prev.map((p, i) => i === idx ? { ...p, url: e.target.value } : p))} className="resize-none text-sm flex-1" />
                            </div>
                            {paper.authors && paper.authors.length > 0 && (
                              <p className="text-xs text-slate-500">{paper.authors.join(", ")}</p>
                            )}
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => setEditMentorPapers(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditMentorPapers(prev => [...prev, { title: "", year: "", url: "" }])}>
                      <Plus className="w-4 h-4 mr-1" /> Add Paper
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* ── Basic Info ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Basic Info</p>
                    <div className="space-y-1">
                      <Label>Group Name</Label>
                      <Input value={editForm.group_name as string ?? ""} onChange={(e) => setEditForm({ ...editForm, group_name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input type="email" value={editForm.email as string ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Research ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Research</p>
                    <div className="space-y-1">
                      <Label>Research / Thesis Title</Label>
                      <Input value={editForm.research_title as string ?? ""} onChange={(e) => setEditForm({ ...editForm, research_title: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Research Description</Label>
                      <Textarea rows={4} value={editForm.research_description as string ?? ""} onChange={(e) => setEditForm({ ...editForm, research_description: e.target.value })} placeholder="Describe the research..." />
                    </div>
                    <div className="space-y-1">
                      <Label>Mentor Preference</Label>
                      <Textarea rows={3} value={editForm.mentor_preference as string ?? ""} onChange={(e) => setEditForm({ ...editForm, mentor_preference: e.target.value })} placeholder="What the group looks for in a mentor..." />
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Availability ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Availability</p>
                    <AvailabilitySelector
                      selectedDays={editMenteeAvailDays}
                      selectedTimeSlots={editMenteeTimeSlots}
                      onDaysChange={setEditMenteeAvailDays}
                      onTimeSlotsChange={setEditMenteeTimeSlots}
                    />
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* ── Group Members ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Group Members</p>
                      <span className="text-xs text-slate-400">{editMenteeMembers.length} member{editMenteeMembers.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="space-y-2">
                      {editMenteeMembers.map((member, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <button
                            type="button"
                            title={idx === editMenteeLeaderIndex ? "Group leader" : "Set as leader"}
                            onClick={() => setEditMenteeLeaderIndex(idx)}
                            className={`shrink-0 p-1.5 rounded-md transition-colors ${idx === editMenteeLeaderIndex ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"}`}
                          >
                            <Crown className="w-4 h-4" />
                          </button>
                          <Input
                            placeholder="Member name"
                            value={member.name ?? ""}
                            onChange={e => setEditMenteeMembers(prev => prev.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))}
                          />
                          <Input
                            placeholder="Student no."
                            type="number"
                            value={member.student_number ?? ""}
                            onChange={e => setEditMenteeMembers(prev => prev.map((m, i) => i === idx ? { ...m, student_number: e.target.value } : m))}
                            className="w-36"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                            onClick={() => {
                              setEditMenteeMembers(prev => prev.filter((_, i) => i !== idx))
                              setEditMenteeLeaderIndex(prev => prev === idx ? 0 : prev > idx ? prev - 1 : prev)
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditMenteeMembers(prev => [...prev, { name: "", student_number: "" }])}>
                        <Plus className="w-4 h-4 mr-1" /> Add Member
                      </Button>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" /> Click crown to set leader
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
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
          <ScrollArea className="max-h-[60vh] overflow-hidden">
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
                          {match.matched_keywords.map((kw: string) => (
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
                      <div key={idx} className="flex gap-2 items-center">
                        <button
                          type="button"
                          title={idx === createLeaderIndex ? "Group leader" : "Set as leader"}
                          onClick={() => setCreateLeaderIndex(idx)}
                          className={`shrink-0 p-1.5 rounded-md transition-colors ${idx === createLeaderIndex
                            ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                            : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"
                            }`}
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <Input
                          placeholder="Member name"
                          value={member.name ?? ""}
                          onChange={e => setCreateMembers(prev => prev.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))}
                        />
                        <Input
                          placeholder="Student no."
                          type="number"
                          value={member.student_number ?? ""}
                          onChange={e => setCreateMembers(prev => prev.map((m, i) => i === idx ? { ...m, student_number: e.target.value } : m))}
                          className="w-36"
                        />
                        {idx > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setCreateMembers(prev => prev.filter((_, i) => i !== idx))
                              setCreateLeaderIndex(prev => {
                                if (prev === idx) return 0
                                if (prev > idx) return prev - 1
                                return prev
                              })
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateMembers(prev => [...prev, { name: "", student_number: "" }])}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Member
                      </Button>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" /> Click the crown to set the group leader
                      </p>
                    </div>
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

    </div>
  )
}
