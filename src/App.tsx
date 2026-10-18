import { Routes, Route } from 'react-router-dom'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import VisitorPasses from '@/pages/VisitorPasses'
import Incidents from '@/pages/Incidents'
import IncidentDetail from '@/pages/IncidentDetail'
import Alerts from '@/pages/Alerts'
import Analytics from '@/pages/Analytics'
import Community from '@/pages/Community'
import Welfare from '@/pages/Welfare'
import UsersPage from '@/pages/Users'
import Billing from '@/pages/Billing'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import Payments from '@/pages/Payments'
import Finances from '@/pages/Finances'
import Repairs from '@/pages/Repairs'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="visitor-passes" element={<VisitorPasses />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<Settings />} />

          {/* Estate life: residents, guards and admins. Police only get alerts and incidents. */}
          <Route element={<ProtectedRoute roles={['resident', 'guard', 'admin', 'super_admin']} />}>
            <Route path="community" element={<Community />} />
            <Route path="welfare" element={<Welfare />} />
            <Route path="repairs" element={<Repairs />} />
          </Route>

          {/* Money: only the people who pay (residents) and run the estate (admins). */}
          <Route element={<ProtectedRoute roles={['resident', 'admin', 'super_admin']} />}>
            <Route path="payments" element={<Payments />} />
            <Route path="finances" element={<Finances />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
            <Route path="analytics" element={<Analytics />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="billing" element={<Billing />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
