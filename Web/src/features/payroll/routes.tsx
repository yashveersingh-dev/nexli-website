import { Navigate, Route, Routes } from 'react-router-dom';
import { PayrollHub } from './PayrollHub';
import { SalaryStructureFormPage } from './SalaryStructureFormPage';
import { RunDetailPage } from './RunDetailPage';
import { PayslipPage } from './PayslipPage';
import '@/features/finance/finance.css';
import './payroll.css';

/** Staff/HR payroll: hub (structures/runs) + dedicated structure form, run detail, payslip. */
export default function PayrollRoutes() {
  return (
    <Routes>
      <Route index element={<PayrollHub />} />
      <Route path="structure/:staffId" element={<SalaryStructureFormPage />} />
      <Route path="runs/:runId" element={<RunDetailPage />} />
      <Route path="payslip/:runId/:staffId" element={<PayslipPage />} />
      <Route path="*" element={<Navigate to="/payroll" replace />} />
    </Routes>
  );
}
