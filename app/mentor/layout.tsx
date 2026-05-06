import { MentorProvider } from "@/app/context/mentorContext"

export default function MentorLayout({ children }: { children: React.ReactNode }) {
    console.log("MentorLayout rendered")
    return (
        <MentorProvider>
            {children}
        </MentorProvider>
    )
}
