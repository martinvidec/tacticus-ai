import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { DebugProvider } from "@/lib/contexts/DebugContext";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";

const exo2 = Exo_2({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tacticus Player Stats",
  description: "View your Warhammer 40k: Tacticus player statistics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${exo2.className} min-h-screen`}>
        <AuthProvider>
          <DebugProvider>
            <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
          </DebugProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
