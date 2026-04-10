"use client";
import { createContext, useEffect, useState, useContext, ReactNode } from "react";
import { supabase } from "../config/supabaseClient";

type AuthResponse = {
    success: boolean;
    data?: any;
    error?: any;
}

type AuthContextType = {
    signUpMentee: () => Promise<AuthResponse>;
    signInMentee: () => Promise<AuthResponse>
    userData: { email: string; password: string };
    setUserData: (data: { email: string; password: string }) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [userData, setUserData] = useState({ email: "", password: "" });

    const signUpMentee = async (): Promise<AuthResponse> => {
        const { email, password } = userData;

        if (!email || !password) {
            return { success: false, error: "Email and password are required" };
        }
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            console.error("Error signing up", error);
            if (error.message.includes("already registered")) {
                alert("Email/Group Name is already registered");
            }
            return { success: false, error };
        }
        return { success: true, data };
    };

    const signInMentee = async (): Promise<AuthResponse> => {
        const { email, password } = userData

        if (!email || !password) {
            return { success: false, error: "Email and password is required" }
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            console.error("Error Singing in", error)
            return { success: false, error }
        }
        return { success: true, data }
    }


    return (
        <AuthContext.Provider value={{ signUpMentee, userData, setUserData, signInMentee }}>
            {children}
        </AuthContext.Provider>
    );
};

export const UserAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("UserAuth must be used within AuthContextProvider");
    }
    return context;
};
