import './globals.css';
import type { Metadata } from 'next';
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: 'RPSLS',
  description: 'A Web3 app that allows you to play Rock, Paper, Scissors, Lizard, Spock against another player on the Sepolia testnet while wagering Ether',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-full w-full bg-black text-white">
        {children}
        <Footer />
      </body>
    </html>
  )
}
