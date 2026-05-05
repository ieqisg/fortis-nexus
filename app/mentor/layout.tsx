import { MentorProvider } from "../context/mentorContext";

export default function mentorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MentorProvider>{children}</MentorProvider>
    )
}
