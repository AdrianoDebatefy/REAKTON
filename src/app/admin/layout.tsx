import { Rajdhani } from "next/font/google";
import "../globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body
        className={`${rajdhani.variable} min-h-screen bg-[#050508] text-[#e8e8ec] antialiased`}
        style={{ fontFamily: "var(--font-rajdhani), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
