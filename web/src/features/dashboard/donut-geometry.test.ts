import { describe, it, expect } from 'vitest';
import {
  polarToCartesian,
  createDonutSlicePath,
  createOuterArcPath,
  computeDonutSlices,
  type PieSliceData,
} from './donut-geometry';

describe('donut-geometry', () => {
  it('computes polar coordinates accurately', () => {
    const north = polarToCartesian(100, 100, 50, -Math.PI / 2);
    expect(north.x).toBeCloseTo(100, 1);
    expect(north.y).toBeCloseTo(50, 1);

    const east = polarToCartesian(100, 100, 50, 0);
    expect(east.x).toBeCloseTo(150, 1);
    expect(east.y).toBeCloseTo(100, 1);
  });

  it('generates valid SVG path for donut slice', () => {
    const path = createDonutSlicePath(150, 150, 60, 90, 0, Math.PI / 2);
    expect(path).toContain('M ');
    expect(path).toContain('A 90 90');
    expect(path).toContain('L ');
    expect(path).toContain('A 60 60');
    expect(path).toContain('Z');
  });

  it('generates outer highlight arc path', () => {
    const arc = createOuterArcPath(150, 150, 100, 0, Math.PI / 2);
    expect(arc).toContain('M ');
    expect(arc).toContain('A 100 100');
  });

  it('returns empty array when total is zero', () => {
    const slices: PieSliceData[] = [
      { id: 'a', label: 'A', value: 0, color: '#f00', formattedValue: '0', sublabel: 'None' },
    ];
    const computed = computeDonutSlices(slices);
    expect(computed).toEqual([]);
  });

  it('computes slices for balanced dataset', () => {
    const slices: PieSliceData[] = [
      { id: 'paid', label: 'Paid', value: 60, color: '#3b82f6', formattedValue: '₦60.00', sublabel: 'Paid sales' },
      { id: 'credit', label: 'Credit', value: 40, color: '#1d4ed8', formattedValue: '₦40.00', sublabel: 'Credit sales' },
    ];
    const computed = computeDonutSlices(slices);
    expect(computed).toHaveLength(2);
    expect(computed[0].percent).toBe(60);
    expect(computed[1].percent).toBe(40);
    expect(computed[0].path).toBeDefined();
    expect(computed[0].activePath).toBeDefined();
    expect(computed[0].highlightArcPath).toBeDefined();
  });
});

