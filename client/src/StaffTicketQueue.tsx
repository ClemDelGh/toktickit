import { useState, useEffect } from 'react';
import StaffTicketDetail from './StaffTicketDetail'; // <-- IMPORT AJOUTÉ

interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: string;
  status: string;
  createdAt: string;
  category: { name: string };
  requester: { name: string };
  ticketOwner: { name: string } | null;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function StaffTicketQueue() {
  // <-- NOUVEL ÉTAT POUR MÉMORISER LE TICKET SÉLECTIONNÉ
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  
  // États de l'interface
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // États des filtres et pagination
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fonction pour récupérer les données avec tous les filtres
  const fetchTickets = () => {
    setLoading(true);
    
    // Construction de l'URL avec les paramètres
    const params = new URLSearchParams({
      page: String(page),
      limit: '10',
      sortField,
      sortOrder
    });
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);

    fetch(`/api/staff/tickets?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch queue');
        return res.json();
      })
      .then(data => {
        setTickets(data.data);
        setMeta(data.meta);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load the ticket queue.');
        setLoading(false);
      });
  };

  useEffect(() => {
    // Si on est sur la file d'attente (pas de ticket sélectionné), on charge les données
    if (!selectedTicketId) {
      fetchTickets();
    }
  }, [search, status, priority, page, sortField, sortOrder, selectedTicketId]);

  // Gérer le changement de tri
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setPage(1);
  };

  if (error) return <div className="alert alert-danger mt-4">{error}</div>;

  // <-- SI UN TICKET EST SÉLECTIONNÉ, ON AFFICHE LE DÉTAIL AU LIEU DE LA FILE D'ATTENTE
  if (selectedTicketId) {
    return <StaffTicketDetail ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />;
  }

  return (
    <div className="card shadow-sm mt-4 mb-5">
      <div className="card-header text-white d-flex justify-content-between align-items-center" style={{ backgroundColor: '#004B87' }}>
        <h5 className="mb-0">IT Staff Ticket Queue</h5>
      </div>
      
      <div className="card-body bg-light">
        {/* --- BARRE DE FILTRES --- */}
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by ticket # or summary..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="WaitingForRequester">Waiting For Requester</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}>
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="col-md-2 d-flex">
            <button className="btn btn-outline-secondary w-100" onClick={resetFilters}>Reset</button>
          </div>
        </div>

        {/* --- CONTENU --- */}
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p className="fs-5">No tickets found matching your criteria.</p>
          </div>
        ) : (
          <>
            {/* VUE MOBILE (Cartes) - Cachée sur Desktop */}
            <div className="d-block d-md-none">
              {tickets.map(t => (
                <div key={t.id} className="card mb-2 border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-bold text-primary">{t.ticketNumber}</span>
                      <span className="badge bg-secondary">{t.status}</span>
                    </div>
                    <p className="mb-1 text-truncate fw-bold">{t.summary}</p>
                    <p className="mb-1 small">Requester: {t.requester.name}</p>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                       <span className={`badge bg-${t.requestedPriority === 'High' ? 'danger' : 'warning'}`}>{t.requestedPriority}</span>
                       {/* <-- BOUTON OPEN CONNECTÉ */}
                       <button className="btn btn-sm btn-primary" onClick={() => setSelectedTicketId(t.id)}>Open</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* VUE DESKTOP (Tableau) - Cachée sur Mobile */}
            <div className="table-responsive d-none d-md-block bg-white border rounded">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ticketNumber')}>
                      Ticket # {sortField === 'ticketNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Summary</th>
                    <th>Requester</th>
                    <th>Owner</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('requestedPriority')}>
                      Priority {sortField === 'requestedPriority' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                      Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('createdAt')}>
                      Created {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td className="fw-bold text-primary">{t.ticketNumber}</td>
                      <td>{t.summary}</td>
                      <td>{t.requester.name}</td>
                      <td className="text-muted">{t.ticketOwner?.name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge bg-${t.requestedPriority === 'High' ? 'danger' : t.requestedPriority === 'Medium' ? 'warning' : 'secondary'}`}>
                          {t.requestedPriority}
                        </span>
                      </td>
                      <td><span className="badge bg-secondary">{t.status}</span></td>
                      <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                      {/* <-- BOUTON OPEN CONNECTÉ */}
                      <td><button className="btn btn-sm btn-primary" onClick={() => setSelectedTicketId(t.id)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- PAGINATION --- */}
            {meta && meta.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3 px-2">
                <span className="small text-muted">
                  Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} tickets
                </span>
                <div className="btn-group">
                  <button 
                    className="btn btn-sm btn-outline-primary" 
                    disabled={meta.page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </button>
                  <button className="btn btn-sm btn-primary disabled">{meta.page}</button>
                  <button 
                    className="btn btn-sm btn-outline-primary" 
                    disabled={meta.page === meta.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}