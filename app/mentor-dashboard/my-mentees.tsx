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
import { Matches } from "../types/menteeTypes";

type Props = {
    matches: Matches[]
}


export default function MyMentees({ matches }: Props) {
    const hasMatch = !!matches?.length
    return (
        <>
            {hasMatch ? (
                matches.map((match) => (
                    <Card key={match.mentee?.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{match.mentee?.group_name}</CardTitle>
                                    <CardDescription className="mt-2">
                                        <strong className="text-gray-600">Title: </strong>
                                        {match.mentee?.research_title}
                                    </CardDescription>
                                </div>
                                <Badge className="bg-green-100 text-green-800">{match.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MatchScoreCard
                                hasMatch={hasMatch}
                                score={match.compatibility_score ?? 0}
                                keywords={match.matched_keywords ?? []}
                            />
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-semibold text-gray-900 mb-2">Group Members</h4>
                                <div className="flex flex-wrap gap-2">
                                    {match.mentee?.group_members?.map((member, i) => {
                                        const parsed = JSON.parse(member)
                                        return (
                                            <Badge key={i} variant="outline">
                                                {parsed.name} - {parsed.student_number}
                                            </Badge>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>My Mentees</CardTitle>
                        <CardDescription>
                            Based on Gale-Shapley algorithm and semantic similarity
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <p>No mentees matched yet. The matching process is in progress.</p>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
