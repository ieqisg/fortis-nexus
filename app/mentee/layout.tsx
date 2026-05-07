import { MenteeProvider } from "../context/menteeContext";
import { Toaster } from "sonner";
export default function MenteeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <MenteeProvider>{children}</MenteeProvider>
            <Toaster />
        </>
    )
}
