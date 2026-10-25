import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HiperMove — AI Movement Biomechanics & Gemma 4 Coach",
  description:
    "Zero-video-upload exercise biomechanics, WebAssembly pose estimation, and Google Gemma 4 multimodal reasoning — deployed on DigitalOcean App Platform.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable} dark font-poppins`}>
      <body className="min-h-screen bg-[#0B0C0E] text-[#C5CAD2] antialiased selection:bg-[#F4F5F7] selection:text-[#0B0C0E] font-poppins">
        {/* Jamie McKaye Grain & Atmospheric Grid Background */}
        <div className="fixed inset-0 pointer-events-none z-0 jamie-atmosphere opacity-90" />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
