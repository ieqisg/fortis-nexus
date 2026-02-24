"use client";
import MyMentees from "./my-mentees";
import ProgressMentees from "./progress-mentee";
import SubmittedPapers from "./submitted-papers";
import Meeting from "./meeting";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Sidebar from "@/components/ui/Sidebar";

export default function MentorDashboard() {
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
                <MyMentees />
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <div className="grid gap-6">
                <ProgressMentees />
              </div>
            </TabsContent>

            <TabsContent value="papers" className="space-y-6">
              {/* For logic later
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No papers submitted yet</p>
                </CardContent>
              </Card>
            */}
              <div className="grid gap-6">
                <SubmittedPapers />
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Meeting />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Meeting Dialog */}
    </div>
  );
}
