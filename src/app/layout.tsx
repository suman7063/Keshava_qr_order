import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://bicres.com"),
  title: {
    default: "bicres — QR Ordering Platform for Restaurants",
    template: "%s | bicres",
  },
  description:
    "Give every table a digital menu. Customers scan QR code, browse menu and order — kitchen gets notified instantly. Free to start.",
  keywords: [
    "QR menu", "digital menu", "restaurant ordering system", "QR code ordering",
    "table ordering", "kitchen display", "restaurant management", "bicres",
    "QR restaurant menu India", "online menu for restaurant",
  ],
  authors: [{ name: "bicres", url: "https://bicres.com" }],
  creator: "bicres",
  publisher: "bicres",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://bicres.com",
    siteName: "bicres",
    title: "bicres — QR Ordering Platform for Restaurants",
    description:
      "Give every table a digital menu. Customers scan QR code and order — kitchen notified instantly. Setup in 2 minutes. Free to start.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "bicres — QR Ordering Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "bicres — QR Ordering Platform for Restaurants",
    description: "Give every table a digital menu. Setup in 2 minutes. Free to start.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://bicres.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
