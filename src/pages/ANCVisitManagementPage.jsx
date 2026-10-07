import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import ANCVisitManagementLayer from '../components/ANCVisitManagementLayer';

const ANCVisitManagementPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="ANC Visit Management" />
            <ANCVisitManagementLayer />
        </MasterLayout>
    );
};

export default ANCVisitManagementPage;