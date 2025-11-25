import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import TopProgressBar from "@/components/commons/TopProgressBar";
import "./globals.css";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import LanguageProvider from "@/providers/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Copany",
  description: "Collaborate freely, creatively, and without limits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TopProgressBar />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <ReactQueryProvider>{children}</ReactQueryProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
