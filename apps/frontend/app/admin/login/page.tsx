import type { Metadata } from 'next'
import LoginForm from '../../../components/LoginForm'

// Not linked from the public site and hidden from search engines.
export const metadata: Metadata = {
  title: 'Staff Sign In | Crater SDA Welfare',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return <LoginForm audience="admin" />
}