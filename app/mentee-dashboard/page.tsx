import MenteeDashboard from "./dashboard";
import { getMenteeData } from "@/lib/actions/menteeActions";

export default async function Page() {
    const mentee = await getMenteeData()
    if (!mentee) return;
    return (
        <MenteeDashboard menteeData={mentee.data} />
    );


}
