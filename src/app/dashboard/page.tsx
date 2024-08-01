"use client";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { useEffect } from 'react';
import { Sign } from "crypto";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import Home from "../pages/MainPage";


export default function Dashboard() {
  const { user } = useAuthenticator();

  const router = useRouter();
  useEffect(() => {
    if (!user) {
        router.push("/signin");
    } 
  }, [user, router]);

  return (
    user ? 
    <AmplifyAuthenticator.Provider>
      <Home/>
    </AmplifyAuthenticator.Provider> : 
    <AmplifyAuthenticator.Provider>
      Checking session...
    </AmplifyAuthenticator.Provider>
    
  );
}
