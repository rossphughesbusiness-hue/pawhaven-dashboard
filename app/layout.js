export const metadata = {
  title: 'Hughes Financials',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0f172a', color: '#f1f5f9', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
