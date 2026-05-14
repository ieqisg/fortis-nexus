import { MenteeProvider } from "../context/menteeContext";
export default function MenteeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MenteeProvider>{children}</MenteeProvider>
}
