'use client'

import { useRouter, useParams } from 'next/navigation';
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { CircularProgress } from "@mui/material";
import { useEffect } from 'react';
import DataRoom from '../../../../../pages/DataroomPage';
import { useFileStore } from '@/components/services/HotkeyService';

export default function IssuePage() {
  const router = useRouter();
  const params = useParams();
  const issueId = parseInt(params?.issueId as string);
  const { user } = useAuthenticator();
  const { setActiveIssueId, setActiveTab } = useFileStore();
  
  const handleBack = () => {
    // Navigate back to the dataroom without the issue detail
    const { id, subId } = params
    router.push(`/dataroom/${id}/${subId}`)
  }
  
  useEffect(() => {
    // Set the active issue ID in the store
    if (!isNaN(issueId)) {
      setActiveIssueId(issueId);
      
      // Issues tab is at index 6 based on the tabs array in DataroomPage
      setActiveTab(6);
    }
  }, [issueId, setActiveIssueId, setActiveTab]);
  
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
      <DataRoom />
    </AmplifyAuthenticator.Provider> : 
    <AmplifyAuthenticator.Provider>
      <div className="grid h-screen place-items-center">
        <CircularProgress value={0.5} />
      </div>
    </AmplifyAuthenticator.Provider>
  );
}