import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OFILAB | OCR Documentos Procesados',
  description: 'Sistema de gestión y procesamiento OCR inteligente para facturas y guías de despacho OFILAB.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-pink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
