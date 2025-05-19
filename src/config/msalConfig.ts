import { Configuration, PopupRequest } from "@azure/msal-browser";

// MSAL configuration
export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
        authority: `https://login.microsoftonline.com/common`,
        redirectUri: "http://localhost:3000",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

// Add here scopes for id token to be used at MS Identity Platform endpoints.
export const loginRequest: PopupRequest = {
    scopes: ["User.Read", "Files.Read", "Files.Read.All", "Sites.Read.All"]
};

// Add here the endpoints for MS Graph API services you'd like to use.
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphDriveEndpoint: "https://graph.microsoft.com/v1.0/me/drive",
    graphSitesEndpoint: "https://graph.microsoft.com/v1.0/sites"
}; 