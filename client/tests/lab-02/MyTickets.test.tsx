import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MyTickets from '../../src/MyTickets';

global.fetch = vi.fn();

describe('MyTickets Component', () => {
  const mockRequester = { id: 1, name: 'Jennifer Anderson', email: 'jennifer@example.com' };

  it('renders tickets list successfully', async () => {
    const mockTickets = [
      {
        id: 1,
        ticketNumber: 'TKT-2026-0001',
        summary: 'Cannot connect to VPN',
        description: 'VPN drops every 5 minutes',
        requestedPriority: 'High',
        currentStatus: 'New',
        createdAt: new Date().toISOString(),
        category: { name: 'Network' },
        relatedSystem: { name: 'VPN' }
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTickets,
    });

    render(<MyTickets requester={mockRequester} />);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Cannot connect to VPN')).toBeInTheDocument();
    });
  });
});