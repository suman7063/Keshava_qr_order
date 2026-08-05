import { redirect } from 'next/navigation'

// One login for everyone — /login routes to the right panel by role.
export default function ManagerLoginRedirect() {
  redirect('/login')
}
