import { MsalProvider as DefaultMsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '@/config/authConfig';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

interface MsalProviderProps {
  children: React.ReactNode;
}

export const MsalProvider: React.FC<MsalProviderProps> = ({ children }) => {
  return (
    <DefaultMsalProvider instance={msalInstance}>
      {children}
    </DefaultMsalProvider>
  );
};

export default MsalProvider; 