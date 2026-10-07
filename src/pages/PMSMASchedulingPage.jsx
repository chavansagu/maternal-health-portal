import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import PMSMASchedulingLayer from '../components/PMSMASchedulingLayer';

const PMSMASchedulingPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="PMSMA Scheduling" />
            <PMSMASchedulingLayer />
        </MasterLayout>
    );
};

export default PMSMASchedulingPage;