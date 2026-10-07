import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { dashboardAPI } from "../services/api";
import { Icon } from '@iconify/react';
import ReactApexChart from 'react-apexcharts';

const DashboardBlockPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [wardComparison, setWardComparison] = useState(null);
  const [subcentrePerformance, setSubcentrePerformance] = useState(null);
  const [usgStatus, setUSGStatus] = useState(null);
  const [monthlyRegistrations, setMonthlyRegistrations] = useState(null);
  const [highRiskTimeline, setHighRiskTimeline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, wardData, subcentreData, usgData, monthlyData, riskData] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getBlockWardComparison(),
          dashboardAPI.getBlockSubcentrePerformance(),
          dashboardAPI.getBlockUSGStatusBreakdown(),
          dashboardAPI.getBlockMonthlyRegistrations(),
          dashboardAPI.getBlockHighRiskTimeline()
        ]);
        
        setStats(statsData);
        setWardComparison(wardData);
        setSubcentrePerformance(subcentreData);
        setUSGStatus(usgData);
        setMonthlyRegistrations(monthlyData);
        setHighRiskTimeline(riskData);


      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const wardComparisonChart = wardComparison ? {
    series: wardComparison.datasets.map(ds => ({ name: ds.label, data: ds.data })),
    options: {
      chart: { type: 'bar', height: 300, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      xaxis: { categories: wardComparison.labels },
      colors: ['#487FFF', '#DC143C'],
      legend: { position: 'top' },
      dataLabels: { enabled: false }
    }
  } : null;

  const subcentreChart = subcentrePerformance ? {
    series: subcentrePerformance.datasets.map(ds => ({ name: ds.label, data: ds.data })),
    options: {
      chart: { type: 'bar', height: 300, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      xaxis: { categories: subcentrePerformance.labels },
      colors: ['#487FFF', '#28a745'],
      legend: { position: 'top' },
      dataLabels: { enabled: false }
    }
  } : null;

  const usgStatusChart = usgStatus ? {
    series: usgStatus.data,
    options: {
      chart: { type: 'donut', height: 300 },
      labels: usgStatus.labels,
      colors: ['#FFA500', '#28a745', '#dc3545', '#17a2b8'],
      legend: { position: 'bottom' },
      dataLabels: { enabled: true }
    }
  } : null;

  const monthlyChart = monthlyRegistrations ? {
    series: [{ name: 'Registrations', data: monthlyRegistrations.data }],
    options: {
      chart: { type: 'line', height: 300, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 3, colors: ['#487FFF'] },
      xaxis: { categories: monthlyRegistrations.labels },
      markers: { size: 4 },
      dataLabels: { enabled: false }
    }
  } : null;

  const riskTimelineChart = highRiskTimeline ? {
    series: highRiskTimeline.datasets.map(ds => ({ name: ds.label, data: ds.data })),
    options: {
      chart: { type: 'area', height: 300, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: highRiskTimeline.labels },
      colors: ['#487FFF', '#DC143C'],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
      legend: { position: 'top' },
      dataLabels: { enabled: false }
    }
  } : null;

  if (loading) {
    return (
      <MasterLayout>
        <div className="d-flex justify-content-center align-items-center" style={{minHeight: '400px'}}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <Breadcrumb title="Block Dashboard" />
      
      <div className="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-1 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/pregnant-women-management?tab=all')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Total Pregnant Women</p>
                  <h6 className="mb-0">{stats?.total_pregnant_women || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="gridicons:multiple-users" className="text-white text-2xl mb-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-2 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/pregnant-women-management?tab=high_risk')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">High Risk Cases</p>
                  <h6 className="mb-0">{stats?.high_risk_cases || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-red rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:warning" className="text-white text-2xl mb-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col">
          <div className="card shadow-none border h-100" role="button" style={{background: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)', cursor: 'pointer'}} onClick={() => navigate('/pregnant-women-management?tab=high_risk')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Active High Risk</p>
                  <h6 className="mb-0">{stats?.active_high_risk_cases || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-danger rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:personal-injury" className="text-white text-2xl mb-0" />
                </div>
              </div>

            </div>
          </div>
        </div>
        
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-3 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/usg-appointment-management?tab=pending')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Pending USG</p>
                  <h6 className="mb-0">{stats?.pending_usg_appointments || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:calendar-month" className="text-white text-2xl mb-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-4 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/pregnant-women-management?tab=all')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Active Cases</p>
                  <h6 className="mb-0">{stats?.active_pregnant_women || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:favorite" className="text-white text-2xl mb-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-none border h-100" role="button" style={{background: 'linear-gradient(135deg, #fff0f0 0%, #ffd6d6 100%)', cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=completed')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Maternal Deaths</p>
                  <h6 className="mb-0">{stats?.maternal_deaths || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-danger rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:emergency" className="text-white text-2xl mb-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-none border h-100" role="button" style={{background: 'linear-gradient(135deg, #fff0f0 0%, #ffd6d6 100%)', cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=completed')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Infant Deaths</p>
                  <h6 className="mb-0">{stats?.infant_deaths || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-danger rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:child-care" className="text-white text-2xl mb-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      {/* Delivery Stats Row */}
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <h6 className="text-lg fw-semibold mb-0">Delivery Statistics</h6>
        {/* <span className="px-12 py-4 rounded-pill fw-medium text-sm bg-primary-100 text-primary-600">Live</span> */}
      </div>
      <div className="row row-cols-xxxl-4 row-cols-lg-4 row-cols-sm-2 row-cols-1 gy-4 mt-1">
        <div className="col">
          <div className="card shadow-none border bg-gradient-start-1 h-100" role="button" style={{cursor: 'pointer'}} onClick={() => navigate('/delivery-referral-management?tab=pending')}>
            <div className="card-body p-20">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="fw-medium text-primary-light mb-1">Total Referrals</p>
                  <h6 className="mb-0">{stats?.total_referrals || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:local-shipping" className="text-white text-2xl mb-0" />
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
                  <p className="fw-medium text-primary-light mb-1">Pending Referrals</p>
                  <h6 className="mb-0">{stats?.pending_referrals || 0}</h6>
                </div>
                <div className="w-50-px h-50-px bg-red rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:pending-actions" className="text-white text-2xl mb-0" />
                </div>
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
                <div className="w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:done-all" className="text-white text-2xl mb-0" />
                </div>
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
                <div className="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                  <Icon icon="material-symbols:child-care" className="text-white text-2xl mb-0" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <section className="row gy-4 mt-1">
        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="text-lg fw-semibold mb-0">Ward-wise Distribution</h6>
            </div>
            <div className="card-body p-24">
              {wardComparisonChart ? (
                <ReactApexChart {...wardComparisonChart} type="bar" height={300} />
              ) : (
                <div className="text-center py-5">No data available</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="text-lg fw-semibold mb-0">USG Status Breakdown</h6>
            </div>
            <div className="card-body p-24">
              {usgStatusChart ? (
                <ReactApexChart {...usgStatusChart} type="donut" height={300} />
              ) : (
                <div className="text-center py-5">No data available</div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      <section className="row gy-4 mt-1">
        <div className="col-12">
          <div className="card">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="text-lg fw-semibold mb-0">Monthly Registrations</h6>
            </div>
            <div className="card-body p-24">
              {monthlyChart ? (
                <ReactApexChart {...monthlyChart} type="line" height={300} />
              ) : (
                <div className="text-center py-5">No data available</div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      <section className="row gy-4 mt-1">
        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="text-lg fw-semibold mb-0">Sub-centre Performance</h6>
            </div>
            <div className="card-body p-24">
              {subcentreChart ? (
                <ReactApexChart {...subcentreChart} type="bar" height={300} />
              ) : (
                <div className="text-center py-5">No data available</div>
              )}
            </div>
          </div>
        </div>
        
      </section>
      
      <section className="row gy-4 mt-1">
        <div className="col-12">
          <div className="card">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="text-lg fw-semibold mb-0">High-Risk Timeline (Last 6 Months)</h6>
            </div>
            <div className="card-body p-24">
              {riskTimelineChart ? (
                <ReactApexChart {...riskTimelineChart} type="area" height={300} />
              ) : (
                <div className="text-center py-5">No data available</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </MasterLayout>
  );
};

export default DashboardBlockPage;
