import type { Metadata, Viewport } from "next";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "./globals.css";
import "./somway.css";
import "../somway_ui_handoff/src/styles.css";
import "./somway-handoff-compat.css";

// Without this the page has no viewport meta tag at all, so phones lay the
// site out at ~980px and scale it down: every breakpoint below 980px never
// fires. Zoom is deliberately left enabled.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SomWay Travel & Logistics",
  description:
    "Flight booking, visa applications, cargo logistics and live status tracking with SomWay Travel & Logistics.",
  openGraph: {
    title: "SomWay Travel & Logistics",
    description:
      "Your way to the world through connected travel, visa and cargo services.",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SomWay Travel & Logistics",
    description:
      "Your way to the world through connected travel, visa and cargo services.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/somway-primary-logo-alpha.png",
    shortcut: "/somway-primary-logo-alpha.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
