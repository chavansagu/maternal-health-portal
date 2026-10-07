import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import USGAppointmentManagementLayer from '../components/USGAppointmentManagementLayer';

const USGAppointmentManagementPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="USG Appointment Management" />
            <USGAppointmentManagementLayer />
        </MasterLayout>
    );
};

export default USGAppointmentManagementPage;