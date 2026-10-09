import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Innov8IT Admin", template: "%s | Innov8IT Admin" },
  description: "Standalone administration portal for Innov8IT Task Manager.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-svh antialiased">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
