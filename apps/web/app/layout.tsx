import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalProviders } from "~/providers/global";
import { AnimatedBackground } from "~/components/animated-background";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ShipFlow AI",
  description:
    "AI product ops for turning feature ideas into reviewed, approved, shipped software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} relative min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-orange-500/30 selection:text-orange-200`}>
        <AnimatedBackground />
        <GlobalProviders>
          <div className="relative z-10 flex min-h-screen flex-col">
            {children}
          </div>
        </GlobalProviders>
      </body>
    </html>
  );
}
