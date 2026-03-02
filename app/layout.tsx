import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bootroom",
  description: "Stats-focused soccer intelligence — EPL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <script
          src="https://cdn.visitors.now/v.js"
          data-token="71d9307d-2856-44aa-8f2b-4946c1789973"
          data-persist
          async
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
