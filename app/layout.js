import { Bricolage_Grotesque, Space_Grotesk } from 'next/font/google';
import AppFooter from '@/components/AppFooter';
import './globals.css';

const bodyFont = Space_Grotesk({
  variable: '--font-body',
  subsets: ['latin'],
});

const displayFont = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
});

export const metadata = {
  title: 'CoC Dashboard',
  description: 'Clash of Clans Analytics Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <main className="app-main">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
