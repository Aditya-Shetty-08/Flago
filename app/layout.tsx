import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import FlagoNavbar from "@/components/flago-navbar";
import ConditionalNavbar from "@/components/conditional-navbar";
import Footer from "@/components/footer";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

/**
 * Wave Background Component
 * Rotating circular waves for background decoration
 */
const WaveBackground = () => {
  return (
    <div 
      className="fixed top-0 left-0 pointer-events-none z-0"
      style={{ 
        transform: 'rotate(80deg)',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Wave One */}
      <div
        className="wave-drift-1"
        style={{
          position: 'absolute',
          top: '3%',
          left: '10%',
          opacity: 0.3,
          background: '#001a33',
          width: '1500px',
          height: '1300px',
          marginLeft: '-150px',
          marginTop: '-250px',
          transformOrigin: '50% 48%',
          borderRadius: '43%',
        }}
      />
      
      {/* Wave Two */}
      <div
        className="wave-drift-2"
        style={{
          position: 'absolute',
          top: '3%',
          left: '10%',
          opacity: 0.2,
          background: '#000000',
          width: '1500px',
          height: '1300px',
          marginLeft: '-150px',
          marginTop: '-250px',
          transformOrigin: '50% 48%',
          borderRadius: '43%',
        }}
      />
      
      {/* Wave Three */}
      <div
        className="wave-drift-3"
        style={{
          position: 'absolute',
          top: '3%',
          left: '10%',
          backgroundColor: '#003366',
          opacity: 0.25,
          width: '1500px',
          height: '1300px',
          marginLeft: '-150px',
          marginTop: '-250px',
          transformOrigin: '50% 48%',
          borderRadius: '43%',
        }}
      />
    </div>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${geistSans.className} antialiased`}
        style={{ 
          backgroundColor: '#001122', 
          overflowX: 'hidden', 
          overflowY: 'auto',
          minHeight: '100vh'
        }}
      >
        <WaveBackground />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative z-10 flex flex-col min-h-screen">
            <ConditionalNavbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
