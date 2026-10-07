import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import GrievanceManagementLayer from "../components/GrievanceManagementLayer";

const GrievanceManagementPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Grievance Management" />
      <GrievanceManagementLayer />
    </MasterLayout>
  );
};

export default GrievanceManagementPage;