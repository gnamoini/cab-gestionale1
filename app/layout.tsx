import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { CAB_THEME_STORAGE_KEY } from "@/lib/theme/cab-theme-storage";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAB — Gestionale manutenzione igiene urbana",
  description:
    "Gestionale web per officina: magazzino ricambi, lavorazioni, ERP/CRM, report e documentale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootScript = `(function(){try{var k=${JSON.stringify(CAB_THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var d;if(s==="dark")d=true;else if(s==="light")d=false;else d=window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="gestionale-scrollbar flex min-h-full flex-col font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
