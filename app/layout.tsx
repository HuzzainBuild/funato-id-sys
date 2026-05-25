import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FUNATO ID Card System',
  description: 'Federal University of Agriculture and Technology, Okeho - Student ID Card Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
