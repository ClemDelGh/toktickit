import { useState, useEffect, FormEvent } from 'react';

interface Requester { id: number; name: string; email: string; }
interface ReferenceItem { id: number; name: string; }

interface Props { requester: Requester; }

export default function CreateTicket({ requester }: Props) {
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);
  
  const [categoryId, setCategoryId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ summary?: string; description?: string }>({});
  const [apiError, setApiError] = useState('');
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3000/api/categories').then(res => res.json()),
      fetch('http://localhost:3000/api/related-systems').then(res => res.json())
    ]).then(([cats, sys]) => {
      setCategories(cats);
      setSystems(sys);
      if (cats.length > 0) setCategoryId(String(cats[0].id));
      if (sys.length > 0) setSystemId(String(sys[0].id));
      setLoading(false);
    }).catch(() => {
      setApiError('Failed to load reference data. Please try again later.');
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    const newErrors: any = {};
    if (!summary.trim()) newErrors.summary = 'Summary is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': String(requester.id)
        },
        body: JSON.stringify({
          categoryId: Number(categoryId),
          relatedSystemId: Number(systemId),
          requestedPriority: priority,
          summary,
          description
        })
      });

      if (!response.ok) throw new Error('Failed to create ticket');
      const data = await response.json();
      setSuccessTicket(data.ticketNumber);
    } catch (err) {
      setApiError('Unable to create ticket. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-success" /></div>;

  if (successTicket) {
    return (
      <div className="card shadow-sm mt-4 border-success">
        <div className="card-body text-center p-5" style={{ backgroundColor: '#EAF6EF' }}>
          <h2 className="text-success mb-3">Ticket Created Successfully!</h2>
          <p className="fs-4">Your Ticket Number is: <strong>{successTicket}</strong></p>
          <button className="btn mt-3 text-white" style={{ backgroundColor: '#006B3C' }} onClick={() => window.location.reload()}>
            Create Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-header text-white" style={{ backgroundColor: '#006B3C' }}>
        <h5 className="mb-0">Create New Support Ticket</h5>
      </div>
      <div className="card-body bg-white">
        {apiError && <div className="alert alert-danger">{apiError}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-bold text-dark">Requester</label>
              <input type="text" className="form-control bg-light" value={requester.name} disabled />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold text-dark">Ticket Date</label>
              <input type="text" className="form-control bg-light" value={new Date().toLocaleDateString()} disabled />
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label fw-bold text-dark">Category <span className="text-danger">*</span></label>
              <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold text-dark">Related System <span className="text-danger">*</span></label>
              <select className="form-select" value={systemId} onChange={e => setSystemId(e.target.value)}>
                {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold text-dark">Requested Priority <span className="text-danger">*</span></label>
              <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold text-dark">Summary <span className="text-danger">*</span></label>
            <input 
              type="text" 
              className={`form-control ${errors.summary ? 'is-invalid' : ''}`} 
              value={summary} 
              onChange={e => setSummary(e.target.value)} 
              placeholder="Brief description of the issue"
            />
            {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold text-dark">Description <span className="text-danger">*</span></label>
            <textarea 
              className={`form-control ${errors.description ? 'is-invalid' : ''}`} 
              rows={5} 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide detailed information..."
            />
            {errors.description && <div className="invalid-feedback">{errors.description}</div>}
          </div>

          <div className="d-flex justify-content-end">
            <button type="submit" className="btn text-white" style={{ backgroundColor: '#006B3C' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}