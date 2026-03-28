"use client";
import { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../config/supabaseClient.js";

const AuthContext = createContext(null);

export const AuthContextProvider = ({ children }) => {
  const [userData, setUserData] = useState({ email: "", password: "" });

  const signUpMentee = async () => {
    const { email, password } = userData;

    if (!email || !password) {
      return { error: "Email and password are required" };
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

  return (
    <AuthContext.Provider value={{ signUpMentee, userData, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  return useContext(AuthContext);
};
