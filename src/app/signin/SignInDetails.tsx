"use client";
import { Authenticator } from "../../components/Authenticator";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import Home from "../pages/MainPage";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CircularProgress } from "@mui/material";



export default function SignInDetails() {
    const { user } = useAuthenticator((context) => [context.user]);

    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push("/dashboard");
        }
    }, [user, router]);

  

    return (
        <Authenticator>
            <div className="grid h-screen place-items-center">
                <CircularProgress value={0.5} />
            </div>
        </Authenticator>
    );
}
