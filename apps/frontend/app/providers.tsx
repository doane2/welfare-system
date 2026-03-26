'use client'
import { AuthProvider } from '../lib/auth'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px' },
          success: { iconTheme: { primary: '#1e3a6e', secondary: '#fff' } },
        }}
      />
      {children}
    </AuthProvider>
  )
}
