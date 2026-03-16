import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'FlowScope – Automation Intelligence', description: 'Google Maps for business automations.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
