"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MatchScoreCard from "@/components/ui/MatchScoreCard";

export default function MyMentees() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Fortis Programmatores</CardTitle>
            <CardDescription className="mt-2">
              <strong className="text-gray-600">Title: </strong> Mentor-Mentee
              Matching System
            </CardDescription>
          </div>
          <Badge className="bg-green-100 text-green-800">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <MatchScoreCard
          score={0.87}
          keywords={["NLP", "Python", "Gale-Shapley"]}
        />

        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-gray-900 mb-2">Group Members</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">John Doe</Badge>
            <Badge variant="outline">John Smith</Badge>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <strong>Email:</strong> mltamayo@fit.edu.ph
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
