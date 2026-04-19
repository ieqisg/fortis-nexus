"use client";

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
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { getMenteeData } from "../lib/actions/menteeActions";
import { MenteeGroupWithMatch } from "../types/modelTypes";
import { UserAuth } from "../context/authContext";



export default function MenteeDashboard() {
    const [mentee, setMentee] = useState<MenteeGroupWithMatch | null>(null)
    const [loading, setLoading] = useState(true)
    const { userData } = UserAuth()
    const hasMatch = !!mentee?.matches

    const mentor = mentee?.matches?.mentor
    const match = mentee?.matches
    useEffect(() => {
        const fetchData = async () => {
            const result = await getMenteeData()
            if (result.success) {
                setMentee(result.data)
                console.log(result)

            } else {
                alert("No fetched Data")
            }
            setLoading(false)
        }
        fetchData()
        console.log(userData.email)
    }, [])

    if (loading) return <p>Loading...</p>

    return (
        <>
            <div className="flex h-screen bg-gray-50">
                <Sidebar userType="mentee" userName={mentee?.group_name ?? "Loading..."} />

                <div className="flex-1 overflow-auto">
                    <div className="bg-linear-to-r from-green-600 to-emerald-600 text-white p-8">
                        <h1 className="text-3xl font-bold mb-2">Mentee Dashboard</h1>
                        <p className="text-green-100">Welcome back, {mentee?.group_name}</p>
                    </div>

                    <div className="p-8">
                        <div className="grid lg:grid-cols-3 gap-6 mb-8">
                            <div className="lg:col-span-2">
                                {match ? (
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
                                                        {mentor?.first_name ?? "Loading"} {mentor?.last_name ?? "Loading"}
                                                    </h3>
                                                    <p className="text-gray-600">{mentor?.email ?? "Loading"}</p>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                                        Expertise:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline">
                                                            {mentor?.forte.join(", ") ?? "Loading"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                                        Skills:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline">
                                                            {mentor?.technical_skills.join(", ") ?? "Loading"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                                        About:
                                                    </p>
                                                    <p className="text-gray-800">
                                                        {mentor?.self_description}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                ) : (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Your Matched Mentor</CardTitle>
                                            <CardDescription>
                                                Based on Gale-Shapley algorithm and semantic similarity
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            <h1>
                                                No mentor match found yet. The matching process is in progress.
                                            </h1>
                                        </CardContent>

                                    </Card>


                                )}

                            </div>

                            <div>
                                <MatchScoreCard
                                    score={match?.compatibility_score ?? 0}
                                    keywords={match?.matched_keywords ?? []}
                                    hasMatch={hasMatch}
                                />
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Upload className="w-5 h-5 mr-2 text-green-600" />
                                        Submit Paper for Review
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form className="space-y-4">
                                        <div>
                                            <Label htmlFor="paperTitle">Paper Title</Label>
                                            <Input
                                                id="paperTitle"
                                                placeholder="e.g., Chapter 1: Introduction"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="paperFile">File Name</Label>
                                            <Input
                                                id="paperFile"
                                                placeholder="e.g., chapter1.pdf"
                                                type="file"
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
                                        {/* For logic later 
                  {papers.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No papers submitted yet
                    </p>
                */}

                                        <div className="border border-gray-200 rounded-lg p-4">
                                            <h4 className="font-semibold text-gray-900">Chapter 1</h4>
                                            <p className="text-sm text-gray-600 mt-1">Chapter1.pdf</p>
                                            <div className="flex items-center text-xs text-gray-500 mt-2">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                01-02-26
                                            </div>
                                            <div className="mt-3 bg-blue-50 p-3 rounded">
                                                <p className="text-xs font-semibold text-blue-900">
                                                    Mentor Feedback:
                                                </p>

                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-700">Great Job!</p>
                                                    <p className="text-xs text-gray-500 mt-1">01-02-26</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
