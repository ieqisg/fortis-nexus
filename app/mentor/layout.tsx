import { MentorProvider } from "@/app/context/mentorContext"
import { Toaster } from "sonner"
export default function MentorLayout({ children }: { children: React.ReactNode }) {
    console.log("MentorLayout rendered")
    return (
        <>
            <MentorProvider>
                {children}
            </MentorProvider>
            <Toaster />
        </>
    )
}
