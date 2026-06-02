import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starbem — Product Roadmap",
  description: "Visão de produto por ciclo, sprint e OKR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
