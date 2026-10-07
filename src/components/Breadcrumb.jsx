import React from "react";
import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import { getUserRole } from "../services/auth";

const Breadcrumb = ({ title }) => {
  const getDashboardPath = () => {
    const userRole = getUserRole();
    switch (userRole) {
      case 'district':
        return '/dashboard-district';
      case 'block':
        return '/dashboard-block';
      case 'sub_centre':
        return '/dashboard-sub-centre';
      case 'usg_centre':
        return '/dashboard-usg-centre';
      default:
        return '/dashboard-district'; // fallback
    }
  };

  return (
    <div className='d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24'>
      <h6 className='fw-semibold mb-0'>{title}</h6>
      <ul className='d-flex align-items-center gap-2'>
        <li className='fw-medium'>
          <Link
            to={getDashboardPath()}
            className='d-flex align-items-center gap-1 hover-text-primary'
          >
            <Icon
              icon='solar:home-smile-angle-outline'
              className='icon text-lg'
            />
            Dashboard
          </Link>
        </li>
        <li> - </li>
        <li className='fw-medium'>{title}</li>
      </ul>
    </div>
  );
};

export default Breadcrumb;
