import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import IVRCallLogsLayer from '../components/IVRCallLogsLayer';

const IVRCallLogsPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="IVR Call Logs" />
            <IVRCallLogsLayer />
        </MasterLayout>
    );
};

export default IVRCallLogsPage;
