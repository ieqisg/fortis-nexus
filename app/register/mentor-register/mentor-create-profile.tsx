"use client";

import { useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserRound, Plus, X } from "lucide-react";

export default function MentorCreateProfile({ onBack }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    surname: "",
    description: "",
  });

  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const [expertiseInput, setExpertiseInput] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("mentorData", JSON.stringify(formData));
    localStorage.setItem("userType", "mentor");
    localStorage.setItem("userName", `${formData.name} ${formData.surname}`);
  };

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    if (skills.includes(value)) return;

    setSkills([...skills, value]);
    setSkillInput("");
  };
  const addExpertise = () => {
    const value = expertiseInput.trim();
    if (!value) return;
    if (expertise.includes(value)) return;

    setExpertise([...expertise, value]);
    setExpertiseInput("");
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
      addExpertise();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserRound className="w-10 h-10 text-blue-700" />
            </div>
            <CardTitle className="text-center text-2xl">
              Mentor Profile
            </CardTitle>
            <CardDescription className="text-center">
              Create your mentor profile to guide students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">First Name *</Label>
                  <Input
                    id="name"
                    required
                    placeholder="John"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="surname">Last Name *</Label>
                  <Input
                    id="surname"
                    placeholder="Doe"
                    required
                    value={formData.surname}
                    onChange={(e) =>
                      setFormData({ ...formData, surname: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="technical-skills">Technical Skills *</Label>

                <div className="flex gap-2">
                  <Input
                    id="technical-skills"
                    placeholder="e.g. Python, Machine Learning, Image Processing etc."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addSkill}
                    className="bg-blue-700"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </Button>
                </div>

                <p className="text-sm text-gray-500">
                  Add your technical skills and press Enter or click +
                </p>

                {/* Added skills */}
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() =>
                          setSkills(skills.filter((_, i) => i !== index))
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Brief Description about yourself*
                  </Label>
                  <Textarea
                    id="description"
                    required
                    placeholder="Describe your background, research interests, Focus on your technical background and notable projects..."
                    rows={6}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forte">Forte/Specialization *</Label>

                <div className="flex gap-2">
                  <Input
                    id="Forte"
                    placeholder="e.g., What are you particularly strong at?"
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addExpertise}
                    className="bg-blue-700"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </Button>
                </div>

                <p className="text-sm text-gray-500">
                  Add your Forte/Specialization and press Enter or click +
                </p>

                <div className="flex flex-wrap gap-2">
                  {expertise.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() =>
                          setExpertise(expertise.filter((_, i) => i !== index))
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Mentoring Capacity
                    </CardTitle>
                    <CardDescription>
                      How many mentee groups can you take
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Label htmlFor="capacity" className="text-base">
                        Maximum Mentees
                      </Label>
                      <Input
                        id="capacity"
                        type="number"
                        defaultValue={1}
                        min={1}
                        max={10}
                        className="w-24"
                      />
                      <span className="text-slate-500">groups</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="submit"
                  className=" bg-gray-600 "
                  onClick={onBack}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className=" bg-blue-600 hover:bg-blue-700"
                >
                  Create Mentor Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
