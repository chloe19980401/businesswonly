import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acquire OS｜全球B2B获客系统",
  description: "面向门锁出海工厂的全渠道客户情报、采购信号与销售协同系统。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
