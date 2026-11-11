import { describe, expect, it } from 'vitest';
import { inkColor, inkSvg, lightSvg } from '../src/ui/stage/rigs';

const part = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -40 260 270" width="520" height="540">\n<path d="M0 0 L10 10 Z" fill="#9a9a9a"/>\n</svg>';

describe('the lighting pass on rig parts', () => {
  it('keeps the drawing and lays a top light, bottom shade and rim over its own shape', () => {
    const lit = lightSvg(part);
    expect(lit).toContain('<path d="M0 0 L10 10 Z" fill="#9a9a9a"/>');
    expect(lit).toContain('viewBox="0 -40 260 270"');
    expect(lit).toContain('mask="url(#lit-a)"');
    expect(lit).toContain('mask="url(#lit-r)"');
    // The masks cover the rig's canvas, including the room above y = 0 that wings flap into.
    expect(lit).toContain('x="0" y="-40" width="260" height="270"');
    expect(lit.match(/<svg\b/g)).toHaveLength(1);
    expect(lit.trim().endsWith('</svg>')).toBe(true);
  });

  it('never uses SVG filters, which Safari draws at low resolution', () => {
    expect(lightSvg(part)).not.toMatch(/<filter|filter=/);
  });

  it('leaves art it cannot read alone', () => {
    expect(lightSvg('<svg><path d="M0 0"/></svg>')).toBe('<svg><path d="M0 0"/></svg>');
    expect(lightSvg('not svg')).toBe('not svg');
  });
});

describe('look B: colored outlines', () => {
  const outline = '#1d1a2b';

  it('gives a filled shape an outline in a dark version of its own color', () => {
    const svg = `<svg viewBox="0 0 10 10"><path d="M0 0" fill="#e8603c" stroke="${outline}" stroke-width="4"/></svg>`;
    const out = inkSvg(svg);
    expect(out).toContain(`fill="#e8603c" stroke="${inkColor('#e8603c')}"`);
    expect(out).not.toContain(outline);
  });

  it('colors a stroke-only edge from the line drawn over it, or else from the main fill', () => {
    const svg = `<svg viewBox="0 0 10 10"><path d="M1 1" fill="#3f8fd8"/>`
      + `<path d="M2 2" fill="none" stroke="${outline}" stroke-width="9"/><path d="M2 2" fill="none" stroke="#8a5a36" stroke-width="5"/>`
      + `<path d="M3 3" fill="none" stroke="${outline}" stroke-width="4"/></svg>`;
    const out = inkSvg(svg);
    expect(out).toContain(`<path d="M2 2" fill="none" stroke="${inkColor('#8a5a36')}" stroke-width="9"/>`);
    expect(out).toContain(`<path d="M3 3" fill="none" stroke="${inkColor('#3f8fd8')}" stroke-width="4"/>`);
  });

  it('keeps the outline dark: darker than the fill, and near the shared outline for grays and whites', () => {
    const lum = (h: string) => [1, 3, 5].reduce((n, i) => n + parseInt(h.slice(i, i + 2), 16), 0) / 765;
    for (const c of ['#e8603c', '#3f8fd8', '#5fbf5a', '#f2c14e', '#ffffff', '#9a9a9a']) {
      expect(lum(inkColor(c))).toBeLessThan(0.36);
      expect(lum(inkColor(c))).toBeLessThan(lum(c));
    }
  });

  it('tints toward the scene light only when a style is given', () => {
    const part = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0" fill="#9a9a9a"/></svg>';
    expect(lightSvg(part)).not.toContain('#6a3fc4');
    expect(lightSvg(part, { look: 'b', light: { ambient: '#6a3fc4', key: '#ffd49a' } })).toContain('fill="#6a3fc4"');
  });
});
