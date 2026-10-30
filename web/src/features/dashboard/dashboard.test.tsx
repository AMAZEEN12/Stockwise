import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveSalesChart } from './InteractiveSalesChart';
import type { TodaySales } from '../../models/responses/dashboard.response';

const mockTodaySales: TodaySales = {
  count: 15,
  totalKobo: 2500000, // ₦25,000.00
  paidCount: 10,
  paidKobo: 1800000,  // ₦18,000.00
  creditCount: 5,
  creditKobo: 700000,  // ₦7,000.00
};

describe('InteractiveSalesChart', () => {
  it('renders interactive pie chart with header, toggle and select controls', () => {
    const { container } = render(
      <InteractiveSalesChart todaySales={mockTodaySales} dateLabel="Today in Lagos" />
    );

    expect(screen.getByRole('heading', { name: /Pie Chart - Interactive/i })).toBeInTheDocument();
    expect(screen.getByText('Today in Lagos')).toBeInTheDocument();

    // Metric toggle buttons
    const revenueBtn = screen.getByRole('button', { name: /Revenue \(₦\)/i });
    const volumeBtn = screen.getByRole('button', { name: /Volume \(Count\)/i });
    expect(revenueBtn).toHaveAttribute('aria-pressed', 'true');
    expect(volumeBtn).toHaveAttribute('aria-pressed', 'false');

    // Default center values: Total Revenue
    expect(container.querySelector('.donut-center-value')?.textContent).toBe('₦25,000.00');
    expect(container.querySelector('.donut-center-label')?.textContent).toBe('Total Revenue');

    // Slices in legend
    expect(screen.getByText('Paid sales')).toBeInTheDocument();
    expect(screen.getByText('Credit sales')).toBeInTheDocument();
  });

  it('switches metric to volume count when clicking volume button', () => {
    const { container } = render(<InteractiveSalesChart todaySales={mockTodaySales} />);

    const volumeBtn = screen.getByRole('button', { name: /Volume \(Count\)/i });
    fireEvent.click(volumeBtn);

    expect(volumeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.donut-center-value')?.textContent).toBe('15 sales');
    expect(container.querySelector('.donut-center-label')?.textContent).toBe('Total Sales');
  });

  it('updates center value and label when selecting a segment from dropdown', () => {
    const { container } = render(<InteractiveSalesChart todaySales={mockTodaySales} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'paid' } });

    expect(container.querySelector('.donut-center-value')?.textContent).toBe('₦18,000.00');
    expect(container.querySelector('.donut-center-label')?.textContent).toBe('Paid sales');

    fireEvent.change(select, { target: { value: 'credit' } });
    expect(container.querySelector('.donut-center-value')?.textContent).toBe('₦7,000.00');
    expect(container.querySelector('.donut-center-label')?.textContent).toBe('Credit sales');

    fireEvent.change(select, { target: { value: 'all' } });
    expect(container.querySelector('.donut-center-value')?.textContent).toBe('₦25,000.00');
    expect(container.querySelector('.donut-center-label')?.textContent).toBe('Total Revenue');
  });

  it('displays empty state ring when there are no sales', () => {
    const emptySales: TodaySales = {
      count: 0,
      totalKobo: 0,
      paidCount: 0,
      paidKobo: 0,
      creditCount: 0,
      creditKobo: 0,
    };

    const { container } = render(<InteractiveSalesChart todaySales={emptySales} />);

    expect(container.querySelector('.donut-center-value')?.textContent).toBe('₦0.00');
    expect(container.querySelector('.donut-center-label')?.textContent).toBe('Total Revenue');
    expect(container.querySelector('.empty-donut-group')).toBeInTheDocument();
  });
});
