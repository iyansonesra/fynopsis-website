import { PropsWithChildren } from "react";
import {
  Authenticator as AmplifyAuthenticator,
  ThemeProvider as AmplifyThemeProvider,
  Theme,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";
import { signInWithRedirect } from "aws-amplify/auth"
import { BackgroundBeams } from "./ui/background-beams";

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
            backgroundColor: { value: "white" },
          },
          router: {
            borderWidth: { value: "0" },
            //  borderRadius: { value: "{radi.large}" }, // Added border radius for the container

          },
          state: {
            inactive: {
              backgroundColor: { value: "{colors.brand.primary.100}" },
            },
          },
        },
        button: {
          primary: {
            backgroundColor: { value: "darkblue" },
            _hover: {
              backgroundColor: { value: "darkblue" },
            },
          },
        },
        tabs: {
          item: {
            borderColor: { value: "{colors.brand.primary.100}" },
            color: { value: "black" }, // Changed to black for non-active tabs
            _active: {
              backgroundColor: { value: "darkblue" },
              color: { value: "white" },
              borderColor: { value: "{colors.brand.secondary.40}" },
            },
            _hover: {
              color: { value: "darkblue" }, // Changed to darkblue for hover state
            },
            _focus: {
              color: { value: "darkblue" }, // Changed to darkblue for focus state
            },
          },
        },
      },
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg:dark-bg">
      <BackgroundBeams />
      <AmplifyThemeProvider theme={theme} >
        <AmplifyAuthenticator
          variation="modal"
          signUpAttributes={["given_name", "family_name"]}
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
    </div>

  );
};