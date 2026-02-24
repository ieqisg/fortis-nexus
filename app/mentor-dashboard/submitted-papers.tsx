import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";

export default function SubmittedPapers() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Chapter 1</CardTitle>
            <CardDescription>
              Submitted by Fortis Programmatores on 01-02-26
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Checked
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-gray-700">Paper Content</Label>
          <p className="text-sm text-gray-600 mt-1">Paper Content</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <Label className="text-gray-700 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Your Previous Comments
          </Label>
          <p className="text-sm text-gray-700 mt-2"></p>
        </div>

        <div>
          <Label htmlFor={`comment-1`}>Add Comment / Feedback</Label>
          <Textarea
            placeholder="Provide feedback on this submission..."
            className="mt-2"
            rows={4}
          />
          <Button className="mt-2 bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            Submit Comment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
