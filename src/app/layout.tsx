import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import AuthButton from "./components/AuthButton";

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
    <html lang="en">
      <body className={`${exo2.className} min-h-screen`}>
        <AuthProvider>
          <header className="p-4 border-b border-[rgb(var(--border-color))] flex justify-end bg-[rgb(var(--background-start-rgb))] sticky top-0 z-10">
            <AuthButton />
          </header>
          <main className="p-4 md:p-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
