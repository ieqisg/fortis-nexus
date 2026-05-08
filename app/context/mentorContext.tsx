"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getMentorData } from "@/lib/actions/mentorActions"
import { getMeetings } from "@/lib/actions/meetingActions"
import { getMenteesPapers } from "@/lib/actions/paperActions"
import type { MentorContextType, MeetingRecord, Paper } from "@/types/mentorTypes"
import type { MentorData } from "@/types/profile_types"

const MentorContext = createContext<MentorContextType | null>(null)

export function MentorProvider({ children }: { children: ReactNode }) {
    const [mentor, setMentor] = useState<MentorData | null>(null)
    const [loading, setLoading] = useState(true)
    const [meetings, setMeetings] = useState<MeetingRecord[]>([])
    const [meetingsLoading, setMeetingsLoading] = useState(true)
    const [papers, setPapers] = useState<Paper[]>([])
    const [papersLoading, setPapersLoading] = useState(true)

    const fetchData = async () => {
        try {
            const result = await getMentorData()
            if (result.success && result.data) {
                setMentor(result.data)
            }
        } catch (error) {
            console.error("fetchData error:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMeetings = async () => {
        try {
            const result = await getMeetings()
            if (result.success) setMeetings((result.data ?? []) as MeetingRecord[])
        } finally {
            setMeetingsLoading(false)
        }
    }

    const fetchPapers = async () => {
        try {
            const result = await getMenteesPapers()
            if (result.success) setPapers(result.data)
        } finally {
            setPapersLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        fetchMeetings()
        fetchPapers()
    }, [])

    return (
        <MentorContext.Provider value={{ mentor, loading, refetch: fetchData, meetings, meetingsLoading, setMeetings, papers, papersLoading, setPapers }}>
            {children}
        </MentorContext.Provider>
    )
}

export const useMentor = () => {
    const ctx = useContext(MentorContext)
    if (!ctx) throw new Error("usementor must be used within mentorProvider")
    return ctx
}
