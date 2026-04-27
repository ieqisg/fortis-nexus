"use client";

import { useState } from "react";
import MenteeRegistration from "./mentee-registration";
import MenteeCreateProfile from "./mentee-create-profile";

// ─── Types ────────────────────────────────────────────────────────────────────

type Credentials = {
    email: string;
    password: string;
};

type Step = "credentials" | "profile";

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenteeRegistrationFlow() {
    const [step, setStep] = useState<Step>("credentials");
    // Credentials live here — one level above both steps — and are passed
    // to Step 2 only when needed. They're never in global/context state.
    const [credentials, setCredentials] = useState<Credentials | null>(null);

    if (step === "credentials") {
        return (
            <MenteeRegistration
                onNext={(creds) => {
                    setCredentials(creds);
                    setStep("profile");
                }}
            />
        );
    }

    if (step === "profile" && credentials) {
        return (
            <MenteeCreateProfile
                credentials={credentials}
                onBack={() => setStep("credentials")}
            />
        );
    }

    // Fallback — should never happen in normal flow
    return null;
}
