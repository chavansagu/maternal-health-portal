import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { dashboardAPI } from "../services/api";

const DashboardPMSMAPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dashboardAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <MasterLayout>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <Breadcrumb title="PMSMA Dashboard" />

      <div className="row row-cols-xxxl-4 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-1 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/pmsma-sessions?tab=queue')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    PMSMA Sessions Pending
                  </p>
                  <h6 className="mb-0">{stats?.pending_pmsma_sessions || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-2 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/pmsma-sessions?tab=queue')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    PMSMA Sessions Active Today
                  </p>
                  <h6 className="mb-0">{stats?.active_pmsma_sessions || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-3 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/pmsma-sessions?tab=completed')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    PMSMA Sessions Completed
                  </p>
                  <h6 className="mb-0">{stats?.completed_pmsma_sessions || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-4 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/usg-appointment-management?tab=pending')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    USG Appointments Pending
                  </p>
                  <h6 className="mb-0">{stats?.pending_usg_appointments || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-5 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/usg-appointment-management?tab=all')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    USG Appointments Active
                  </p>
                  <h6 className="mb-0">
                    {(stats?.total_usg_appointments || 0) - (stats?.completed_usg_appointments || 0)}
                  </h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-1 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/usg-appointment-management?tab=rescheduled')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    USG Rescheduled Appointments
                  </p>
                  <h6 className="mb-0">{stats?.rescheduled_usg_appointments || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-1 h-100">
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    High Risk Cases
                  </p>
                  <h6 className="mb-0">{stats?.high_risk_cases || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-2 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=pending')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    Pending Referrals
                  </p>
                  <h6 className="mb-0">{stats?.pending_referrals || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card shadow-none border bg-gradient-start-3 h-100">
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">
                    Total Pregnant Women
                  </p>
                  <h6 className="mb-0">{stats?.total_pregnant_women || 0}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default DashboardPMSMAPage;