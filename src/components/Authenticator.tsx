import { PropsWithChildren } from "react";
import {
 Authenticator as AmplifyAuthenticator,
 ThemeProvider as AmplifyThemeProvider,
 Theme,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";
import { signInWithRedirect } from "aws-amplify/auth"

// const userPoolConfig = Amplify.getConfig();

// Amplify.configure({
//     Auth: {
//       Cognito: {
//         loginWith: {
//           oauth: {
//             redirectSignIn: [
//               'http://localhost:3000/'
//             ],
//             redirectSignOut: [
//               'http://localhost:3000/'
//             ]
//           }
//         },
//         ...userPoolConfig
//       }
//     }
// });

export const Authenticator: React.FC<PropsWithChildren> = ({ children }) => {
 const theme: Theme = {
   name: "bookshelf",
   tokens: {
     colors: {
       font: {
         secondary: { value: "{colors.brand.primary.90}" },
       },
       brand: {
         primary: {
           10: { value: "{colors.overlay.10}" },
           20: { value: "{colors.overlay.20}" },
           40: { value: "{colors.overlay.40}" },
           60: { value: "{colors.overlay.60}" },
           80: { value: "{colors.overlay.90}" },
           90: { value: "{colors.black}" },
           100: { value: "{colors.black}" },
         },
         secondary: {
           10: { value: "{colors.neutral.10}" },
           20: { value: "{colors.neutral.20}" },
           40: { value: "{colors.neutral.40}" },
           60: { value: "{colors.neutral.60}" },
           80: { value: "{colors.neutral.80}" },
           90: { value: "{colors.neutral.90}" },
           100: { value: "{colors.neutral.100}" },
         },
       },
     },
     radii: {
       small: { value: "0.75rem" },
     },
     components: {
       authenticator: {
         modal: {
           backgroundColor: { value: "{colors.blue.40}" },
         },
         router: {
           borderWidth: { value: "0" },
         },
         state: {
           inactive: {
             backgroundColor: { value: "{colors.brand.primary.100}" },
           },
         },
       },
       tabs: {
         item: {
           borderColor: { value: "{colors.brand.primary.100}" },
           color: { value: "{colors.brand.secondary.20}" },
           _active: {
             backgroundColor: { value: "{colors.brand.primary.100}" },
             color: { value: "{colors.brand.secondary.10}" },
             borderColor: { value: "{colors.brand.secondary.40}" },
           },
           _hover: {
             color: { value: "{colors.brand.secondary.40}" },
           },
           _focus: {
             color: { value: "{colors.brand.secondary.40}" },
           },
         },
       },
     },
   },
 };


 return (
   <AmplifyThemeProvider theme={theme} >
    {/* socialProviders={['google']} */}
     <AmplifyAuthenticator 
       variation="modal"
       signUpAttributes={["given_name", 
        "family_name"
       ]}
       socialProviders={['google']}
       formFields={{
         signIn: {
           username: {
             label: "Email",
             placeholder: "Enter your email",
           },
         },
         signUp: {
            given_name: {
                label: "First name",
                placeholder: "Enter your first name",
            },
            family_name: {
                label: "Last name",
                placeholder: "Enter your last name",
            },
            username: {
                label: "Email",
                placeholder: "Enter your email",
            }
         },
       }}
     >
       {children}
     </AmplifyAuthenticator>
   </AmplifyThemeProvider>
 );
};
