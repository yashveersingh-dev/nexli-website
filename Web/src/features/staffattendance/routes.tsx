import { Navigate, Route, Routes } from 'react-router-dom';
import { StaffAttendanceHub } from './StaffAttendanceHub';
import { StaffAttendanceManualPage } from './StaffAttendanceManualPage';
import { StaffAttendanceKioskPage } from './StaffAttendanceKioskPage';
import { StaffAttendanceOtpPage } from './StaffAttendanceOtpPage';
import { StaffAttendanceSettingsPage } from './StaffAttendanceSettingsPage';
import './staffattendance.css';

/**
 * Staff Attendance — base `/staff-attendance`. Owner = HR / Reception
 * (`useOwnership('staff_attendance')`); leadership reviews. One data seam
 * (`recordStaffCheckIn`) powers manual marking, the device kiosk, the mobile OTP
 * kiosk, and a future biometric webhook.
 */
export default function StaffAttendanceRoutes() {
  return (
    <Routes>
      <Route index element={<StaffAttendanceHub />} />
      <Route path="manual" element={<StaffAttendanceManualPage />} />
      <Route path="kiosk" element={<StaffAttendanceKioskPage />} />
      <Route path="otp" element={<StaffAttendanceOtpPage />} />
      <Route path="settings" element={<StaffAttendanceSettingsPage />} />
      <Route path="*" element={<Navigate to="/staff-attendance" replace />} />
    </Routes>
  );
}
