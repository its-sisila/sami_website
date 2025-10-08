import "./global.css";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE_CONFIG } from "@/lib/site.config";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SAMI – AI Operational & Market Intelligence for Fuel Stations",
  description: SITE_CONFIG.meta.description,
  keywords: SITE_CONFIG.meta.keywords,
  openGraph: {
    title: "SAMI – AI Operational & Market Intelligence for Fuel Stations",
    description: SITE_CONFIG.meta.description,
    url: SITE_CONFIG.baseUrl,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SAMI – Fuel Station Intelligence",
    description: SITE_CONFIG.meta.description,
  },
  metadataBase: new URL(SITE_CONFIG.baseUrl),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SAMI",
    applicationCategory: "BusinessApplication",
    description: SITE_CONFIG.meta.description,
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Pilot access (contact for licensing)",
    },
    url: SITE_CONFIG.baseUrl,
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const t=localStorage.getItem('theme');if(t){document.documentElement.dataset.theme=t;if(t==='dark')document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans bg-hero-radial relative`}>
        {children}
      </body>
    </html>
  );
}
