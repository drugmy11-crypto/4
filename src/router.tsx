import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ChoosePairPage } from '../pages/ChoosePairPage/ChoosePairPage'
import { DepositPage } from '../pages/DepositPage/DepositPage'
import { DepositDetailsPage } from '../pages/DepositDetailsPage/DepositDetailsPage'
import { FAQPage } from '../pages/FAQPage/FAQPage'
import { HomePage } from '../pages/HomePage/HomePage'
import { ProfilePage } from '../pages/ProfilePage/ProfilePage'
import { SettingsPage } from '../pages/SettingsPage/SettingsPage'
import { SignalsPage } from '../pages/SignalsPage/SignalsPage'
import { TopTradersPage } from '../pages/TopTradersPage/TopTradersPage'
import { TradePage } from '../pages/TradePage/TradePage'
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage/TransactionHistoryPage'
import { UserDetailPage } from '../pages/UserDetailPage/UserDetailPage'
import { UsersPage } from '../pages/UsersPage/UsersPage'
import { WithdrawPage } from '../pages/WithdrawPage/WithdrawPage'
import { AdminLinksPage } from '../pages/admin/AdminLinksPage/AdminLinksPage'
import { AdminProfilePage } from '../pages/admin/AdminProfilePage/AdminProfilePage'
import { AdminRequisitesPage } from '../pages/admin/AdminRequisitesPage/AdminRequisitesPage'
import { AdminTopTradersPage } from '../pages/admin/AdminTopTradersPage/AdminTopTradersPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage/AdminUsersPage'
import { useUserStore } from '../store/userStore'

let adminRouteLoadRequested = false

function AdminRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const currentUser = useUserStore((state) => state.currentUser)
  const isLoading = useUserStore((state) => state.isLoading)
  const loadUser = useUserStore((state) => state.loadUser)

  useEffect(() => {
    if (!currentUser && !isLoading && !adminRouteLoadRequested) {
      adminRouteLoadRequested = true
      void loadUser()
    }
  }, [currentUser, isLoading, loadUser])

  if (isLoading || (!currentUser && !adminRouteLoadRequested)) return null
  if (!currentUser) return <Navigate to="/" replace />

  const role = currentUser?.role
  const allowed = adminOnly
    ? role === 'admin'
    : role === 'admin' || role === 'manager'

  return allowed ? children : <Navigate to="/" replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/trade" element={<TradePage />} />
      <Route path="/pairs" element={<ChoosePairPage />} />
      <Route path="/signals" element={<SignalsPage />} />
      <Route path="/history" element={<TransactionHistoryPage />} />
      <Route path="/top" element={<TopTradersPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/deposit" element={<DepositPage />} />
      <Route path="/deposit-details" element={<DepositDetailsPage />} />
      <Route path="/withdraw" element={<WithdrawPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/support" element={<FAQPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      <Route path="/users/:userId" element={<AdminRoute><UserDetailPage /></AdminRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminProfilePage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/users/active" element={<AdminRoute><AdminUsersPage filter="active" /></AdminRoute>} />
      <Route path="/admin/users/inactive" element={<AdminRoute><AdminUsersPage filter="inactive" /></AdminRoute>} />
      <Route path="/admin/users/:userId" element={<AdminRoute><UserDetailPage /></AdminRoute>} />
      <Route path="/admin/top-users" element={<AdminRoute adminOnly><AdminTopTradersPage /></AdminRoute>} />
      <Route path="/admin/requisites" element={<AdminRoute adminOnly><AdminRequisitesPage /></AdminRoute>} />
      <Route path="/admin/links" element={<AdminRoute adminOnly><AdminLinksPage /></AdminRoute>} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
