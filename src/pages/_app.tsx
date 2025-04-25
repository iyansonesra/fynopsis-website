import { MsalProvider } from '@/components/providers/MsalProvider';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MsalProvider>
      <Component {...pageProps} />
    </MsalProvider>
  );
}

export default MyApp; 