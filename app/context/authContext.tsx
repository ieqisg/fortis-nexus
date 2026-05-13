"use client";
import { createContext, useEffect, useState, useContext, ReactNode } from "react";
import { supabase } from "../config/supabaseClient";
import { getUserRole } from "@/lib/actions/authActions";
import { toast, Toaster } from "sonner";


type AuthResponse = {
    success: boolean;
    data?: {
        user?: any;
        session?: any;
        role?: string;
        is_admin?: boolean;
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
                toast.error("Email is already registered")
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
            if (error.message.includes("Invalid login credentials")) {
                toast.error("Invalid email or password")
            }
            return { success: false, error }
        }

        // Revoke all other sessions so only this device stays logged in
        await supabase.auth.signOut({ scope: 'others' })

        const { role, is_admin } = await getUserRole(data.user.id)

        return { success: true, data: { ...data, role, is_admin } }
    }

    const getUser = async (): Promise<AuthResponse> => {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
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
