export interface PieSliceData {
  id: string;
  label: string;
  value: number;
  color: string;
  formattedValue: string;
  sublabel: string;
}

export interface ComputedSlice extends PieSliceData {
  startAngle: number;
  endAngle: number;
  path: string;
  activePath: string;
  highlightArcPath: string;
  middleAngle: number;
  percent: number;
}

/**
 * Converts polar coordinates to Cartesian coordinates.
 * Angle in radians, with 0 pointing North (-π/2).
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInRadians: number
): { x: number; y: number } {
  return {
    x: Number((cx + radius * Math.cos(angleInRadians)).toFixed(2)),
    y: Number((cy + radius * Math.sin(angleInRadians)).toFixed(2)),
  };
}

/**
 * Generates an SVG path string for a donut slice (inner and outer arcs).
 */
export function createDonutSlicePath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  // If a single slice takes 100% (or nearly 100%), split or bound endAngle to prevent degenerate arc
  const sweepAngle = endAngle - startAngle;
  const isFullCircle = sweepAngle >= 2 * Math.PI - 0.001;
  const effectiveEndAngle = isFullCircle ? startAngle + 2 * Math.PI - 0.001 : endAngle;

  const largeArcFlag = effectiveEndAngle - startAngle > Math.PI ? 1 : 0;

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, effectiveEndAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, effectiveEndAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

/**
 * Generates an SVG path for the floating outer arc outline around the active slice.
 */
export function createOuterArcPath(
  cx: number,
  cy: number,
  ringRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const sweepAngle = endAngle - startAngle;
  const isFullCircle = sweepAngle >= 2 * Math.PI - 0.001;
  const effectiveEndAngle = isFullCircle ? startAngle + 2 * Math.PI - 0.001 : endAngle;

  const largeArcFlag = effectiveEndAngle - startAngle > Math.PI ? 1 : 0;
  const start = polarToCartesian(cx, cy, ringRadius, startAngle);
  const end = polarToCartesian(cx, cy, ringRadius, effectiveEndAngle);

  return `M ${start.x} ${start.y} A ${ringRadius} ${ringRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

/**
 * Computes all slices for an interactive donut chart.
 */
export function computeDonutSlices(
  slices: PieSliceData[],
  options: {
    cx?: number;
    cy?: number;
    innerRadius?: number;
    outerRadius?: number;
    activeOuterRadius?: number;
    ringRadius?: number;
    startOffsetAngle?: number;
  } = {}
): ComputedSlice[] {
  const cx = options.cx ?? 150;
  const cy = options.cy ?? 150;
  const innerRadius = options.innerRadius ?? 62;
  const outerRadius = options.outerRadius ?? 92;
  const activeOuterRadius = options.activeOuterRadius ?? 102;
  const ringRadius = options.ringRadius ?? 109;
  const startOffset = options.startOffsetAngle ?? -Math.PI / 2; // North

  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (total <= 0) {
    return [];
  }

  let currentAngle = startOffset;

  return slices.map((slice) => {
    const val = Math.max(0, slice.value);
    const fraction = val / total;
    const sliceAngle = fraction * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const middleAngle = startAngle + sliceAngle / 2;

    currentAngle = endAngle;

    return {
      ...slice,
      percent: Math.round(fraction * 100),
      startAngle,
      endAngle,
      middleAngle,
      path: createDonutSlicePath(cx, cy, innerRadius, outerRadius, startAngle, endAngle),
      activePath: createDonutSlicePath(cx, cy, innerRadius, activeOuterRadius, startAngle, endAngle),
      highlightArcPath: createOuterArcPath(cx, cy, ringRadius, startAngle, endAngle),
    };
  });
}

