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
          data-token="8bf5e591-e885-4564-bffa-246d51f430db"
          data-persist
          async
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
