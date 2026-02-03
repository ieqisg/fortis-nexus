"use client";

import { useState } from "react";
import { ArrowLeft, Plus, X, Clock, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilitySelector } from "@/components/ui/AvailabilitySelector";

export default function MenteeCreateProfile({
  onBack,
}: {
  onBack: () => void;
}) {
  // Form state
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState([{ name: "", studentNo: "" }]);
  const [thesisTitle, setThesisTitle] = useState("");
  const [thesisFile, setThesisFile] = useState<File | null>(null);
  const [researchDesc, setResearchDesc] = useState("");
  const [mentorPrefs, setMentorPrefs] = useState("");

  // Availability
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(10);

  // Validation
  const isFormValid = () => {
    if (
      !groupName ||
      !thesisTitle ||
      !thesisFile ||
      !researchDesc ||
      !mentorPrefs
    )
      return false;

    // Check all members are filled
    for (const m of members) {
      if (!m.name || !m.studentNo) return false;
    }

    // Check availability
    if (selectedDays.length === 0 || selectedTimeSlots.length === 0)
      return false;

    return true;
  };

  // Handle dynamic member changes
  const updateMember = (
    index: number,
    field: "name" | "studentNo",
    value: string,
  ) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const addMember = () => setMembers([...members, { name: "", studentNo: "" }]);
  const removeMember = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    // Proceed with form submission logic
    console.log({
      groupName,
      members,
      thesisTitle,
      thesisFile,
      researchDesc,
      mentorPrefs,
      selectedDays,
      selectedTimeSlots,
      weeklyHours,
    });

    alert("Mentee profile created successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back To Home
        </Button>
        <Card>
          <CardHeader>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserRound className="w-10 h-10 text-green-700" />
            </div>
            <CardTitle className="text-center text-2xl">
              Mentee Profile
            </CardTitle>
            <CardDescription className="text-center">
              Register your thesis group to find the perfect mentor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Group Name */}
              <div>
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="e.g Fortis Programmatores"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              {/* Group Members */}
              <div>
                <Label>Group Members *</Label>
                {members.map((member, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Member name"
                      value={member.name}
                      onChange={(e) =>
                        updateMember(idx, "name", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Student no."
                      value={member.studentNo}
                      onChange={(e) =>
                        updateMember(idx, "studentNo", e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeMember(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={addMember}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add member
                </Button>
              </div>

              {/* Thesis Title */}
              <div>
                <Label htmlFor="thesisTitle">Research/Thesis Title *</Label>
                <Input
                  id="thesisTitle"
                  placeholder="Enter your thesis title"
                  value={thesisTitle}
                  onChange={(e) => setThesisTitle(e.target.value)}
                />
              </div>

              {/* Thesis File */}
              <div>
                <Label htmlFor="thesisFile">
                  Thesis 1 Document (Proposal) *
                </Label>
                <Input
                  type="file"
                  id="thesisFile"
                  onChange={(e) =>
                    setThesisFile(e.target.files ? e.target.files[0] : null)
                  }
                />
              </div>

              {/* Research Description */}
              <div>
                <Label htmlFor="researchDesc">Research Description *</Label>
                <Textarea
                  id="researchDesc"
                  placeholder="Describe your research, tools/frameworks, and algorithms"
                  value={researchDesc}
                  onChange={(e) => setResearchDesc(e.target.value)}
                  rows={5}
                />
              </div>

              {/* Mentor Preferences */}
              <div>
                <Label htmlFor="mentorPrefs">Mentor Preferences *</Label>
                <Textarea
                  id="mentorPrefs"
                  placeholder="Describe what you're looking for in a mentor"
                  value={mentorPrefs}
                  onChange={(e) => setMentorPrefs(e.target.value)}
                  rows={5}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Be specific about the technical skills and expertise you need
                  for your thesis
                </p>
              </div>

              {/* Availability */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" /> Availability
                    </CardTitle>
                    <CardDescription>
                      When is your group available for mentoring sessions?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AvailabilitySelector
                      selectedDays={selectedDays}
                      selectedTimeSlots={selectedTimeSlots}
                      weeklyHours={weeklyHours}
                      onDaysChange={setSelectedDays}
                      onTimeSlotsChange={setSelectedTimeSlots}
                      onWeeklyHoursChange={setWeeklyHours}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  className="bg-gray-400 hover:bg-gray-500"
                  onClick={onBack}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className={`bg-green-600 hover:bg-green-700 ${!isFormValid() ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!isFormValid()}
                >
                  Create Mentee Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
