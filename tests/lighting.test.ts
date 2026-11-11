import { describe, expect, it } from 'vitest';
import { lightSvg } from '../src/ui/stage/rigs';

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
