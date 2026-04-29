import { getMenteeData } from "@/lib/actions/menteeActions";

import MenteeProfileDetails from "./profile-details"




export default async function Page() {
    const menteeData = await getMenteeData()
    if (!menteeData) return;
    return (
        <MenteeProfileDetails menteeData={menteeData.data} />
    )
}
