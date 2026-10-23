import { useState, useEffect, useCallback } from 'react';

interface DashboardTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  status: string;
  requestedPriority: string;
  itPriority: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface DashboardAction {
  id: number;
  ticketId: number;
  description: string;
  actionDateTime: string;
  result: string;
}

interface UserCounts {
  active: number;
  inactive: number;
  byRole: {
    Requester: number;
    ITStaff: number;
    Administrator: number;
  };
}

interface StaffDashboardData {
  generatedAt: string;
  unassigned: number;
  myAssigned: number;
  byStatus: Record<string, number>;
  byItPriority: {
    High: number;
    Medium: number;
    Low: number;
  };
  awaitingReview: number;
  myOpenFollowUps: number;
  myRecentTickets: DashboardTicket[];
  urgentTickets: DashboardTicket[];
  myRecentActions: DashboardAction[];
  userCounts?: UserCounts;
}

interface StaffDashboardProps {
  user: { role: string; [key: string]: any };
  setActiveTab: (tab: 'dashboard' | 'create' | 'list' | 'queue' | 'users') => void;
  setQueueFilter: (filter: Record<string, string>) => void;
}

function TicketRow({ ticket }: { ticket: DashboardTicket }) {
  return (
    <tr>
      <td className="fw-bold text-primary">{ticket.ticketNumber}</td>
      <td>{ticket.summary}</td>
      <td>
        <span className="badge bg-secondary">{ticket.status}</span>
      </td>
      <td>
        <span
          className={`badge bg-${
            ticket.itPriority === 'High'
              ? 'danger'
              : ticket.itPriority === 'Medium'
              ? 'warning'
              : 'secondary'
          }`}
        >
          {ticket.itPriority}
        </span>
      </td>
      <td>{new Date(ticket.updatedAt).toLocaleDateString()}</td>
    </tr>
  );
}

function TicketList({
  tickets,
  emptyMessage,
}: {
  tickets: DashboardTicket[];
  emptyMessage: string;
}) {
  if (tickets.length === 0) {
    return <p className="text-muted text-center py-3 mb-0">{emptyMessage}</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th>Ticket #</th>
            <th>Summary</th>
            <th>Status</th>
            <th>IT Priority</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionList({
  actions,
  emptyMessage,
}: {
  actions: DashboardAction[];
  emptyMessage: string;
}) {
  if (actions.length === 0) {
    return <p className="text-muted text-center py-3 mb-0">{emptyMessage}</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th>Ticket ID</th>
            <th>Description</th>
            <th>Result</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.id}>
              <td className="fw-bold text-primary">#{a.ticketId}</td>
              <td className="text-truncate" style={{ maxWidth: '300px' }}>
                {a.description}
              </td>
              <td>
                <span className="badge bg-info text-dark">{a.result}</span>
              </td>
              <td>{new Date(a.actionDateTime).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  New: 'New',
  Open: 'Open',
  InProgress: 'In Progress',
  WaitingForRequester: 'Waiting for Requester',
  Resolved: 'Resolved',
  Closed: 'Closed',
  Reopened: 'Reopened',
  Cancelled: 'Cancelled',
};

export default function StaffDashboard({
  user,
  setActiveTab,
  setQueueFilter,
}: StaffDashboardProps) {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const res = await fetch('/api/dashboard/staff', {
        credentials: 'include',
      });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard');
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError('Unable to load staff dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: '3rem', height: '3rem' }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading staff dashboard...</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning text-center shadow-sm">
          <h4 className="alert-heading">Access denied</h4>
          <p className="mb-0">
            You do not have permission to view the staff dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-5">
        <div className="alert alert-danger d-inline-block">{error}</div>
        <div>
          <button
            className="btn btn-outline-primary mt-2"
            onClick={fetchDashboard}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d = data!;

  const drillDown = (filter: Record<string, string>) => {
    setQueueFilter(filter);
    setActiveTab('queue');
  };

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Staff Dashboard</h4>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchDashboard}
        >
          Refresh
        </button>
      </div>

      {/* Main Workload & Review Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-unassigned"
            onClick={() => drillDown({ owner: 'unassigned' })}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-danger">{d.unassigned}</h2>
              <p className="card-text text-muted mb-0">Unassigned</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-myAssigned"
            onClick={() => drillDown({ owner: 'me' })}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-primary">{d.myAssigned}</h2>
              <p className="card-text text-muted mb-0">My Assigned</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-awaitingReview"
            onClick={() => drillDown({ indicated: 'true' })}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-warning">{d.awaitingReview}</h2>
              <p className="card-text text-muted mb-0">Requester Says Resolved</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-myOpenFollowUps"
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-secondary">{d.myOpenFollowUps}</h2>
              <p className="card-text text-muted mb-0">My Open Follow-Ups</p>
            </div>
          </div>
        </div>

        {/* Admin-only Users Card */}
        {user.role === 'Administrator' && d.userCounts && (
          <div className="col-12 col-md-6">
            <div
              className="card h-100 shadow-sm border-0 bg-light"
              data-testid="card-users"
              onClick={() => setActiveTab('users')}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title fw-bold text-dark mb-1">Users</h5>
                  <span className="badge bg-success me-2">{d.userCounts.active} active</span>
                  <span className="badge bg-secondary">{d.userCounts.inactive} inactive</span>
                </div>
                <div className="text-end text-muted small">
                  <div>Requester: {d.userCounts.byRole.Requester}</div>
                  <div>Staff: {d.userCounts.byRole.ITStaff}</div>
                  <div>Admin: {d.userCounts.byRole.Administrator}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Breakdown */}
      <h6 className="fw-semibold text-muted mb-2">Tickets by Status</h6>
      <div className="row g-2 mb-4">
        {['New', 'Open', 'InProgress', 'WaitingForRequester'].map((st) => (
          <div key={st} className="col-6 col-md-3">
            <div
              className="card text-center h-100 shadow-sm border-0"
              data-testid={`card-status-${st}`}
              onClick={() => drillDown({ status: st })}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body py-2">
                <h4 className="fw-bold mb-0">{d.byStatus[st] ?? 0}</h4>
                <small className="text-muted">{STATUS_LABELS[st] || st}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Priority Breakdown */}
      <h6 className="fw-semibold text-muted mb-2">Active Tickets by IT Priority</h6>
      <div className="row g-2 mb-4">
        {(['High', 'Medium', 'Low'] as const).map((pr) => (
          <div key={pr} className="col-4">
            <div
              className="card text-center h-100 shadow-sm border-0"
              data-testid={`card-priority-${pr}`}
              onClick={() => drillDown({ itPriority: pr })}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body py-2">
                <h4
                  className={`fw-bold mb-0 text-${
                    pr === 'High' ? 'danger' : pr === 'Medium' ? 'warning' : 'secondary'
                  }`}
                >
                  {d.byItPriority[pr] ?? 0}
                </h4>
                <small className="text-muted">{pr}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Lists */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
              My Recent Tickets
            </div>
            <div className="card-body p-0">
              <TicketList
                tickets={d.myRecentTickets}
                emptyMessage="No tickets assigned to you."
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold text-danger bg-danger bg-opacity-10">
              Urgent Tickets
            </div>
            <div className="card-body p-0">
              <TicketList
                tickets={d.urgentTickets}
                emptyMessage="No urgent tickets."
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
              My Recent Actions
            </div>
            <div className="card-body p-0">
              <ActionList
                actions={d.myRecentActions}
                emptyMessage="No recent actions recorded."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
