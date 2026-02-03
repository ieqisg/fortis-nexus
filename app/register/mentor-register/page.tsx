"use client";
import { useState } from "react";
import MentorCreateProfile from "./mentor-create-profile";
import MentorRegistration from "./mentor-registration";
export default function Page() {
  const [mentorStep, setMentorStep] = useState(1);

  const handleNext = () => {
    setMentorStep(mentorStep + 1);
  };
  const handleBack = () => {
    setMentorStep(mentorStep - 1);
  };
  return (
    <div>
      {mentorStep === 1 && <MentorRegistration onNext={handleNext} />}
      {mentorStep === 2 && <MentorCreateProfile onBack={handleBack} />}
    </div>
  );
}
