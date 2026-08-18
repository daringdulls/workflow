import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkFlow · Pixelate MV",
  description: "One dashboard for Hotel Ops, Graphic Design, and Freelance work.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
