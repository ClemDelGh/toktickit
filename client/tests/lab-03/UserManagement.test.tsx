import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserManagement from '../../src/UserManagement'; 

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([
      { id: 1, name: 'John Admin', email: 'admin@toktickit.com', role: 'Administrator', isActive: true }
    ]),
  })
) as any;

describe('UserManagement Component (UI-05)', () => {
  it('renders the user list and opens the create modal', async () => {
    render(<UserManagement />);
    
    expect(screen.getByText('User Management')).toBeDefined();
    expect(screen.getByPlaceholderText('Search by name or email...')).toBeDefined();

    const createBtn = screen.getByText('+ Create User');
    fireEvent.click(createBtn);

    expect(screen.getByText('Create New User')).toBeDefined();
    expect(screen.getByText('Initial Password')).toBeDefined();
  });
});