import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import PMSMASessionManagementLayer from '../components/PMSMASessionManagementLayer';

const PMSMASessionManagementPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="PMSMA Sessions" />
            <PMSMASessionManagementLayer />
        </MasterLayout>
    );
};

export default PMSMASessionManagementPage;
