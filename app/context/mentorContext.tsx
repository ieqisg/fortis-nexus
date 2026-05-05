"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getMentorData } from "@/lib/actions/mentorActions"
import type { MentorContextType } from "@/types/mentorTypes"
import type { MentorData } from "@/types/profile_types"

const MentorContext = createContext<MentorContextType | null>(null)


export function MentorProvider({ children }: { children: ReactNode }) {
    const [mentor, setMentor] = useState<MentorData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        const result = await getMentorData()
        if (result.success) {
            setMentor(result.data)
            setLoading(false)
            console.log(result.data)
        }

    }
    useEffect(() => {
        fetchData()

    }, [])
    return (
        <MentorContext.Provider value={{ mentor, loading, refetch: fetchData }}>
            {children}
        </MentorContext.Provider>
    )

}

export const useMentor = () => {
    const ctx = useContext(MentorContext)
    if (!ctx) throw new Error("usementor must be used within mentorProvider")
    return ctx
}
