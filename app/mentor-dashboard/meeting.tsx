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

import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";

import { getMenteeById } from "@/lib/mockData";

export default function Meeting() {
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

  const [meetings, setMeetings] = useState<Meeting[]>([]);

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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
              Meeting Calendar
            </CardTitle>
            <Button onClick={() => setIsAddMeetingOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Meeting
            </Button>
          </div>
          <CardDescription>Schedule and manage mentee meetings</CardDescription>
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

          {selectedDate && getMeetingsForDate(selectedDate).length > 0 && (
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
      <Dialog open={isAddMeetingOpen} onOpenChange={setIsAddMeetingOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Add a meeting with one of your mentees
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Mentee *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a mentee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem></SelectItem>
                  <SelectItem></SelectItem>
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
              <Input type="time" className="mt-2" />
            </div>

            <div>
              <Label>Meeting Title *</Label>
              <Input
                placeholder="e.g., Thesis Progress Review"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Meeting agenda or notes..."
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
    </>
  );
}
