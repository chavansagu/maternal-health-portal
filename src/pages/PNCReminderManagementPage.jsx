import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import PNCReminderManagementLayer from '../components/PNCReminderManagementLayer';

const PNCReminderManagementPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="PNC Reminders" />
            <PNCReminderManagementLayer />
        </MasterLayout>
    );
};

export default PNCReminderManagementPage;
