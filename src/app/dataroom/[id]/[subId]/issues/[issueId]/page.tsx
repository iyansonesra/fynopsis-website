'use client'

import { useRouter, useParams } from 'next/navigation'
import { IssueDetail } from '@/components/issueDetail'
// import Home from "../../../../pages/DataroomPage"
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { CircularProgress } from "@mui/material";
import { useEffect } from 'react';

export default function IssuePage() {
  const router = useRouter()
  const params = useParams()
  const issueId = parseInt(params?.issueId as string)
  const { user } = useAuthenticator();
  
  const handleBack = () => {
    // Navigate back to the dataroom without the issue detail
    const { id, subId } = params
    router.push(`/dataroom/${id}/${subId}`)
  }
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!user) {
        router.push("/signin");
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [user, router]);
  
  return (
    user ? 
    <AmplifyAuthenticator.Provider>
          <IssueDetail issueId={issueId} onBack={handleBack} />
    </AmplifyAuthenticator.Provider> : 
    <AmplifyAuthenticator.Provider>
      <div className="grid h-screen place-items-center">
        <CircularProgress value={0.5} />
      </div>
    </AmplifyAuthenticator.Provider>
  )
}