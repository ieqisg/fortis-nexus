"use client"

import { useState } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MessageSquare, Send, FileText, Calendar, Download } from "lucide-react"
import { useMentor } from "@/app/context/mentorContext"
import { addComment, getPaperDownloadUrl } from "@/lib/actions/paperActions"
import { toast } from "sonner"
import type { Paper } from "@/types/mentorTypes"

export default function SubmittedPapers() {
    const { papers, papersLoading, setPapers } = useMentor()
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState<Record<string, boolean>>({})

    // Group papers by mentee group name
    const grouped = papers.reduce<Record<string, Paper[]>>((acc, paper) => {
        const groupName = paper.mentee_group?.group_name ?? paper.mentee_group_id
        if (!acc[groupName]) acc[groupName] = []
        acc[groupName].push(paper)
        return acc
    }, {})

    const handleAddComment = async (paperId: string) => {
        const comment = commentInputs[paperId]?.trim()
        if (!comment) return
        setSubmitting(prev => ({ ...prev, [paperId]: true }))
        const result = await addComment(paperId, comment)
        if (result.success && result.comment) {
            setPapers(prev => prev.map(p =>
                p.id === paperId
                    ? {
                        ...p,
                        status: "reviewed" as const,
                        paper_comments: [...(p.paper_comments ?? []), result.comment!],
                    }
                    : p
            ))
            setCommentInputs(prev => ({ ...prev, [paperId]: "" }))
            toast.success("Comment submitted")
        } else {
            toast.error("Failed to submit comment")
        }
        setSubmitting(prev => ({ ...prev, [paperId]: false }))
    }

    const handleDownload = async (filePath: string, fileName: string) => {
        const result = await getPaperDownloadUrl(filePath)
        if (result.url) {
            const a = document.createElement("a")
            a.href = result.url
            a.download = fileName
            a.click()
        }
    }

    if (papersLoading) return <p className="text-sm text-slate-500">Loading...</p>

    if (papers.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No papers submitted yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {Object.entries(grouped).map(([groupName, groupPapers]) => (
                <div key={groupName}>
                    <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        {groupName}
                        <span className="text-xs font-normal text-gray-400">({groupPapers.length} paper{groupPapers.length !== 1 ? "s" : ""})</span>
                    </h3>
                    <div className="space-y-4">
                        {groupPapers.map(paper => (
                            <Card key={paper.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base">{paper.title}</CardTitle>
                                            <CardDescription className="flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(paper.submitted_at).toLocaleDateString()}
                                            </CardDescription>
                                        </div>
                                        <Badge className={paper.status === "reviewed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                                            {paper.status === "reviewed" ? "Reviewed" : "Pending"}
                                        </Badge>
                                    </div>
                                    {paper.file_name && (
                                        <button
                                            onClick={() => handleDownload(paper.file_path!, paper.file_name!)}
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                        >
                                            <Download className="w-3 h-3" /> {paper.file_name}
                                        </button>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {paper.paper_comments && paper.paper_comments.length > 0 && (
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <Label className="text-gray-700 flex items-center gap-1 mb-2">
                                                <MessageSquare className="w-4 h-4" />
                                                Your Previous Comments
                                            </Label>
                                            <div className="space-y-2">
                                                {paper.paper_comments.map(c => (
                                                    <div key={c.id} className="border-l-2 border-blue-300 pl-3">
                                                        <p className="text-sm text-gray-700">{c.comment}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <Label htmlFor={`comment-${paper.id}`}>Add Comment / Feedback</Label>
                                        <Textarea
                                            id={`comment-${paper.id}`}
                                            placeholder="Provide feedback on this submission..."
                                            className="mt-2"
                                            rows={3}
                                            value={commentInputs[paper.id] ?? ""}
                                            onChange={e => setCommentInputs(prev => ({ ...prev, [paper.id]: e.target.value }))}
                                        />
                                        <Button
                                            className="mt-2 bg-blue-600 hover:bg-blue-700"
                                            disabled={submitting[paper.id] || !commentInputs[paper.id]?.trim()}
                                            onClick={() => handleAddComment(paper.id)}
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            {submitting[paper.id] ? "Submitting..." : "Submit Comment"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
