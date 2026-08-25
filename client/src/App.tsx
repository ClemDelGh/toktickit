import { useState } from 'react';
import RequesterSelector from './RequesterSelector';
import CreateTicket from './CreateTicket';

interface Requester {
  id: number;
  name: string;
  email: string;
}

export default function App() {

  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);

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
               <span className="me-2">👤</span> Profile: {currentRequester.name}
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

      <main className="container mt-4 mb-5">
        <div className="alert mb-4" style={{ backgroundColor: '#EAF6EF', border: '1px solid #0B7A46', color: '#0B7A46' }}>
          <h4 className="alert-heading">Welcome, {currentRequester.name}!</h4>
          <p className="mb-0">
            Your Development Requester context is now securely stored in the app state. 
            This fulfills the "logged-in user" simulation requirement for Lab 2.
          </p>
        </div>
        
        <CreateTicket requester={currentRequester} />
      </main>
    </div>
  );
}