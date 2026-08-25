import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CreateTicket from '../../src/CreateTicket';

global.fetch = vi.fn();

describe('CreateTicket Component', () => {
  const mockRequester = { id: 1, name: 'Jennifer Anderson', email: 'jennifer@example.com' };

  it('shows validation errors when submitting empty required fields', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CreateTicket requester={mockRequester} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit Ticket/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /Submit Ticket/i }));

    expect(await screen.findByText(/Summary is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    
    const postCalls = (global.fetch as any).mock.calls.filter((call: any) => call[1]?.method === 'POST');
    expect(postCalls.length).toBe(0);
  });
});