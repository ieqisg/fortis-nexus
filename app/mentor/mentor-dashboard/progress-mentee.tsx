import {
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
  Card,
} from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import { CheckCircle2, TrendingUp } from "lucide-react";

export default function ProgressMentees() {
  const completed = true;
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-green-600";
    if (progress >= 50) return "text-blue-600";
    return "text-amber-600";
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Fortis Programmatores</CardTitle>
            <CardDescription>Mentor Mentee Matching</CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getProgressColor(90)}`}>
              {90}%
            </div>
            <p className="text-xs text-gray-500">Overall Progress</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Completion Status</span>
            <span className="font-semibold">{90}%</span>
          </div>
          <Progress value={90} className="h-3" />
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Milestones</h4>
            <p className="text-xs text-gray-500">Last updated: 01-02-26</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="mt-1">
                {completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p
                    className={`font-medium ${completed ? "text-gray-600 line-through" : "text-gray-900"}`}
                  >
                    Chapter 1
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Submitted: 01-02-2026
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Progress Summary
            </p>
            <p className="text-sm text-gray-700 mt-1">
              2 of 5 milestones completed
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
