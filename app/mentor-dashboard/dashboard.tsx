"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Sidebar from "@/components/ui/Sidebar";
import MatchScoreCard from "@/components/ui/MatchScoreCard";
import { mockMatches, getMenteeById, mockPapers } from "@/lib/mockData";
import {
  FileText,
  MessageSquare,
  Send,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

interface Meeting {
  id: string;
  menteeId: string;
  menteeName: string;
  date: Date;
  time: string;
  title: string;
  description: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface MenteeProgress {
  menteeId: string;
  milestones: {
    name: string;
    completed: boolean;
    dueDate: string;
  }[];
  overallProgress: number;
  lastUpdate: string;
}

export default function MentorDashboard() {
  const mentorId = "M001";
  const myMentees = mockMatches.filter((m) => m.mentorId === mentorId);
  const myPapers = mockPapers.filter((p) =>
    myMentees.some((m) => m.menteeId === p.menteeId),
  );

  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    menteeId: "",
    time: "",
    title: "",
    description: "",
  });

  const [meetings, setMeetings] = useState<Meeting[]>([
    {
      id: "1",
      menteeId: "ME001",
      menteeName: "John Smith",
      date: new Date(2026, 0, 30),
      time: "10:00 AM",
      title: "Thesis Progress Review",
      description: "Discuss Chapter 1 revisions",
      status: "scheduled",
    },
    {
      id: "2",
      menteeId: "ME002",
      menteeName: "Alice Brown",
      date: new Date(2026, 1, 2),
      time: "2:00 PM",
      title: "Methodology Discussion",
      description: "Review research methodology",
      status: "scheduled",
    },
  ]);

  const [menteeProgress, setMenteeProgress] = useState<MenteeProgress[]>([
    {
      menteeId: "ME001",
      overallProgress: 65,
      lastUpdate: "2026-01-28",
      milestones: [
        {
          name: "Chapter 1: Introduction",
          completed: true,
          dueDate: "2026-01-15",
        },
        {
          name: "Chapter 2: Literature Review",
          completed: true,
          dueDate: "2026-01-25",
        },
        {
          name: "Chapter 3: Methodology",
          completed: false,
          dueDate: "2026-02-10",
        },
        { name: "Chapter 4: Results", completed: false, dueDate: "2026-02-28" },
        {
          name: "Chapter 5: Conclusion",
          completed: false,
          dueDate: "2026-03-15",
        },
      ],
    },
    {
      menteeId: "ME002",
      overallProgress: 40,
      lastUpdate: "2026-01-27",
      milestones: [
        {
          name: "Chapter 1: Introduction",
          completed: true,
          dueDate: "2026-01-20",
        },
        {
          name: "Chapter 2: Literature Review",
          completed: false,
          dueDate: "2026-02-05",
        },
        {
          name: "Chapter 3: Methodology",
          completed: false,
          dueDate: "2026-02-20",
        },
        { name: "Chapter 4: Results", completed: false, dueDate: "2026-03-10" },
        {
          name: "Chapter 5: Conclusion",
          completed: false,
          dueDate: "2026-03-25",
        },
      ],
    },
    {
      menteeId: "ME003",
      overallProgress: 80,
      lastUpdate: "2026-01-29",
      milestones: [
        {
          name: "Chapter 1: Introduction",
          completed: true,
          dueDate: "2026-01-10",
        },
        {
          name: "Chapter 2: Literature Review",
          completed: true,
          dueDate: "2026-01-22",
        },
        {
          name: "Chapter 3: Methodology",
          completed: true,
          dueDate: "2026-02-05",
        },
        { name: "Chapter 4: Results", completed: true, dueDate: "2026-02-18" },
        {
          name: "Chapter 5: Conclusion",
          completed: false,
          dueDate: "2026-03-05",
        },
      ],
    },
  ]);

  const handleCommentSubmit = (paperId: string) => {
    alert(`Comment submitted for paper ${paperId}: ${comments[paperId]}`);
    setComments({ ...comments, [paperId]: "" });
  };

  const handleAddMeeting = () => {
    if (
      !newMeeting.menteeId ||
      !newMeeting.time ||
      !newMeeting.title ||
      !selectedDate
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const mentee = getMenteeById(newMeeting.menteeId);
    const meeting: Meeting = {
      id: Date.now().toString(),
      menteeId: newMeeting.menteeId,
      menteeName: mentee?.groupMembers[0] || "Unknown",
      date: selectedDate,
      time: newMeeting.time,
      title: newMeeting.title,
      description: newMeeting.description,
      status: "scheduled",
    };

    setMeetings([...meetings, meeting]);
    setIsAddMeetingOpen(false);
    setNewMeeting({ menteeId: "", time: "", title: "", description: "" });
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(
      (m) =>
        m.date.getDate() === date.getDate() &&
        m.date.getMonth() === date.getMonth() &&
        m.date.getFullYear() === date.getFullYear(),
    );
  };

  const upcomingMeetings = meetings
    .filter((m) => m.date >= new Date() && m.status === "scheduled")
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-green-600";
    if (progress >= 50) return "text-blue-600";
    return "text-amber-600";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="mentor" />

      <div className="flex-1 overflow-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
          <h1 className="text-3xl font-bold mb-2">Mentor Dashboard</h1>
          <p className="text-blue-100">Welcome back, Dr. Maria Santos</p>
        </div>

        <div className="p-8">
          <Tabs defaultValue="mentees" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mentees">My Mentees</TabsTrigger>
              <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
              <TabsTrigger value="papers">Submitted Papers</TabsTrigger>
              <TabsTrigger value="calendar">Calendar & Meetings</TabsTrigger>
            </TabsList>

            <TabsContent value="mentees" className="space-y-6">
              <div className="grid gap-6">
                {myMentees.map((match) => {
                  const mentee = getMenteeById(match.menteeId);
                  if (!mentee) return null;

                  return (
                    <Card key={match.menteeId}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{mentee.groupMembers[0]}</CardTitle>
                            <CardDescription className="mt-2">
                              {mentee.researchTitle}
                            </CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <MatchScoreCard
                          score={match.score}
                          keywords={match.keywords}
                        />

                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Group Members
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {mentee.groupMembers.map((member, idx) => (
                              <Badge key={idx} variant="outline">
                                {member}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm text-gray-600">
                            <strong>Email:</strong> {mentee.email}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <div className="grid gap-6">
                {menteeProgress.map((progress) => {
                  const mentee = getMenteeById(progress.menteeId);
                  if (!mentee) return null;

                  return (
                    <Card key={progress.menteeId}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{mentee.groupMembers[0]}</CardTitle>
                            <CardDescription>
                              {mentee.researchTitle}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-3xl font-bold ${getProgressColor(progress.overallProgress)}`}
                            >
                              {progress.overallProgress}%
                            </div>
                            <p className="text-xs text-gray-500">
                              Overall Progress
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">
                              Completion Status
                            </span>
                            <span className="font-semibold">
                              {progress.overallProgress}%
                            </span>
                          </div>
                          <Progress
                            value={progress.overallProgress}
                            className="h-3"
                          />
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">
                              Milestones
                            </h4>
                            <p className="text-xs text-gray-500">
                              Last updated: {progress.lastUpdate}
                            </p>
                          </div>
                          <div className="space-y-3">
                            {progress.milestones.map((milestone, idx) => (
                              <div
                                key={idx}
                                className="flex items-start space-x-3"
                              >
                                <div className="mt-1">
                                  {milestone.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <p
                                      className={`font-medium ${milestone.completed ? "text-gray-600 line-through" : "text-gray-900"}`}
                                    >
                                      {milestone.name}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Due: {milestone.dueDate}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
                          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Progress Summary
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                              {
                                progress.milestones.filter((m) => m.completed)
                                  .length
                              }{" "}
                              of {progress.milestones.length} milestones
                              completed
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="papers" className="space-y-6">
              {myPapers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No papers submitted yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {myPapers.map((paper) => {
                    const mentee = getMenteeById(paper.menteeId);
                    if (!mentee) return null;

                    return (
                      <Card key={paper.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">
                                {paper.title}
                              </CardTitle>
                              <CardDescription>
                                Submitted by {mentee.groupMembers[0]} on{" "}
                                {paper.submittedDate}
                              </CardDescription>
                            </div>
                            <Badge
                              variant="outline"
                              className="bg-blue-100 text-blue-800"
                            >
                              {paper.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-gray-700">
                              Paper Content
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">
                              {paper.content}
                            </p>
                          </div>

                          {paper.mentorComments && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <Label className="text-gray-700 flex items-center">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Your Previous Comments
                              </Label>
                              <p className="text-sm text-gray-700 mt-2">
                                {paper.mentorComments}
                              </p>
                            </div>
                          )}

                          <div>
                            <Label htmlFor={`comment-${paper.id}`}>
                              Add Comment / Feedback
                            </Label>
                            <Textarea
                              id={`comment-${paper.id}`}
                              placeholder="Provide feedback on this submission..."
                              value={comments[paper.id] || ""}
                              onChange={(e) =>
                                setComments({
                                  ...comments,
                                  [paper.id]: e.target.value,
                                })
                              }
                              className="mt-2"
                              rows={4}
                            />
                            <Button
                              onClick={() => handleCommentSubmit(paper.id)}
                              className="mt-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Submit Comment
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Meeting Calendar
                      </CardTitle>
                      <Button
                        onClick={() => setIsAddMeetingOpen(true)}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Meeting
                      </Button>
                    </div>
                    <CardDescription>
                      Schedule and manage mentee meetings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                      modifiers={{
                        meeting: meetings.map((m) => m.date),
                      }}
                      modifiersStyles={{
                        meeting: {
                          backgroundColor: "#3b82f6",
                          color: "white",
                          fontWeight: "bold",
                        },
                      }}
                    />

                    {selectedDate &&
                      getMeetingsForDate(selectedDate).length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="font-semibold text-gray-900">
                            Meetings on {selectedDate.toLocaleDateString()}
                          </h4>
                          {getMeetingsForDate(selectedDate).map((meeting) => (
                            <div
                              key={meeting.id}
                              className="border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {meeting.title}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {meeting.menteeName}
                                  </p>
                                </div>
                                <Badge variant="outline">{meeting.time}</Badge>
                              </div>
                              {meeting.description && (
                                <p className="text-sm text-gray-600 mt-2">
                                  {meeting.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-green-600" />
                      Upcoming Meetings
                    </CardTitle>
                    <CardDescription>Your scheduled meetings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingMeetings.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No upcoming meetings</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {meeting.title}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {meeting.menteeName}
                                </p>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">
                                {meeting.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-1" />
                                {meeting.date.toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {meeting.time}
                              </div>
                            </div>
                            {meeting.description && (
                              <p className="text-sm text-gray-600 mt-2">
                                {meeting.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Meeting Dialog */}
      <Dialog open={isAddMeetingOpen} onOpenChange={setIsAddMeetingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Add a meeting with one of your mentees
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Mentee *</Label>
              <Select
                value={newMeeting.menteeId}
                onValueChange={(value) =>
                  setNewMeeting({ ...newMeeting, menteeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a mentee" />
                </SelectTrigger>
                <SelectContent>
                  {myMentees.map((match) => {
                    const mentee = getMenteeById(match.menteeId);
                    return mentee ? (
                      <SelectItem key={mentee.id} value={mentee.id}>
                        {mentee.groupMembers[0]}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Meeting Date *</Label>
              <div className="mt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </div>
            </div>

            <div>
              <Label>Time *</Label>
              <Input
                type="time"
                value={newMeeting.time}
                onChange={(e) =>
                  setNewMeeting({ ...newMeeting, time: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label>Meeting Title *</Label>
              <Input
                placeholder="e.g., Thesis Progress Review"
                value={newMeeting.title}
                onChange={(e) =>
                  setNewMeeting({ ...newMeeting, title: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Meeting agenda or notes..."
                value={newMeeting.description}
                onChange={(e) =>
                  setNewMeeting({ ...newMeeting, description: e.target.value })
                }
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddMeetingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMeeting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
