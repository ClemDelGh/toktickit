import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './Login';
import ChangePassword from './ChangePassword';
import CreateTicket from './CreateTicket';
import MyTickets from './MyTickets';
import RequesterDashboard from './RequesterDashboard';
import StaffDashboard from './StaffDashboard';
import StaffTicketQueue from './StaffTicketQueue';
import UserManagement from './UserManagement';

type ActiveTab = 'dashboard' | 'create' | 'list' | 'queue' | 'users';

export default function App() {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [queueFilter, setQueueFilter] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" style={{ color: '#006B3C' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  const navButtonClass = (tab: ActiveTab) =>
    `btn btn-sm fw-bold`;
  const navButtonStyle = (tab: ActiveTab): React.CSSProperties => ({
    backgroundColor: activeTab === tab ? '#006B3C' : 'transparent',
    borderColor: '#006B3C',
    border: '1px solid #006B3C',
    color: activeTab === tab ? '#ffffff' : '#004d2a',  // darker green for inactive = better contrast
  });

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== 'list') setStatusFilter('');
    if (tab !== 'queue') setQueueFilter({});
  };

  return (
    <div>
      <nav className="navbar navbar-dark shadow-sm" style={{ backgroundColor: '#006B3C' }}>
        <div className="container-fluid px-4">
          <span className="navbar-brand mb-0 h1 d-flex align-items-center">
            TokTickIT
          </span>
          <div className="d-flex align-items-center text-white">
            <span className="me-4 d-flex flex-column" style={{ fontSize: '0.9rem' }}>
               <span className="fw-bold">{user.name}</span>
               <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Role: {user.role}</span>
            </span>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Role-aware navigation */}
      <div className="bg-light border-bottom py-2">
        <div className="container">
          <div className="btn-group" role="group">
            {/* Dashboard — all roles */}
            <button
              type="button"
              className={navButtonClass('dashboard')}
              style={navButtonStyle('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              onClick={() => handleTabChange('dashboard')}
            >
              Dashboard
            </button>

            {/* Requester-only tabs */}
            {user.role === 'Requester' && (
              <>
                <button
                  type="button"
                  className={navButtonClass('create')}
                  style={navButtonStyle('create')}
                  aria-current={activeTab === 'create' ? 'page' : undefined}
                  onClick={() => handleTabChange('create')}
                >
                  Create Ticket
                </button>
                <button
                  type="button"
                  className={navButtonClass('list')}
                  style={navButtonStyle('list')}
                  aria-current={activeTab === 'list' ? 'page' : undefined}
                  onClick={() => handleTabChange('list')}
                >
                  My Tickets
                </button>
              </>
            )}

            {/* Staff & Admin tabs */}
            {(user.role === 'ITStaff' || user.role === 'Administrator') && (
              <button
                type="button"
                className={navButtonClass('queue')}
                style={navButtonStyle('queue')}
                aria-current={activeTab === 'queue' ? 'page' : undefined}
                onClick={() => handleTabChange('queue')}
              >
                Queue
              </button>
            )}

            {/* Admin-only tab */}
            {user.role === 'Administrator' && (
              <button
                type="button"
                className={navButtonClass('users')}
                style={navButtonStyle('users')}
                aria-current={activeTab === 'users' ? 'page' : undefined}
                onClick={() => handleTabChange('users')}
              >
                Users
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container mt-4 mb-5">
        {/* Requester views */}
        {user.role === 'Requester' && activeTab === 'dashboard' && (
          <RequesterDashboard
            setActiveTab={setActiveTab}
            setStatusFilter={setStatusFilter}
          />
        )}
        {user.role === 'Requester' && activeTab === 'create' && <CreateTicket />}
        {user.role === 'Requester' && activeTab === 'list' && (
          <MyTickets statusFilter={statusFilter} />
        )}

        {/* ITStaff views */}
        {user.role === 'ITStaff' && activeTab === 'dashboard' && (
          <StaffDashboard
            user={user}
            setActiveTab={setActiveTab}
            setQueueFilter={setQueueFilter}
          />
        )}
        {user.role === 'ITStaff' && activeTab === 'queue' && (
          <StaffTicketQueue queueFilter={queueFilter} />
        )}

        {/* Administrator views */}
        {user.role === 'Administrator' && activeTab === 'dashboard' && (
          <StaffDashboard
            user={user}
            setActiveTab={setActiveTab}
            setQueueFilter={setQueueFilter}
          />
        )}
        {user.role === 'Administrator' && activeTab === 'queue' && (
          <StaffTicketQueue queueFilter={queueFilter} />
        )}
        {user.role === 'Administrator' && activeTab === 'users' && <UserManagement />}
      </main>
    </div>
  );
}
