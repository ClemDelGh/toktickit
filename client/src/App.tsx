import { useState } from 'react';
import RequesterSelector from './RequesterSelector';
import CreateTicket from './CreateTicket';
import MyTickets from './MyTickets';

interface Requester {
  id: number;
  name: string;
  email: string;
}

export default function App() {
  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  if (!currentRequester) {
    return <RequesterSelector onSelect={setCurrentRequester} />;
  }

  return (
    <div>
      <nav className="navbar navbar-dark shadow-sm" style={{ backgroundColor: '#006B3C' }}>
        <div className="container-fluid px-4">
          <span className="navbar-brand mb-0 h1 d-flex align-items-center">
            TokTickIT
          </span>
          <div className="d-flex align-items-center text-white">
            <span className="me-4 d-flex align-items-center">
               <span className="me-2"></span> Profile: {currentRequester.name}
            </span>
            <button 
              className="btn btn-sm btn-outline-light" 
              onClick={() => setCurrentRequester(null)}
            >
              Change Requester
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-light border-bottom py-2">
        <div className="container">
          <div className="btn-group" role="group">
            <button 
              type="button" 
              className={`btn btn-sm ${activeTab === 'create' ? 'text-white' : 'btn-outline-success'}`}
              style={{ backgroundColor: activeTab === 'create' ? '#006B3C' : 'transparent', borderColor: '#006B3C' }}
              onClick={() => setActiveTab('create')}
            >
              Create Ticket
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${activeTab === 'list' ? 'text-white' : 'btn-outline-success'}`}
              style={{ backgroundColor: activeTab === 'list' ? '#006B3C' : 'transparent', borderColor: '#006B3C' }}
              onClick={() => setActiveTab('list')}
            >
              My Tickets
            </button>
          </div>
        </div>
      </div>

      <main className="container mt-4 mb-5">
        {activeTab === 'create' ? (
          <CreateTicket requester={currentRequester} />
        ) : (
          <MyTickets requester={currentRequester} />
        )}
      </main>
    </div>
  );
}