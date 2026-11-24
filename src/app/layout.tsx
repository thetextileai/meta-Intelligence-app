import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tameta Decision Intelligence",
  description: "Shopify Meta Ads ROAS & Campaign Decision Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clientId = process.env.SHOPIFY_CLIENT_ID || "b5a43396667708536cddc4e977f4dd3e";

  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={clientId} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body className="min-h-screen bg-[#f6f6f7] text-[#202223] antialiased">
        {children}
      </body>
    </html>
  );
}
