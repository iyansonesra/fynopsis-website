"use client";
import { Authenticator } from "../../components/Authenticator";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import Home from "../pages/MainPage";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';



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
            Redirecting...
        </Authenticator>
    );
}
