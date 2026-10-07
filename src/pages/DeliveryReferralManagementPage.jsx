import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import DeliveryReferralManagementLayer from '../components/DeliveryReferralManagementLayer';

const DeliveryReferralManagementPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Delivery Referral Management" />
            <DeliveryReferralManagementLayer />
        </MasterLayout>
    );
};

export default DeliveryReferralManagementPage;
