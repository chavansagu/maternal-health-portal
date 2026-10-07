import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import AIReportsLayer from '../components/AIReportsLayer';

const AIReportsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="AI Reports" />
      <AIReportsLayer />
    </MasterLayout>
  );
};

export default AIReportsPage;
