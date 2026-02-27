"use client";
import { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../config/supabaseClient.js";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const signUpMentee = async (email, password) => {
    if (!email || !password) {
      return { error: "Email and password are required" };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Error Signing Up");
      return { success: false, error };
    }
    return { success: true, data };
  };

  return (
    <AuthContext.Provider value={{ signUpMentee }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  return useContext(AuthContext);
};
