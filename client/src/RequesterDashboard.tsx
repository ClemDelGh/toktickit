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

interface DashboardData {
  open: number;
  waitingForYou: number;
  resolved: number;
  closed: number;
  recentTickets: DashboardTicket[];
  attentionTickets: DashboardTicket[];
  recentlyResolved: DashboardTicket[];
}

interface RequesterDashboardProps {
  setActiveTab: (tab: 'dashboard' | 'create' | 'list' | 'queue' | 'users') => void;
  setStatusFilter: (filter: string) => void;
}

const OPEN_FILTER = 'New,Open,InProgress,WaitingForRequester,Reopened';

function TicketRow({ ticket }: { ticket: DashboardTicket }) {
  return (
    <tr>
      <td className="fw-bold text-success">{ticket.ticketNumber}</td>
      <td>{ticket.summary}</td>
      <td>
        <span className="badge bg-secondary">{ticket.status}</span>
      </td>
      <td>
        <span
          className={`badge bg-${
            ticket.requestedPriority === 'High'
              ? 'danger'
              : ticket.requestedPriority === 'Medium'
              ? 'warning'
              : 'secondary'
          }`}
        >
          {ticket.requestedPriority}
        </span>
      </td>
      <td>{new Date(ticket.updatedAt).toLocaleDateString()}</td>
    </tr>
  );
}

function TicketList({ tickets, emptyMessage }: { tickets: DashboardTicket[]; emptyMessage: string }) {
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
            <th>Priority</th>
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

export default function RequesterDashboard({ setActiveTab, setStatusFilter }: RequesterDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/requester', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Unable to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const drillDown = (statusFilter: string) => {
    setStatusFilter(statusFilter);
    setActiveTab('list');
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-5">
        <div className="alert alert-danger d-inline-block">{error}</div>
        <div>
          <button className="btn btn-outline-success mt-2" onClick={fetchDashboard}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">My Dashboard</h4>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchDashboard}>
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-open"
            onClick={() => drillDown(OPEN_FILTER)}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-success">{d.open}</h2>
              <p className="card-text text-muted mb-0">Open</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-waitingForYou"
            onClick={() => drillDown('WaitingForRequester')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-warning">{d.waitingForYou}</h2>
              <p className="card-text text-muted mb-0">Waiting for You</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-resolved"
            onClick={() => drillDown('Resolved')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-info">{d.resolved}</h2>
              <p className="card-text text-muted mb-0">Resolved</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card text-center h-100 shadow-sm border-0 bg-light"
            data-testid="card-closed"
            onClick={() => drillDown('Closed')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h2 className="display-5 fw-bold text-secondary">{d.closed}</h2>
              <p className="card-text text-muted mb-0">Closed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card shadow-sm mb-4">
        <div className="card-header fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
          Quick Actions
        </div>
        <div className="card-body d-flex gap-2">
          <button className="btn btn-success" onClick={() => setActiveTab('create')}>
            Create Ticket
          </button>
          <button className="btn btn-outline-success" onClick={() => setActiveTab('list')}>
            My Tickets
          </button>
        </div>
      </div>

      {/* Ticket Lists */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
              My Recent Tickets
            </div>
            <div className="card-body p-0">
              <TicketList tickets={d.recentTickets} emptyMessage="No tickets yet." />
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold text-warning bg-warning bg-opacity-10">
              Needs Your Attention
            </div>
            <div className="card-body p-0">
              <TicketList tickets={d.attentionTickets} emptyMessage="No tickets waiting for your attention." />
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold text-success" style={{ backgroundColor: '#f8f9fa' }}>
              Recently Resolved
            </div>
            <div className="card-body p-0">
              <TicketList tickets={d.recentlyResolved} emptyMessage="No recently resolved tickets." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
