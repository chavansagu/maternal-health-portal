import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import NotificationLayer from '../components/NotificationLayer';

const NotificationPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Notifications" />
            <NotificationLayer />
        </MasterLayout>
    );
};

export default NotificationPage;
