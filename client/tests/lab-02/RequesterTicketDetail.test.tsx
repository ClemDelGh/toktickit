import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RequesterTicketDetail from '../../src/RequesterTicketDetail';

global.fetch = vi.fn();

describe('RequesterTicketDetail Component', () => {
  const mockRequester = { id: 1, name: 'Jennifer Anderson', email: 'jennifer@example.com' };
  
  it('renders ticket details and attachments', async () => {
    const mockTicket = {
      id: 1,
      ticketNumber: 'TKT-2026-0001',
      summary: 'VPN down',
      description: 'Cannot connect',
      requestedPriority: 'High',
      currentStatus: 'New',
      createdAt: new Date().toISOString(),
      category: { name: 'Network' },
      relatedSystem: { name: 'VPN' },
      attachments: [
        { id: 1, originalName: 'error.png', isRemoved: false },
        { id: 2, originalName: 'old_log.pdf', isRemoved: true }
      ]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTicket,
    });

    render(<RequesterTicketDetail ticketId={1} requester={mockRequester} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/TKT-2026-0001/)).toBeInTheDocument();
      expect(screen.getByText(/VPN down/)).toBeInTheDocument();
      
      expect(screen.getByText(/error.png/)).toBeInTheDocument();
      expect(screen.getByText(/old_log.pdf/)).toBeInTheDocument();
    });
  });
});