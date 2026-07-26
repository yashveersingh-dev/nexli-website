import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Tabs } from '@/components/Tabs';
import { StructureTab } from './StructureTab';
import { TimetableTab } from './TimetableTab';
import { SubstitutionsTab } from './SubstitutionsTab';
import '@/features/school/school.css';
import './academics.css';

type TabId = 'structure' | 'timetable' | 'substitutions';

function AcademicsHub() {
  const [tab, setTab] = useState<TabId>('structure');

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Academics</h1>
          <p className="nx-page__sub">Grades, sections, subjects, houses, rooms — plus weekly timetables and substitutions.</p>
        </div>
      </div>

      <Tabs
        variant="line"
        aria-label="Academics sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'structure', label: 'Structure', icon: 'settings' },
          { id: 'timetable', label: 'Timetable', icon: 'calendar' },
          { id: 'substitutions', label: 'Substitutions', icon: 'refresh' },
        ]}
      >
        {(active) => (
          <>
            {active === 'structure' && <StructureTab />}
            {active === 'timetable' && <TimetableTab />}
            {active === 'substitutions' && <SubstitutionsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}

/** Academics module routes (structure + timetable + substitutions). */
export default function AcademicsRoutes() {
  return (
    <Routes>
      <Route index element={<AcademicsHub />} />
      <Route path="*" element={<Navigate to="/academics" replace />} />
    </Routes>
  );
}
