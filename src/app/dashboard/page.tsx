"use client";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { use, useEffect } from 'react';
import { Sign } from "crypto";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import Home from "../../pages/DataroomPage";
import GeneralDashboard from "../../pages/Dashboard";
import { get } from 'aws-amplify/api';
import { put } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@mui/material";

export default function Dashboard() {
  const { user } = useAuthenticator();
  

  const router = useRouter();
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!user) {
        router.push("/signin");
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [user, router]);

  // getRecentSearches();
  // handleFetchAccess();

  return (
    user ? 
    <AmplifyAuthenticator.Provider>
      <GeneralDashboard/>
    </AmplifyAuthenticator.Provider> : 
    <AmplifyAuthenticator.Provider>
      <div className="grid h-screen place-items-center">
        <CircularProgress value={0.5} />
      </div>
    </AmplifyAuthenticator.Provider>
    
  );
}
