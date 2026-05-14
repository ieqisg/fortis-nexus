import { MentorProvider } from "@/app/context/mentorContext"
export default function MentorLayout({ children }: { children: React.ReactNode }) {
    return (
        <MentorProvider>
            {children}
        </MentorProvider>
    )
}
