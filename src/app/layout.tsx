import type { Metadata } from "next";
import { Montserrat, Inter, Poppins, Cormorant, Open_Sans } from "next/font/google";
import "./globals.css";
import ClientComponent from "./clientLayout";
import { CSPostHogProvider } from './providers';
import logo from '../app/assets/fynopsis_noBG.png'
// Remove this import
// import { DndProvider } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';


const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-montserrat',
});

const open_sans = Open_Sans({
  subsets: ["latin"],
  weight: [ '300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-open-sans',
});

const cormorant = Cormorant({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-cormorant',
});


const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});


export const metadata: Metadata = {
  title: "Fynopsis",
  description: "The First Ever AI-Native Data Room",
  icons: {
    icon: [
      { url: '/fynopsis_noBG.png', sizes: 'any' },
    ],
  },
  openGraph: {
    title: "Fynopsis",
    description: "The First Ever AI-Native Data Room",
    images: [
      {
        url: '/fynopsis_noBG.png', // Path to logo in public directory
        width: 1200,
        height: 630,
        alt: 'Fynopsis Logo',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Fynopsis",
    description: "The First Ever AI-Native Data Room",
    images: ['/fynopsis_noBG.png'], // Path to logo in public directory
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${poppins.variable} ${inter.variable} ${cormorant.variable} ${inter.variable}  ${open_sans.variable} font-sans`}>
        <CSPostHogProvider>
          <ClientComponent>
            {children}
          </ClientComponent>
        </CSPostHogProvider>
      </body>
    </html>
  );
}