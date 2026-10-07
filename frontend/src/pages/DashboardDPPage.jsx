import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { Icon } from "@iconify/react/dist/iconify.js";
import { deliveryReferralAPI, dashboardAPI } from "../services/api";
import { formatDateTime } from "../utils/dateFormatter";

const DashboardDPPage = () => {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [referralData, statsData] = await Promise.all([
          deliveryReferralAPI.getReferrals(),
          dashboardAPI.getStats(),
        ]);
        setReferrals(Array.isArray(referralData) ? referralData : []);
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const recent = [...referrals].slice(0, 5);

  const getStatusBadge = (status) => {
    const map = {
      pending: "bg-warning-focus text-warning-main",
      accepted: "bg-info-focus text-info-main",
      completed: "bg-success-focus text-success-main",
      re_referred: "bg-danger-focus text-danger-main",
    };
    return (
      <span className={`px-12 py-4 rounded-pill fw-medium text-sm ${map[status] || "bg-neutral-200 text-secondary-light"}`}>
        {status?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    );
  };

  if (loading) {
    return (
      <MasterLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <Breadcrumb title="Delivery Point Dashboard" />

      {/* Stats Cards */}
      <div className="row row-cols-xxxl-4 row-cols-lg-4 row-cols-sm-2 row-cols-1 gy-4 mb-24">
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-1 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=pending')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Pending Referrals</p>
                  <h6 className="mb-0">{stats?.pending_referrals || 0}</h6>
                </div>
                <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-warning-focus text-warning-main">
                  <Icon icon="material-symbols:pending-actions" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-2 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=pending')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Total Referrals</p>
                  <h6 className="mb-0">{stats?.total_referrals || 0}</h6>
                </div>
                <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-info-focus text-info-main">
                  <Icon icon="material-symbols:check-circle-outline" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-3 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=completed')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Completed Deliveries</p>
                  <h6 className="mb-0">{stats?.completed_deliveries || 0}</h6>
                </div>
                <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-success-focus text-success-main">
                  <Icon icon="material-symbols:done-all" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-4 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=completed')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Total Outcomes</p>
                  <h6 className="mb-0">{stats?.total_outcomes || 0}</h6>
                </div>
                <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-danger-focus text-danger-main">
                  <Icon icon="material-symbols:child-care" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="card h-100 p-0 radius-12">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <h6 className="fw-semibold mb-0">Recent Referrals</h6>
        </div>
        <div className="card-body p-24">
          <div className="table-responsive scroll-sm">
            <table className="table bordered-table sm-table mb-0">
              <thead>
                <tr>
                  <th>S.L</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Received On</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">No referrals found</td>
                  </tr>
                ) : (
                  recent.map((r, index) => (
                    <tr key={r.id}>
                      <td>{index + 1}</td>
                      <td className="fw-medium">{r.pregnant_woman_name || "N/A"}</td>
                      <td>{r.mobile_number || "N/A"}</td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>{formatDateTime(r.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default DashboardDPPage;
