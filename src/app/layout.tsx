import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDS : Gerbang Digital Sekolah | ABSENSI QR CODE SDN KANDANGAN I TOSARI",
  description: "GDS : Gerbang Digital Sekolah - Sistem Otomasi Presensi & Keamanan Gerbang Sekolah Berbasis QR Code Terintegrasi Real-Time SDN Kandangan I Tosari, Kec. Tosari, Kab. Pasuruan, Jawa Timur",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F2744",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
