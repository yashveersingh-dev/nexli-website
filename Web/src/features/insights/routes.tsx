import { Navigate, Route, Routes } from 'react-router-dom';
import { InsightsHub } from './InsightsHub';
import '@/features/analytics/analytics.css';
import './insights.css';

/**
 * AI Insights hub: smart briefing + predictions + assistants. Nav-gated by the
 * `ai` feature flag (the integrator wires staff navId `insights` → `/insights`).
 * Every surface is built fully and shown beneath <AILockedOverlay> (provider-less).
 */
export default function InsightsRoutes() {
  return (
    <Routes>
      <Route index element={<InsightsHub />} />
      <Route path="*" element={<Navigate to="/insights" replace />} />
    </Routes>
  );
}
