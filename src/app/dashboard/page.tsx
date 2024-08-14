"use client";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { useEffect } from 'react';
import { Sign } from "crypto";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import Home from "../pages/MainPage";
import { get } from 'aws-amplify/api';
import { put } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuthenticator();
  

  const router = useRouter();
  useEffect(() => {
    if (!user) {
        router.push("/signin");
    } 
  }, [user, router]);

  async function handleFetchAccess() {
    try {
      const access = (await fetchAuthSession()).tokens?.accessToken?.toString();
      if (!access) {
        throw new Error("Token is null or undefined");
        
      }
      console.log(access);
      return access;
    } catch (error) {
      // console.log(error);
    }
  };

  async function getRecentSearches() {
      // const accessToken = await handleFetchAccess();
      // if (accessToken) {
        try {
            const restOperation = get({
                      apiName: 'testAPI',
                      path: '/fetchPastSearches', // Adjust this path as needed
                      // body: {
                      //   recent_search: 'Apple'
                      // }
                      // options: {
                      //   body: {
                      //     recent_search: 'Apple'
                      //   }
                      // }
                    });
            const { body } = await restOperation.response;
            const responseText = await body.text();
            // console.log('Raw response:', responseText);

            const responseMain = JSON.parse(responseText);
            console.log('Recent searches:', responseMain);
        } catch (error) {
            console.error('Error fetching recent searches:', error);
        }
    // }
  }

  async function putSearches() {
    // const accessToken = await handleFetchAccess();
    // if (accessToken) {
      try {
          const restOperation = put({
                    apiName: 'testAPI',
                    path: '/passSearchesTest', // Adjust this path as needed
                    // body: {
                    //   recent_search: 'Apple'
                    // }
                    options: {
                      body: {
                        recent_search: 'Google'
                      }
                    }
                  });
          const { body } = await restOperation.response;
          const responseText = await body.text();
          // console.log('Raw response:', responseText);

          const responseMain = JSON.parse(responseText);
          console.log('Recent searches:', responseMain);
      } catch (error) {
          console.error('Error fetching recent searches:', error);
      }
  // }
}

  // getRecentSearches();
  // handleFetchAccess();

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
