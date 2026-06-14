import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shared Expenses App',
  description: 'Manage flatmate expenses and settlements',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          <header className="flex justify-between items-center mb-8">
            <a href="/" style={{ textDecoration: 'none' }}>
              <h1 className="header-title">SplitEase</h1>
            </a>
            <nav className="flex gap-4">
              <a href="/import" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Import CSV</a>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
