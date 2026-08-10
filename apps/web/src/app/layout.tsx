import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spark — 想法操作系统",
  description: "捕捉、孵化、连接你的想法",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
