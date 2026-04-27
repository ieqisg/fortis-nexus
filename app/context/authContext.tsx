"use client";
import { createContext, useEffect, useState, useContext, ReactNode } from "react";
import { supabase } from "../config/supabaseClient";
import { getUserRole } from "@/lib/actions/authActions";


type AuthResponse = {
    success: boolean;
    data?: {
        user?: any;
        session?: any;
        role?: string;
    };
    error?: any;
}

type AuthContextType = {
    signUp: () => Promise<AuthResponse>;
    signIn: () => Promise<AuthResponse>
    getUser: () => Promise<AuthResponse>
    signOut: () => Promise<AuthResponse>
    userData: { email: string; password: string };
    setUserData: (data: { email: string; password: string }) => void;

};



const AuthContext = createContext<AuthContextType | null>(null);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [userData, setUserData] = useState({ email: "", password: "" });

    const signUp = async (): Promise<AuthResponse> => {
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

    const signIn = async (): Promise<AuthResponse> => {
        const { email, password } = userData

        if (!email || !password) {
            return { success: false, error: "Email and password is required" }
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            console.error("Error Signing in", error)
            if (error.message.includes("Invalid")) {
                alert(" Invalid login credentials")
            }
            return { success: false, error }
        }

        const { role } = await getUserRole(data.user.id)
        console.log("role from getUserRole:", role)

        return { success: true, data: { ...data, role } }
    }

    const getUser = async (): Promise<AuthResponse> => {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
            console.error("Error getting user", error)
            return { success: false, error }
        }
        return { success: true, data: { user } }
    }

    const signOut = async (): Promise<AuthResponse> => {
        const { error } = await supabase.auth.signOut()

        if (error) {
            console.error("Error signing out", error)
            return { success: false, error }
        }
        return { success: true }
    }


    return (
        <AuthContext.Provider value={{ signUp, userData, setUserData, signIn, getUser, signOut }}>
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
