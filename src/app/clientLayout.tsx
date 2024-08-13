"use client";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
 

if (!process.env.NEXT_PUBLIC_USER_POOL_ID || !process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID) {
  throw new Error('Environment variables NEXT_PUBLIC_USER_POOL_ID and NEXT_PUBLIC_USER_POOL_CLIENT_ID must be set');
}

Amplify.configure({
  Auth: {
    Cognito: {
      //  Amazon Cognito User Pool ID
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
      // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
      
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
      // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
      identityPoolId: 'us-east-1:e905629f-9f02-4ff7-b6de-6f9f24233685',
      // OPTIONAL - Set to true to use your identity pool's unauthenticated role when user is not logged in
      // allowGuestAccess: true,
      // // OPTIONAL - This is used when autoSignIn is enabled for Auth.signUp
      // // 'code' is used for Auth.confirmSignUp, 'link' is used for email link verification
      signUpVerificationMethod: 'code', // 'code' | 'link'
      loginWith: { // Optional
        oauth: {
          domain: 'https://fynopsis.auth.us-east-1.amazoncognito.com',  // auth.fynopsis.ai
          scopes: ['aws.cognito.signin.user.admin'],
          redirectSignIn: ['http://localhost:3000/signin'], // https://fynopsis.ai/signin
          redirectSignOut: ['http://localhost:3000'], // https://fynopsis.ai
          responseType: 'code',
        }
      }
    },
    
  },
  API: {
   REST: {
       testAPI: {
         endpoint:
           'https://4s693esbca.execute-api.us-east-1.amazonaws.com/test', // main
         region: 'us-east-1' // Optional
       }
    }
  },
 });


const ClientComponent = ({ children }: { children: React.ReactNode }) => {
  return (
    <AmplifyAuthenticator.Provider>
      {children}
    </AmplifyAuthenticator.Provider>
  );
};
export default ClientComponent;