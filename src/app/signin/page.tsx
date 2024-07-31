"use client";
import { Authenticator } from "../../components/Authenticator";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import Home from "../pages/MainPage";
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Sign } from "crypto";
import SignInDetails from "./SignInDetails";




export default function Signin() {
  

 return (
   <AmplifyAuthenticator.Provider>
     <SignInDetails/>
   </AmplifyAuthenticator.Provider>
 );
}
