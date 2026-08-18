import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Postador Insta",
  description: "Agendador de publicações para Instagram",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
