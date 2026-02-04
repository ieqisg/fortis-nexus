"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import MatchScoreCard from "@/components/ui/MatchScoreCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Calendar } from "lucide-react";
import {
  getMentorById,
  getMatchByMenteeId,
  getPapersByMenteeId,
  mockMentees,
  mockMentors,
} from "@/lib/mockData";

export default function MenteeDashboard() {
  const [papers, setPapers] = useState(getPapersByMenteeId("ME001"));
  const [newPaper, setNewPaper] = useState({ title: "", file: "" });

  const match = getMatchByMenteeId("ME001");
  const mentor = match ? getMentorById(match.mentorId) : null;

  const handleSubmitPaper = (e: React.FormEvent) => {
    e.preventDefault();
    const paper = {
      id: `P${Date.now()}`,
      menteeId: "ME001",
      title: newPaper.title,
      fileName: newPaper.file,
      submittedAt: new Date().toISOString().split("T")[0],
      comments: [],
    };
    setPapers([...papers, paper]);
    setNewPaper({ title: "", file: "" });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="mentee" userName="Fortis Programmatores" />

      <div className="flex-1 overflow-auto">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8">
          <h1 className="text-3xl font-bold mb-2">Mentee Dashboard</h1>
          <p className="text-green-100">Welcome back, Fortis Programmatores</p>
        </div>

        <div className="p-8">
          {mentor && match ? (
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Matched Mentor</CardTitle>
                    <CardDescription>
                      Based on Gale-Shapley algorithm and semantic similarity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {mentor.name}
                        </h3>
                        <p className="text-gray-600">{mentor.email}</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Expertise:
                        </p>
                        <p className="text-gray-800">{mentor.expertise}</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Skills:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">qwerty,qwerty,qwerty</Badge>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          About:
                        </p>
                        <p className="text-gray-700">{mentor.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <MatchScoreCard score={match.score} keywords={match.keywords} />
              </div>
            </div>
          ) : (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <p className="text-center text-gray-600">
                  No mentor match found yet. The matching process is in
                  progress.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-green-600" />
                  Submit Paper for Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPaper} className="space-y-4">
                  <div>
                    <Label htmlFor="paperTitle">Paper Title</Label>
                    <Input
                      id="paperTitle"
                      placeholder="e.g., Chapter 1: Introduction"
                      value={newPaper.title}
                      onChange={(e) =>
                        setNewPaper({ ...newPaper, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="paperFile">File Name</Label>
                    <Input
                      id="paperFile"
                      placeholder="e.g., chapter1.pdf"
                      type="file"
                      value={newPaper.file}
                      onChange={(e) =>
                        setNewPaper({ ...newPaper, file: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      In a real system, you would upload a file here
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Submit Paper
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Submitted Papers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {papers.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No papers submitted yet
                    </p>
                  ) : (
                    papers.map((paper) => (
                      <div
                        key={paper.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <h4 className="font-semibold text-gray-900">
                          {paper.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {paper.fileName}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <Calendar className="w-3 h-3 mr-1" />
                          {paper.submittedAt}
                        </div>
                        {paper.comments.length > 0 && (
                          <div className="mt-3 bg-blue-50 p-3 rounded">
                            <p className="text-xs font-semibold text-blue-900">
                              Mentor Feedback:
                            </p>
                            {paper.comments.map((comment) => (
                              <div key={comment.id} className="mt-2">
                                <p className="text-sm text-gray-700">
                                  {comment.text}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {comment.createdAt}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
