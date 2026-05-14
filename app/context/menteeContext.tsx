"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getMenteeData } from "@/lib/actions/menteeActions"
import { getMeetingForMentee } from "@/lib/actions/meetingActions"
import { getMyPapers } from "@/lib/actions/paperActions"
import type { MenteeContextType, MenteeMeeting } from "@/types/menteeTypes"
import type { MenteeData } from "@/types/profile_types"
import type { Paper } from "@/types/mentorTypes"

const MenteeContext = createContext<MenteeContextType | null>(null)

export function MenteeProvider({ children }: { children: ReactNode }) {
    const [mentee, setMentee] = useState<MenteeData | null>(null)
    const [loading, setLoading] = useState(true)
    const [meeting, setMeeting] = useState<MenteeMeeting>(null)
    const [meetingLoading, setMeetingLoading] = useState(true)
    const [papers, setPapers] = useState<Paper[]>([])
    const [papersLoading, setPapersLoading] = useState(true)

    const fetchData = async () => {
        const result = await getMenteeData()
        if (result.success) {
            setMentee(result.data)
        }
        setLoading(false)
    }

    const fetchMeeting = async () => {
        const result = await getMeetingForMentee()
        if (result.success) setMeeting(result.data as MenteeMeeting)
        setMeetingLoading(false)
    }

    const fetchPapers = async () => {
        try {
            const result = await getMyPapers()
            if (result.success) setPapers(result.data)
        } finally {
            setPapersLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        fetchMeeting()
        fetchPapers()
    }, [])

    return (
        <MenteeContext.Provider value={{ mentee, loading, refetch: fetchData, meeting, meetingLoading, papers, papersLoading, setPapers }}>
            {children}
        </MenteeContext.Provider>
    )
}

export const useMentee = () => {
    const ctx = useContext(MenteeContext)
    if (!ctx) throw new Error("useMentee must be used within MenteeProvider")
    return ctx
}
