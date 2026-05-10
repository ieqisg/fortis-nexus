"use client";
import MenteeCreateProfile from "./mentee-create-profile";
import MenteeRegistration from "./mentee-registration";
import { useState } from "react";
export default function Page() {
    const [menteeStep, setMenteeStep] = useState(1);
    const [credentials, setCredentials] = useState({ email: "", password: "" });

    const handleNext = (email: string, password: string) => {
        setCredentials({ email, password });
        setMenteeStep(2);
    };
    const handleBack = () => {
        setMenteeStep(1);
    };
    return (
        <div>
            {menteeStep === 1 && <MenteeRegistration onNext={handleNext} />}
            {menteeStep === 2 && (
                <MenteeCreateProfile
                    email={credentials.email}
                    password={credentials.password}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}
