"use client";
import { useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import GeneralDashboard from "../pages/Dashboard";
import { CircularProgress } from "@mui/material";

export default function Dashboard() {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/signin');
    }
  }, [authStatus, router]);

  if (authStatus === 'configuring') {
    return (
      <div className="grid h-screen place-items-center">
        <CircularProgress value={0.5} />
      </div>
    );
  }

  if (!user || authStatus !== 'authenticated') {
    return null;
  }

  return <GeneralDashboard />;
}