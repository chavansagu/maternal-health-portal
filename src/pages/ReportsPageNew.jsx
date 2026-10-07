import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import ReportsLayerNew from '../components/ReportsLayerNew';

const ReportsPageNew = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Reports & Analytics" />
      <ReportsLayerNew />
    </MasterLayout>
  );
};

export default ReportsPageNew;
