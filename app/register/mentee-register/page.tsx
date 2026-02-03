"use client";
import MenteeCreateProfile from "./mentee-create-profile";
import MenteeRegistration from "./mentee-registration";
import { useState } from "react";
export default function Page() {
  const [menteeStep, setMenteeStep] = useState(1);

  const handleNext = () => {
    setMenteeStep(menteeStep + 1);
  };
  const handleBack = () => {
    setMenteeStep(menteeStep - 1);
  };
  return (
    <div>
      {menteeStep === 1 && <MenteeRegistration onNext={handleNext} />}
      {menteeStep === 2 && <MenteeCreateProfile onBack={handleBack} />}
    </div>
  );
}
