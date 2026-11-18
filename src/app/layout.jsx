import './globals.css';
import { AccessibilityProvider } from '@/components/AccessibilityProvider';

export const metadata = {
  title: { default: 'MedFlow HMIS', template: '%s | MedFlow' },
  description: 'One System, Seamless Healthcare. Sistem Manajemen Rumah Sakit terpadu.',
  icons: {
    icon: '/medflow-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="bg-sky-50 text-slate-800 antialiased min-h-screen flex flex-col font-sans">
        <AccessibilityProvider>
          {children}
        </AccessibilityProvider>
      </body>
    </html>
  );
}
