import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import App from './App';
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it('creates and reopens an event from local persistence', async () => {
  const u = userEvent.setup();
  const { unmount } = render(<App />);
  await u.click(screen.getByRole('button', { name: 'Create event' }));
  expect(screen.getAllByLabelText('Win by')).toHaveLength(1);
  await u.type(screen.getByLabelText('Event name'), 'Friday Flight');
  await u.click(screen.getByRole('button', { name: 'Create & save' }));
  expect(screen.getByText('Friday Flight')).toBeInTheDocument();
  unmount();
  render(<App />);
  expect(screen.getByText('Friday Flight')).toBeInTheDocument();
});

it('surfaces corrupt persistence and refuses to overwrite it', async () => {
  localStorage.setItem('pickleball-iq-alpha-v1', '{broken');
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent('Saved data could not be opened');
  await user.click(screen.getByRole('button', { name: 'Create event' }));
  await user.type(screen.getByLabelText('Event name'), 'Should not save');
  await user.click(screen.getByRole('button', { name: 'Create & save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Restore a valid backup');
  expect(localStorage.getItem('pickleball-iq-alpha-v1')).toBe('{broken');
});
