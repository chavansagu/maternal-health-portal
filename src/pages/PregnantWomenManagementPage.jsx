import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import PregnantWomenManagementLayer from '../components/PregnantWomenManagementLayer';

const PregnantWomenManagementPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Pregnant Women Management" />
            <PregnantWomenManagementLayer />
        </MasterLayout>
    );
};

export default PregnantWomenManagementPage;