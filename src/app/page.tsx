"use client";
import Dashboard from "./pages/Dashboard";
import StockSearch from "./pages/StockSearch";
import Settings from "./pages/Settings";
import { Authenticator } from "../components/Authenticator";
import  Home  from "./pages/MainPage";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
Amplify.configure({
 Auth: {
   Cognito: {
     //  Amazon Cognito User Pool ID
     userPoolId: 'us-east-1_TkLDTNi2B',
     // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
     userPoolClientId: '6gljb1n6e47mcua7itafoigeag',
     // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
     // identityPoolId: 'XX-XXXX-X:XXXXXXXX-XXXX-1234-abcd-1234567890ab',
     // OPTIONAL - Set to true to use your identity pool's unauthenticated role when user is not logged in
     // allowGuestAccess: true,
     // // OPTIONAL - This is used when autoSignIn is enabled for Auth.signUp
     // // 'code' is used for Auth.confirmSignUp, 'link' is used for email link verification
     signUpVerificationMethod: 'code', // 'code' | 'link'
   }
 }
});




export default function page() {




 return (
   <AmplifyAuthenticator.Provider>
     <Authenticator>
       <Home/>
     </Authenticator>
   </AmplifyAuthenticator.Provider>
 );
}
