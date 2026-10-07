import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import AdministrativeManagementLayer from '../components/AdministrativeManagementLayer';

const AdministrativeManagementPage = () => {
    // return (
    //     <AdministrativeManagementLayer />
    // );
    return (
        <>
    
          {/* MasterLayout */}
          <MasterLayout>
    
            {/* Breadcrumb */}
            <Breadcrumb title="Administrative Management" />
    
            {/* AdministrativeManagementLayer */}
            <AdministrativeManagementLayer />
    
          </MasterLayout>
    
        </>
      );
};

export default AdministrativeManagementPage;
