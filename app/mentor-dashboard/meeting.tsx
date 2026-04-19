"use client";
import { useState, useEffect } from "react";
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
import { Matches } from "@/app/types/menteeTypes";
import { getMeetings, createMeeting } from "@/app/lib/actions/meetingActions";

interface Meeting {
    id: string;
    mentor_id: string;
    mentee_group_id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    status: "scheduled" | "completed" | "cancelled";
    mentee_group?: {
        id: string;
        group_name: string;
    }
}

type Props = {
    matches: Matches[]
}

export default function Meeting({ matches = [] }: Props) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false)
    const [newMeeting, setNewMeeting] = useState({
        menteeId: "",
        time: "",
        title: "",
        description: "",
    })
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchMeetings = async () => {
            const result = await getMeetings()
            if (result.success) setMeetings(result.data ?? [])
            setLoading(false)
        }
        fetchMeetings()
    }, [])

    const handleAddMeeting = async () => {
        if (!newMeeting.menteeId || !newMeeting.time || !newMeeting.title || !selectedDate) {
            alert("Please fill in all required fields")
            return
        }

        const result = await createMeeting({
            mentee_group_id: newMeeting.menteeId,
            title: newMeeting.title,
            description: newMeeting.description,
            date: selectedDate.toISOString().split("T")[0],
            time: newMeeting.time,
        })

        if (result.success) {
            const updatedMeetings = await getMeetings()
            if (updatedMeetings.success) setMeetings(updatedMeetings.data ?? [])
            setIsAddMeetingOpen(false)
            setNewMeeting({ menteeId: "", time: "", title: "", description: "" })
        } else {
            alert("Failed to schedule meeting")
        }
    }

    const getMeetingsForDate = (date: Date) => {
        return meetings.filter((m) => {
            const meetingDate = new Date(m.date)
            return (
                meetingDate.getDate() === date.getDate() &&
                meetingDate.getMonth() === date.getMonth() &&
                meetingDate.getFullYear() === date.getFullYear()
            )
        })
    }

    const upcomingMeetings = meetings
        .filter((m) => new Date(m.date) >= new Date() && m.status === "scheduled")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5)

    const meetingDates = meetings.map((m) => new Date(m.date))

    if (loading) return <p>Loading meetings...</p>

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
                        modifiers={{ meeting: meetingDates }}
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
                                <div key={meeting.id} className="border border-gray-200 rounded-lg p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900">{meeting.title}</p>
                                            <p className="text-sm text-gray-600">
                                                {meeting.mentee_group?.group_name ?? "Unknown"}
                                            </p>
                                        </div>
                                        <Badge variant="outline">{meeting.time}</Badge>
                                    </div>
                                    {meeting.description && (
                                        <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
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
                                            <h4 className="font-semibold text-gray-900">{meeting.title}</h4>
                                            <p className="text-sm text-gray-600">
                                                {meeting.mentee_group?.group_name ?? "Unknown"}
                                            </p>
                                        </div>
                                        <Badge className="bg-blue-100 text-blue-800">{meeting.status}</Badge>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                        <div className="flex items-center">
                                            <CalendarIcon className="w-4 h-4 mr-1" />
                                            {new Date(meeting.date).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center">
                                            <Clock className="w-4 h-4 mr-1" />
                                            {meeting.time}
                                        </div>
                                    </div>
                                    {meeting.description && (
                                        <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
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
                            <Select
                                value={newMeeting.menteeId}
                                onValueChange={(value) => setNewMeeting({ ...newMeeting, menteeId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a mentee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {matches.map((match, i) => (
                                        match.mentee?.id ? (
                                            <SelectItem
                                                key={match.mentee.id}
                                                value={match.mentee.id}
                                            >
                                                {match.mentee.group_name}
                                            </SelectItem>
                                        ) : null
                                    ))}
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
                                className="mt-2"
                                value={newMeeting.time}
                                onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Meeting Title *</Label>
                            <Input
                                placeholder="e.g., Thesis Progress Review"
                                className="mt-2"
                                value={newMeeting.title}
                                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Description (Optional)</Label>
                            <Textarea
                                placeholder="Meeting agenda or notes..."
                                className="mt-2"
                                rows={3}
                                value={newMeeting.description}
                                onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddMeetingOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddMeeting} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Schedule Meeting
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
