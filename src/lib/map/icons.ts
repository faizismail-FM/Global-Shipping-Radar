import type { Theme, VesselStatus } from '@/types';

export interface IconSpec {
  name: string;
  data: ImageData;
  pixelRatio: number;
}

const SIZE = 48;

function drawShip(fill: string, stroke: string, glow: string | null): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');

  const path = new Path2D();
  // Bow at the top so heading 0° points north.
  path.moveTo(24, 3);
  path.lineTo(33, 15);
  path.lineTo(33, 38);
  path.lineTo(30, 44);
  path.lineTo(18, 44);
  path.lineTo(15, 38);
  path.lineTo(15, 15);
  path.closePath();

  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = fill;
  ctx.fill(path);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = stroke;
  ctx.stroke(path);

  // Small bridge/deck mark for a "ship" read at larger sizes.
  ctx.fillStyle = stroke;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(20, 30, 8, 5);
  ctx.globalAlpha = 1;
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

export const STATUS_COLORS: Record<Theme, Record<VesselStatus, string>> = {
  dark: { underway: '#38e1ff', anchored: '#7f93ad', moored: '#5c6f88', delayed: '#ffb547' },
  light: { underway: '#0284c7', anchored: '#64748b', moored: '#94a3b8', delayed: '#d97706' },
};

export function createVesselIcons(theme: Theme): IconSpec[] {
  const colors = STATUS_COLORS[theme];
  const stroke = theme === 'dark' ? '#061019' : '#ffffff';
  return [
    { name: 'vessel-underway', data: drawShip(colors.underway, stroke, colors.underway), pixelRatio: 2 },
    { name: 'vessel-anchored', data: drawShip(colors.anchored, stroke, null), pixelRatio: 2 },
    { name: 'vessel-moored', data: drawShip(colors.moored, stroke, null), pixelRatio: 2 },
    { name: 'vessel-delayed', data: drawShip(colors.delayed, stroke, colors.delayed), pixelRatio: 2 },
  ];
}
