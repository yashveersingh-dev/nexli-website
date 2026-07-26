import { Navigate, Route, Routes } from 'react-router-dom';
import { PortfolioHub } from './PortfolioHub';

/**
 * Digital Skills Passport / e-Portfolio — a cumulative, verifiable achievement
 * portfolio. One hub branches on role via `useSession`/`useStudentContext`:
 * students see/edit their own portfolio (own-record scope); verifier staff get
 * the verification queue. Mount at `/portfolio`.
 */
export default function PortfolioRoutes() {
  return (
    <Routes>
      <Route index element={<PortfolioHub />} />
      <Route path="*" element={<Navigate to="/portfolio" replace />} />
    </Routes>
  );
}
