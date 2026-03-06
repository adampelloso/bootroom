import type { Metadata } from "next";
import Script from "next/script";
import { Space_Mono, Inter } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mono",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bootroom.gg"),
  title: "Bootroom | Match analytics that find the edge",
  description: "Stats-focused soccer intelligence — EPL",
  openGraph: {
    title: "Bootroom | Match analytics that find the edge",
    description: "Stats-focused soccer intelligence — EPL",
    url: "https://bootroom.gg",
    siteName: "Bootroom",
    type: "website",
    images: [
      {
        url: "/images/cover.png",
        width: 1200,
        height: 630,
        alt: "Bootroom social cover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bootroom | Match analytics that find the edge",
    description: "Stats-focused soccer intelligence — EPL",
    images: ["/images/cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceMono.variable} ${inter.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (window.location.pathname !== '/') {
                  var theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                }
              })();
            `,
          }}
        />
        <Script
          src="https://cdn.visitors.now/v.js"
          data-token="8bf5e591-e885-4564-bffa-246d51f430db"
          data-persist=""
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
