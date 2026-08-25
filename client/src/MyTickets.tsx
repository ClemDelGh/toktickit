import { useState, useEffect } from 'react';
import RequesterTicketDetail from './RequesterTicketDetail'; // 👈 On importe ton nouvel écran

interface Requester { id: number; name: string; email: string; }
interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: string;
  currentStatus: string;
  createdAt: string;
  category: { name: string };
  relatedSystem: { name: string };
}

interface Props { requester: Requester; }

export default function MyTickets({ requester }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/tickets', {
      headers: { 'X-Requester-Id': String(requester.id) }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tickets');
        return res.json();
      })
      .then(data => {
        setTickets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Unable to load your tickets.');
        setLoading(false);
      });
  }, [requester.id]);

  if (selectedTicketId) {
    return (
      <RequesterTicketDetail 
        ticketId={selectedTicketId} 
        requester={requester} 
        onBack={() => setSelectedTicketId(null)}
      />
    );
  }

  const filteredTickets = tickets.filter(t => 
    t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.summary.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-success" /></div>;
  if (error) return <div className="alert alert-danger mt-4">{error}</div>;

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-header text-white d-flex justify-content-between align-items-center" style={{ backgroundColor: '#006B3C' }}>
        <h5 className="mb-0">My Tickets</h5>
        <input 
          type="text" 
          className="form-control form-control-sm w-25" 
          placeholder="Search tickets..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="card-body bg-white p-0">
        {filteredTickets.length === 0 ? (
          <p className="text-muted p-4 mb-0 text-center">No tickets found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Ticket #</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>System</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr 
                    key={t.id} 
                    onClick={() => setSelectedTicketId(t.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="fw-bold text-success">{t.ticketNumber}</td>
                    <td>{t.summary}</td>
                    <td>{t.category.name}</td>
                    <td>{t.relatedSystem.name}</td>
                    <td>
                      <span className={`badge bg-${t.requestedPriority === 'High' ? 'danger' : t.requestedPriority === 'Medium' ? 'warning' : 'secondary'}`}>
                        {t.requestedPriority}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-success">{t.currentStatus}</span>
                    </td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}