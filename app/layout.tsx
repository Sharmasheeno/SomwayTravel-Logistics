import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Macruf Travel and Cargo Agency",
  description: "Book flights, submit visa applications, move air cargo and track your status with Macruf Travel and Cargo Agency.",
  openGraph: { title: "Macruf Travel and Cargo Agency", description: "Your journey, moving forward—flight booking, visa applications, air cargo and online tracking.", type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Macruf Travel and Cargo Agency", description: "Your journey, moving forward—flight booking, visa applications, air cargo and online tracking.", images: ["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
