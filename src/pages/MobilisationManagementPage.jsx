import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import MobilisationManagementLayer from '../components/MobilisationManagementLayer';

const MobilisationManagementPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Mobilisation" />
            <MobilisationManagementLayer />
        </MasterLayout>
    );
};

export default MobilisationManagementPage;
