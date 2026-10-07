import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import ThemeToggleButton from "../helper/ThemeToggleButton";
import { logout, getUsername, getUserRole } from "../services/auth";
import { pregnantWomenAPI, notificationAPI } from "../services/api";
import NotificationPanel from "../components/NotificationPanel";

const MasterLayout = ({ children }) => {
  let [sidebarActive, seSidebarActive] = useState(false);
  let [mobileMenu, setMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const username = getUsername();
  const userRole = getUserRole();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationAPI.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    const handleDropdownClick = (event) => {
      event.preventDefault();
      const clickedLink = event.currentTarget;
      const clickedDropdown = clickedLink.closest(".dropdown");

      if (!clickedDropdown) return;

      const isActive = clickedDropdown.classList.contains("open");

      // Close all dropdowns
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
        const submenu = dropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = "0px"; // Collapse submenu
        }
      });

      // Toggle the clicked dropdown
      if (!isActive) {
        clickedDropdown.classList.add("open");
        const submenu = clickedDropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = `${submenu.scrollHeight}px`; // Expand submenu
        }
      }
    };

    // Attach click event listeners to all dropdown triggers
    const dropdownTriggers = document.querySelectorAll(
      ".sidebar-menu .dropdown > a, .sidebar-menu .dropdown > Link"
    );

    dropdownTriggers.forEach((trigger) => {
      trigger.addEventListener("click", handleDropdownClick);
    });

    const openActiveDropdown = () => {
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        const submenuLinks = dropdown.querySelectorAll(".sidebar-submenu li a");
        submenuLinks.forEach((link) => {
          if (
            link.getAttribute("href") === location.pathname ||
            link.getAttribute("to") === location.pathname
          ) {
            dropdown.classList.add("open");
            const submenu = dropdown.querySelector(".sidebar-submenu");
            if (submenu) {
              submenu.style.maxHeight = `${submenu.scrollHeight}px`; // Expand submenu
            }
          }
        });
      });
    };

    // Open the submenu that contains the active route
    openActiveDropdown();

    // Cleanup event listeners on unmount
    return () => {
      dropdownTriggers.forEach((trigger) => {
        trigger.removeEventListener("click", handleDropdownClick);
      });
    };
  }, [location.pathname]);

  let sidebarControl = () => {
    seSidebarActive(!sidebarActive);
  };

  let mobileMenuControl = () => {
    setMobileMenu(!mobileMenu);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      let results = [];
      
      // Check if query is a mobile number (contains only digits)
      const isMobileNumber = /^\d+$/.test(query.trim());
      
      if (isMobileNumber) {
        // Search by mobile number
        try {
          const mobileResults = await pregnantWomenAPI.searchByMobile(query);
          results = Array.isArray(mobileResults) ? mobileResults : [mobileResults];
        } catch (error) {
          console.log('Mobile search failed, trying general search');
        }
      }
      
      // If no results from mobile search or query is not a mobile number, search by name
      if (results.length === 0) {
        try {
          const allWomen = await pregnantWomenAPI.getPregnantWomen(0, 100);
          const womenArray = Array.isArray(allWomen) ? allWomen : [];
          results = womenArray.filter(woman => 
            woman.full_name?.toLowerCase().includes(query.toLowerCase()) ||
            woman.mobile_number?.includes(query)
          );
        } catch (error) {
          console.error('General search failed:', error);
        }
      }
      
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(true);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length >= 3) {
      handleSearch(value);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const selectSearchResult = (woman) => {
    setSearchTerm('');
    setShowSearchResults(false);
    navigate('/pregnant-women-management', { state: { searchResult: woman } });
  };

  return (
    <section className={mobileMenu ? "overlay active" : "overlay "}>
      {/* sidebar */}
      <aside
        className={
          sidebarActive
            ? "sidebar active "
            : mobileMenu
            ? "sidebar sidebar-open"
            : "sidebar"
        }
      >
        <button
          onClick={mobileMenuControl}
          type='button'
          className='sidebar-close-btn'
        >
          <Icon icon='radix-icons:cross-2' />
        </button>
        <div>
          <Link to={`/dashboard-${userRole.replace('_', '-')}`} className='sidebar-logo'>
            <img
              src='assets/images/logo.png'
              alt='site logo'
              className='light-logo'
            />
            <img
              src='assets/images/logo-light.png'
              alt='site logo'
              className='dark-logo'
            />
            <img
              src='assets/images/logo-icon.png'
              alt='site logo'
              className='logo-icon'
            />
          </Link>
        </div>
        <div className='sidebar-menu-area'>
          <ul className='sidebar-menu' id='sidebar-menu'>
            <li>
              <NavLink
                to={`/dashboard-${userRole.replace('_', '-')}`}
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon
                  icon='solar:home-smile-angle-outline'
                  className='menu-icon'
                />
                <span>Dashboard</span>
              </NavLink>
            </li>

            {/* Users Menu - Only for district and block roles */}
            {(userRole === 'district' || userRole === 'block') && (
              <li>
                <NavLink
                  to='/users-list'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='flowbite:users-group-outline'
                    className='menu-icon'
                  />
                  <span>Users</span>
                </NavLink>
              </li>
            )}

            {/* Administrative Management Menu - Only for district and block users */}
            {(userRole === 'district' || userRole === 'block') && (
              <li>
                <NavLink
                  to='/administrative-management'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:admin-panel-settings-outline'
                    className='menu-icon'
                  />
                  <span>Administrative</span>
                </NavLink>
              </li>
            )}

            {/* Pregnant Women Management Menu - district, block, sub_centre only.
                pmsma and usg_centre must NOT see the full Beneficiaries list. */}
            {(userRole === 'district' || userRole === 'block' || userRole === 'sub_centre') && (
              <li>
                <NavLink
                  to='/pregnant-women-management'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:pregnant-woman'
                    className='menu-icon'
                  />
                  <span>Beneficiaries</span>
                </NavLink>
              </li>
            )}

            {/* USG Appointment Management Menu - district, block, usg_centre, pmsma */}
            {(userRole === 'district' || userRole === 'block' || userRole === 'usg_centre' || userRole === 'pmsma') && (
              <li>
                <NavLink
                  to='/usg-appointment-management'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:calendar-month'
                    className='menu-icon'
                  />
                  <span>USG Appointment</span>
                </NavLink>
              </li>
            )}

            {/* ANC Visit Management Menu (Sub-Centre / ANM Visit) - district, block, sub_centre */}
            {(userRole === 'district' || userRole === 'block' || userRole === 'sub_centre') && (
              <li>
                <NavLink
                  to='/anc-visit-management'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:medical-services-outline'
                    className='menu-icon'
                  />
                  <span>ANC Visit</span>
                </NavLink>
              </li>
            )}

            {/* PMSMA Scheduling Menu - sub_centre only */}
            {userRole === 'sub_centre' && (
              <li>
                <NavLink
                  to='/pmsma-scheduling'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:event-note-outline'
                    className='menu-icon'
                  />
                  <span>PMSMA Scheduling</span>
                </NavLink>
              </li>
            )}

            {/* PMSMA Sessions Menu - pmsma (full access), district (read-only overview) */}
            {(userRole === 'pmsma' || userRole === 'district') && (
              <li>
                <NavLink
                  to='/pmsma-sessions'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:event-note-outline'
                    className='menu-icon'
                  />
                  <span>PMSMA Sessions</span>
                </NavLink>
              </li>
            )}

            {/* Delivery Referral Menu - sub_centre, dp, block, district, pmsma */}
            {(userRole === 'sub_centre' || userRole === 'dp' || userRole === 'block' || userRole === 'district' || userRole === 'pmsma') && (
              <li>
                <NavLink
                  to='/delivery-referral-management'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:local-shipping'
                    className='menu-icon'
                  />
                  <span>Delivery Referral</span>
                </NavLink>
              </li>
            )}

            {/* Mobilisation Menu - sub_centre, block, district */}
            {(userRole === 'sub_centre' || userRole === 'block' || userRole === 'district') && (
              <li>
                <NavLink
                  to='/mobilisation-management'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='mdi:bullhorn-outline'
                    className='menu-icon'
                  />
                  <span>Mobilisation</span>
                </NavLink>
              </li>
            )}

            {/* PNC Reminders Menu - sub_centre, block, district */}
            {(userRole === 'sub_centre' || userRole === 'block' || userRole === 'district') && (
              <li>
                <NavLink
                  to='/pnc-reminders'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='mdi:calendar-heart-outline'
                    className='menu-icon'
                  />
                  <span>PNC Reminders</span>
                </NavLink>
              </li>
            )}

            {/* Reports Menu - Available to all users */}
            <li>
              <NavLink
                to='/reports'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon
                  icon='solar:chart-outline'
                  className='menu-icon'
                />
                <span>Reports</span>
              </NavLink>
            </li>


            {/* Audit Logs Menu - Only for district and block users */}
            {(userRole === 'district' || userRole === 'block') && (
              <li>
                <NavLink
                  to='/audit-logs'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:history'
                    className='menu-icon'
                  />
                  <span>Audit Logs</span>
                </NavLink>
              </li>
            )}

            {/* IVR Call Logs - Only for district and block users */}
            {(userRole === 'district' || userRole === 'block') && (
              <li>
                <NavLink
                  to='/ivr-call-logs'
                  className={(navData) => (navData.isActive ? "active-page" : "")}
                >
                  <Icon
                    icon='material-symbols:call-outline'
                    className='menu-icon'
                  />
                  <span>IVR Call Logs</span>
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </aside>

      <main
        className={sidebarActive ? "dashboard-main active" : "dashboard-main"}
      >
        <div className='navbar-header'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-4'>
                <button
                  type='button'
                  className='sidebar-toggle'
                  onClick={sidebarControl}
                >
                  {sidebarActive ? (
                    <Icon
                      icon='iconoir:arrow-right'
                      className='icon text-2xl non-active'
                    />
                  ) : (
                    <Icon
                      icon='heroicons:bars-3-solid'
                      className='icon text-2xl non-active '
                    />
                  )}
                </button>
                <button
                  onClick={mobileMenuControl}
                  type='button'
                  className='sidebar-mobile-toggle'
                >
                  <Icon icon='heroicons:bars-3-solid' className='icon' />
                </button>
                
                {/* <form className='navbar-search position-relative' onSubmit={handleSearchSubmit}>
                  <input 
                    type='text' 
                    name='search' 
                    placeholder='Search beneficiaries by name or mobile number...'
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    autoComplete='off'
                  />
                  <Icon icon='ion:search-outline' className='icon' />
                  {showSearchResults && (
                    <div className='position-absolute w-100 bg-white border rounded shadow-sm mt-1' style={{zIndex: 1050, top: '100%', maxHeight: '300px', overflowY: 'auto'}}>
                      {searchResults.length > 0 ? (
                        searchResults.map((woman, index) => (
                          <div
                            key={woman.id || index}
                            className='p-3 border-bottom cursor-pointer hover-bg-light'
                            onClick={() => selectSearchResult(woman)}
                            style={{cursor: 'pointer'}}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            <div className='d-flex justify-content-between align-items-center'>
                              <div>
                                <div className='fw-medium text-dark'>{woman.full_name}</div>
                                <div className='text-sm text-secondary'>{woman.mobile_number}</div>
                                <div className='text-xs text-muted'>RCH: {woman.rch_id || 'N/A'}</div>
                              </div>
                              <div className='text-end'>
                                <div className='text-xs text-muted'>Age: {woman.age}</div>
                                <div className='text-xs text-muted'>Husband: {woman.husband_name}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className='p-3 text-center text-muted'>
                          <small>No results found</small>
                        </div>
                      )}
                    </div>
                  )}
                </form> */}
              </div>
            </div>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-3'>
                {/* Logo */}
                <div className='navbar-logo'>
                  <img
                    src='assets/images/Group.png'
                    alt='Logo'
                    style={{ height: '45px', width: 'auto' }}
                  />
                </div>
                {/* Notification Bell */}
                <button
                  className='has-indicator w-40-px h-40-px bg-neutral-200 radius-12 d-flex justify-content-center align-items-center position-relative border-0'
                  type='button'
                  onClick={() => setShowNotifications(true)}
                >
                  <Icon icon='solar:bell-outline' className='text-primary-light text-2xl' />
                  {unreadCount > 0 && (
                    <span className='position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger' style={{ fontSize: '10px' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {/* ThemeToggleButton */}
                <ThemeToggleButton />
                {/* Profile dropdown start */}
                <div className='dropdown'>
                  <button
                    className='has-indicator w-40-px h-40-px bg-neutral-2000 radius-12 d-flex justify-content-center align-items-center position-relative'
                    type='button'
                    data-bs-toggle='dropdown'
                    aria-expanded='false'
                  >
                    <Icon
                      icon='iconoir:user-circle'
                      className='text-primary-light text-2xl'
                    />
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-sm'>
                    <div className='py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <div>
                        <h6 className='text-lg text-primary-light fw-semibold mb-2'>
                          {username || 'User'}
                        </h6>
                        <span className='text-secondary-light fw-medium text-sm'>
                          {userRole || 'N/A'}
                        </span>
                      </div>
                      <button type='button' className='hover-text-danger'>
                        <Icon
                          icon='radix-icons:cross-1'
                          className='icon text-xl'
                        />
                      </button>
                    </div>
                    <ul className='to-top-list'>
                      <li>
                        <Link
                          to='/change-password'
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'
                        >
                          <Icon icon='solar:lock-password-outline' className='icon text-xl' />{" "}
                          Change Password
                        </Link>
                      </li>
                      <li>
                        <button
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-danger d-flex align-items-center gap-3 border-0 bg-transparent w-100 text-start'
                          onClick={logout}
                        >
                          <Icon icon='lucide:power' className='icon text-xl' />{" "}
                          Log Out
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                {/* Profile dropdown end */}
              </div>
            </div>
          </div>
        </div>

        {/* dashboard-main-body */}
        <div className='dashboard-main-body'>{children}</div>

        {/* Notification Panel */}
        <NotificationPanel 
          isOpen={showNotifications} 
          onClose={() => {
            setShowNotifications(false);
            fetchUnreadCount();
          }} 
        />

        {/* Footer section */}
        <footer className='d-footer'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <p className='mb-0'>© 2026 Govt of Odisha Department of Health and Family Welfare. All Rights Reserved.</p>
            </div>
            <div className='col-auto'>
              <p className='mb-0'>
                Version <span className='text-primary-600'>{process.env.REACT_APP_VERSION || '2.0.0'}</span>
              </p>
            </div>
          </div>
        </footer>
      </main>
    </section>
  );
};

export default MasterLayout;