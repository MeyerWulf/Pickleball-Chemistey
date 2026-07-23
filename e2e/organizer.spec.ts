import { test, expect } from '@playwright/test';
test('organizer creates an event and player, checks in, generates, and scores', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create event' }).click();
  await page.getByLabel('Event name').fill('Alpha Night');
  await page.getByRole('button', { name: 'Create & save' }).click();
  await page.getByRole('button', { name: 'Players' }).click();
  for (let i = 1; i <= 5; i++) {
    await page.getByLabel('Name').fill(`Player ${i}`);
    await page.getByLabel('Rating').fill(String(4 + i / 10));
    await page.getByRole('button', { name: 'Save player' }).click();
  }
  await page.getByLabel('Archive Player 1').click();
  await expect(page.getByText('Rating 4.10 · Archived')).toBeVisible();
  await page.getByLabel('Restore Player 1').click();
  await page.getByLabel('Search players').fill('Player 5');
  await expect(page.getByText('Player 5', { exact: true })).toBeVisible();
  await expect(page.getByText('Player 1', { exact: true })).toBeHidden();
  await page.getByLabel('Search players').clear();
  await page.getByRole('button', { name: 'Events' }).click();
  await page.getByRole('button', { name: 'Open' }).click();
  for (const box of await page.getByRole('checkbox').all()) await box.check();
  await page.getByRole('button', { name: 'Generate balanced stage' }).click();
  await expect(page.getByText('Byes:')).toBeVisible();
  await page.getByText('Manual assignment').click();
  await page.getByLabel('Assignment player 1 court 1').selectOption({ label: 'Player 1' });
  await page.getByRole('button', { name: 'Save assignment' }).click();
  await expect(page.getByText('Byes: Player 5')).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByLabel('Team A score court 1').fill('11');
  await page.getByLabel('Team B score court 1').fill('7');
  await page.getByRole('button', { name: 'Save score' }).click();
  await page.getByLabel('Team B score court 1').fill('9');
  await page.getByRole('button', { name: 'Edit score' }).click();
  await expect(page.getByText('1 prior correction preserved')).toBeVisible();
  await page.getByRole('button', { name: 'Complete stage' }).click();
  await page.getByRole('button', { name: 'Delete score' }).click();
  await page.getByRole('button', { name: 'Save score' }).click();
  await page.getByRole('button', { name: 'Complete stage' }).click();
  await page.getByRole('button', { name: 'Complete event' }).click();
  await expect(page.getByRole('button', { name: 'Reopen event' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit score' })).toBeDisabled();
  await page.reload();
  await expect(page.getByText('Alpha Night')).toBeVisible();
});
