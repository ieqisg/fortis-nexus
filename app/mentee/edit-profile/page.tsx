import { getMenteeData } from "@/lib/actions/menteeActions";

import MenteeEditProfile from "./edit-profile";






export default async function Page() {
    const userData = await getMenteeData()
    if (!userData) return;
    console.log(userData)
    return <MenteeEditProfile userData={userData.data} />
}
