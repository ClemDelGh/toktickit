import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import RequesterSelector from '../../src/RequesterSelector';

global.fetch = vi.fn();

describe('RequesterSelector Component', () => {
  it('renders the selector and loads active requesters', async () => {
    const mockRequesters = [
      { id: 1, name: 'Jennifer Anderson', email: 'jennifer.a@example.com' },
      { id: 2, name: 'Michael Brown', email: 'michael.b@example.com' }
    ];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequesters,
    });

    const onSelectMock = vi.fn();
    render(<RequesterSelector onSelect={onSelectMock} />);

    expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByRole('combobox'), '1');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(onSelectMock).toHaveBeenCalledWith(mockRequesters[0]);
  });
});