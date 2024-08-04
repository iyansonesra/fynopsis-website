"use client";
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
      loginWith: { // Optional
        oauth: {
          domain: 'fynopsis.auth.us-east-1.amazoncognito.com',
          scopes: ['aws.cognito.signin.user.admin'],
          redirectSignIn: ['http://localhost:3000/dashboard', 'http://localhost:3000/', 'http://localhost:3000/signin'],
          redirectSignOut: ['http://localhost:3000'],
          responseType: 'code',
        }
      }
    },
    
  },
  API: {
   REST: {
       testAPI: {
         endpoint:
           'https://4s693esbca.execute-api.us-east-1.amazonaws.com/test',
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