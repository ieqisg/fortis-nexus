"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getMenteeData } from "@/lib/actions/menteeActions"
import type { MenteeContextType } from "@/types/menteeTypes"
import type { MenteeData } from "@/types/profile_types"

const MenteeContext = createContext<MenteeContextType | null>(null)


export function MenteeProvider({ children }: { children: ReactNode }) {
    const [mentee, setMentee] = useState<MenteeData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        const result = await getMenteeData()
        if (result.success) {
            setMentee(result.data)
            setLoading(false)
        }

    }
    useEffect(() => {
        fetchData()

    }, [])
    return (
        <MenteeContext.Provider value={{ mentee, loading, refetch: fetchData }}>
            {children}
        </MenteeContext.Provider>
    )

}

export const useMentee = () => {
    const ctx = useContext(MenteeContext)
    if (!ctx) throw new Error("useMentee must be used within MenteeProvider")
    return ctx
}
