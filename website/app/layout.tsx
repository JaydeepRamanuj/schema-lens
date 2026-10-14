import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Geist, Geist_Mono } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen bg-[#10131c] text-[#e1e2ee] antialiased" style={{ fontFamily: 'var(--font-geist), Inter, system-ui, sans-serif' }}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
