import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../config/msalConfig";
import { useState } from "react";

export const useMicrosoftAuth = () => {
    const { instance, accounts } = useMsal();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await instance.loginPopup(loginRequest);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to sign in");
            console.error("Error during sign in:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = () => {
        instance.logoutPopup();
    };

    return {
        isAuthenticated: accounts.length > 0,
        user: accounts[0] || null,
        signIn,
        signOut,
        isLoading,
        error
    };
}; 