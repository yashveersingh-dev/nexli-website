import { Navigate, Route, Routes } from 'react-router-dom';
import { SubscriptionsOverviewPage } from './SubscriptionsOverviewPage';
import { SellerSettingsPage } from './SellerSettingsPage';
import '@/features/platform/platform.css';
import './subscriptions.css';

/** Subscriptions overview route subtree (mounted at /subscriptions/* for platform). */
export default function SubscriptionsRoutes() {
  return (
    <Routes>
      <Route index element={<SubscriptionsOverviewPage />} />
      <Route path="seller" element={<SellerSettingsPage />} />
      <Route path="*" element={<Navigate to="/subscriptions" replace />} />
    </Routes>
  );
}
