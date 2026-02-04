import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface MatchScoreCardProps {
  score: number;
  keywords: string[];
}

export default function MatchScoreCard({
  score,
  keywords,
}: MatchScoreCardProps) {
  const scorePercentage = Math.round(score * 100);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-blue-600";
    return "text-amber-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          Match Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-baseline">
            <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {scorePercentage}%
            </span>
            <span className="ml-2 text-gray-500">compatibility</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Top 5 Matched Keywords:
          </p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-blue-100 text-blue-800"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
