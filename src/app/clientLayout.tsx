"use client";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { Montserrat, Poppins } from "next/font/google";
import { ThemeProvider, createTheme } from '@mui/material/styles';

if (!process.env.NEXT_PUBLIC_USER_POOL_ID || !process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID) {
  throw new Error('Environment variables NEXT_PUBLIC_USER_POOL_ID and NEXT_PUBLIC_USER_POOL_CLIENT_ID must be set');
}

const montserrat = Montserrat({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat',
});

const poppins = Poppins({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

const theme = createTheme({
  typography: {
    allVariants: {
      fontFamily: montserrat.style.fontFamily,
      textTransform: 'none',
      fontSize: 16,
    },
  },
});

Amplify.configure({
  Auth: {
    Cognito: {
      //  Amazon Cognito User Pool ID
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
      // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)

      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID, // change this one
      // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
      identityPoolId: 'us-east-1:2032ae39-7405-4bd1-b2db-cf5aef2ff28b',
      // mandatorySignIn: true,
      // OPTIONAL - Set to true to use your identity pool's unauthenticated role when user is not logged in
      // allowGuestAccess: true,
      // // OPTIONAL - This is used when autoSignIn is enabled for Auth.signUp
      // // 'code' is used for Auth.confirmSignUp, 'link' is used for email link verification
      signUpVerificationMethod: 'code', // 'code' | 'link'
      loginWith: { // Optional
        oauth: {
          domain: 'auth.fynopsis.ai',  // 
          scopes: ['aws.cognito.signin.user.admin', 'email', 'profile', 'openid'],
          redirectSignIn: ['https://fynopsis.ai/signin'], // 
          redirectSignOut: ['https://fynopsis.ai'], // 
          responseType: 'code',
        }
      },
    },

  },
  API: {
    REST: {
      // testAPI: {
      //   endpoint:
      //     'https://4s693esbca.execute-api.us-east-1.amazonaws.com/test', // main
      //   region: 'us-east-1' // Optional
      // },
      VdrBucketAPI: {
        endpoint:
          'https://barfwuro11.execute-api.us-east-1.amazonaws.com/prod', // main
        region: 'us-east-1', // Optional
      }
    }
  },
});


const ClientComponent = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme = {theme}>
      <AmplifyAuthenticator.Provider>
        {children}
      </AmplifyAuthenticator.Provider>
    </ThemeProvider>
  );
};
export default ClientComponent;