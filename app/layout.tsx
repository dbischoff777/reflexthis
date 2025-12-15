import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
// Ensure drei is imported early to register components with R3F
import '@react-three/drei';
import { ErrorBoundaryWrapper } from "@/components/ErrorBoundaryWrapper";
import { CRTOverlay } from "@/components/CRTOverlay";
import { InteractionPrevention } from "@/components/InteractionPrevention";

const geistSans = GeistSans;

const geistMono = GeistMono;

const rajdhani = localFont({
  variable: "--font-rajdhani",
  src: [
    {
      path: "../public/fonts/rajdhani/Rajdhani-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/rajdhani/Rajdhani-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/rajdhani/Rajdhani-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/rajdhani/Rajdhani-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "Reflex This - Reflex Training Game",
  description: "Test your reflexes!",
  icons: {
    icon: "/logo/ReflexIcon.jpg",
    shortcut: "/logo/ReflexIcon.jpg",
    apple: "/logo/ReflexIcon.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Resource hints for critical splash screen assets */}
        <link rel="preload" href="/logo/ReflexIcon.jpg" as="image" />
        <link rel="prefetch" href="/animation/ReflexIconAnimated.mp4" />
        <link rel="prefetch" href="/animation/menu-background-animated.mp4" />
        <link rel="prefetch" href="/game" as="document" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} antialiased`}
      >
        <InteractionPrevention />
        <CRTOverlay />
        <ErrorBoundaryWrapper>
          {children}
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
