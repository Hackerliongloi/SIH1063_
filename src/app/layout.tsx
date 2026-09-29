import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polar Portal | NCPOR - Ministry of Earth Sciences, Govt. of India",
  description:
    "Integrated Polar Science Outreach, Knowledge Repository & Media Dissemination Portal for Indian Antarctic, Arctic, Southern Ocean and Himalayan Cryosphere Expeditions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#060d17] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
