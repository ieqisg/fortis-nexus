"use client"

import {
    CardTitle,
    CardHeader,
    CardDescription,
    CardContent,
    Card,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, TrendingUp, FileText, Circle } from "lucide-react"
import { useMentor } from "@/app/context/mentorContext"
import type { Paper } from "@/types/mentorTypes"

export default function ProgressMentees() {
    const { papers, papersLoading } = useMentor()

    const getProgressColor = (progress: number) => {
        if (progress >= 80) return "text-green-600"
        if (progress >= 50) return "text-blue-600"
        return "text-amber-600"
    }

    // Group papers by mentee group
    const grouped = papers.reduce<Record<string, { groupName: string; papers: Paper[] }>>((acc, paper) => {
        const id = paper.mentee_group_id
        if (!acc[id]) {
            acc[id] = {
                groupName: paper.mentee_group?.group_name ?? id,
                papers: [],
            }
        }
        acc[id].papers.push(paper)
        return acc
    }, {})

    if (papersLoading) return <p className="text-sm text-slate-500">Loading...</p>

    if (Object.keys(grouped).length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No submissions yet. Progress will appear once mentees submit papers.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([menteeId, { groupName, papers: menteePapers }]) => {
                const total = menteePapers.length
                const reviewed = menteePapers.filter(p => p.status === "reviewed").length
                const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0

                return (
                    <Card key={menteeId}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{groupName}</CardTitle>
                                    <CardDescription>{menteePapers[0]?.mentee_group?.group_name ?? ""}</CardDescription>
                                </div>
                                <div className="text-right">
                                    <div className={`text-3xl font-bold ${getProgressColor(progress)}`}>
                                        {progress}%
                                    </div>
                                    <p className="text-xs text-gray-500">Overall Progress</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Completion Status</span>
                                    <span className="font-semibold">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-3" />
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-1">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        Milestones
                                    </h4>
                                </div>
                                <div className="space-y-3">
                                    {menteePapers.map(paper => {
                                        const done = paper.status === "reviewed"
                                        return (
                                            <div key={paper.id} className="flex items-start space-x-3">
                                                <div className="mt-0.5 shrink-0">
                                                    {done ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-gray-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <p className={`font-medium text-sm ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                                                            {paper.title}
                                                        </p>
                                                        <Badge variant="outline" className={`text-xs ${done ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}`}>
                                                            {done ? "Reviewed" : "Pending"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Submitted: {new Date(paper.submitted_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
                                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Progress Summary</p>
                                    <p className="text-sm text-gray-700 mt-1">
                                        {reviewed} of {total} paper{total !== 1 ? "s" : ""} reviewed
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
