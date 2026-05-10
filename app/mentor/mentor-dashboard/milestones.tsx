"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Trash2, Plus, Target, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import {
    getMilestones,
    createMilestone,
    toggleMilestone,
    deleteMilestone,
} from "@/lib/actions/milestoneActions"
import type { Milestone } from "@/types/mentorTypes"
import type { Matches } from "@/types/menteeTypes"

type MenteeOption = {
    id: string
    group_name: string
}

type Props = {
    matches: Matches[]
}

export default function Milestones({ matches }: Props) {
    const menteeOptions: MenteeOption[] = matches
        .filter(m => m.mentee?.id)
        .map(m => ({ id: m.mentee!.id, group_name: m.mentee!.group_name }))

    const [selectedId, setSelectedId] = useState(menteeOptions[0]?.id ?? "")
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [loadingMilestones, setLoadingMilestones] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [adding, setAdding] = useState(false)
    const [showForm, setShowForm] = useState(false)

    useEffect(() => {
        if (!selectedId) return
        async function load() {
            setLoadingMilestones(true)
            const r = await getMilestones(selectedId)
            if (r.success) setMilestones(r.data)
            setLoadingMilestones(false)
        }
        load()
    }, [selectedId])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !selectedId) return
        setAdding(true)
        const result = await createMilestone({
            menteeGroupId: selectedId,
            title,
            description: description || undefined,
            dueDate: dueDate || undefined,
        })
        if (result.success && result.milestone) {
            setMilestones(prev => [...prev, result.milestone!])
            setTitle("")
            setDescription("")
            setDueDate("")
            setShowForm(false)
            toast.success("Milestone added")
        } else {
            toast.error("Failed to add milestone")
        }
        setAdding(false)
    }

    const handleToggle = async (milestone: Milestone) => {
        const next = !milestone.completed
        setMilestones(prev => prev.map(m => m.id === milestone.id ? { ...m, completed: next } : m))
        const result = await toggleMilestone(milestone.id, next)
        if (!result.success) {
            setMilestones(prev => prev.map(m => m.id === milestone.id ? { ...m, completed: milestone.completed } : m))
            toast.error("Failed to update milestone")
        }
    }

    const handleDelete = async (id: string) => {
        setMilestones(prev => prev.filter(m => m.id !== id))
        const result = await deleteMilestone(id)
        if (!result.success) {
            toast.error("Failed to delete milestone")
        }
    }

    const today = new Date().toISOString().split("T")[0]

    const getDueBadge = (m: Milestone) => {
        if (m.completed) return <Badge className="text-xs bg-green-100 text-green-700 border-0">Done</Badge>
        if (!m.due_date) return null
        if (m.due_date < today) return <Badge className="text-xs bg-red-100 text-red-700 border-0">Overdue</Badge>
        return <Badge className="text-xs bg-amber-100 text-amber-700 border-0">Due {new Date(m.due_date + "T00:00:00").toLocaleDateString()}</Badge>
    }

    if (menteeOptions.length === 0) {
        return (
            <div className="text-center py-16 text-slate-400">
                <Target className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No mentees matched yet. Milestones will appear once matching is complete.</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Mentee selector */}
            {menteeOptions.length > 1 && (
                <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium text-slate-600 shrink-0">Mentee Group</Label>
                    <div className="relative">
                        <select
                            value={selectedId}
                            onChange={e => setSelectedId(e.target.value)}
                            className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {menteeOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.group_name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            )}

            {/* Milestone list */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                <Target className="w-4 h-4 text-blue-600" />
                                {menteeOptions.find(o => o.id === selectedId)?.group_name ?? "Milestones"}
                            </CardTitle>
                            <CardDescription className="mt-0.5">
                                Set tasks to complete before the next meeting. Tick them off during the session.
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setShowForm(v => !v)}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Task
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                    {/* Add form */}
                    {showForm && (
                        <form onSubmit={handleAdd} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                            <div>
                                <Label className="text-xs font-medium text-slate-600">Task / Milestone <span className="text-red-400">*</span></Label>
                                <Input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Draft Chapter 2 methodology"
                                    className="mt-1 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-slate-600">Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Additional details or instructions..."
                                    className="mt-1 text-sm resize-none"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-slate-600">Due Date <span className="text-slate-400 font-normal">(optional)</span></Label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="mt-1 text-sm w-44"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={adding} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {adding ? "Adding..." : "Add Milestone"}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Milestone items */}
                    {loadingMilestones ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
                        </div>
                    ) : milestones.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Target className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                            <p className="text-sm">No milestones yet. Add a task for this mentee group.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {milestones.map(m => (
                                <div
                                    key={m.id}
                                    className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors ${
                                        m.completed
                                            ? "border-green-100 bg-green-50"
                                            : m.due_date && m.due_date < today
                                            ? "border-red-100 bg-red-50"
                                            : "border-slate-100 bg-white hover:border-slate-200"
                                    }`}
                                >
                                    <button
                                        onClick={() => handleToggle(m)}
                                        className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                                        aria-label={m.completed ? "Mark incomplete" : "Mark complete"}
                                    >
                                        {m.completed
                                            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            : <Circle className="w-5 h-5 text-slate-300" />
                                        }
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm font-medium ${m.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                                                {m.title}
                                            </span>
                                            {getDueBadge(m)}
                                        </div>
                                        {m.description && (
                                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{m.description}</p>
                                        )}
                                        {m.completed && m.completed_at && (
                                            <p className="text-xs text-green-500 mt-0.5">
                                                Completed {new Date(m.completed_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        className="shrink-0 text-slate-300 hover:text-red-400 transition-colors mt-0.5"
                                        aria-label="Delete milestone"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {milestones.length > 0 && (
                        <p className="text-xs text-slate-400 text-right">
                            {milestones.filter(m => m.completed).length}/{milestones.length} completed
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
