import React, { useState } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import ReportsLayer from '../components/ReportsLayer';
import ReportsLayerNew from '../components/ReportsLayerNew';
import { Icon } from '@iconify/react';

const ReportsPage = () => {
  const [viewMode, setViewMode] = useState('legacy');

  return (
    <MasterLayout>
      <Breadcrumb title="Reports & Analytics" />
      <div className="mb-3">
        <div className="btn-group" role="group">
          <button 
            className={`btn btn-sm d-flex align-items-center gap-2 ${viewMode === 'legacy' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('legacy')}
          >
            <Icon icon="mdi:file-document" />
            Legacy Reports
          </button>
          <button 
            className={`btn btn-sm d-flex align-items-center gap-2 ${viewMode === 'new' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('new')}
          >
            <Icon icon="mdi:chart-box" />
            New Reports
          </button>
        </div>
      </div>
      {viewMode === 'legacy' ? <ReportsLayer /> : <ReportsLayerNew />}
    </MasterLayout>
  );
};

export default ReportsPage;