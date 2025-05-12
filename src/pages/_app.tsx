import { MsalProvider } from '@/components/providers/MsalProvider';
import { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MsalProvider>
      <Component {...pageProps} />
    </MsalProvider>
  );
}

export default MyApp; 