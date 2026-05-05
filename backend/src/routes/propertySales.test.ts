import { classifyProperty, neighborhoodCodeScore } from './propertySales';

// ─── neighborhoodCodeScore ────────────────────────────────────────────────────

describe('neighborhoodCodeScore', () => {
  it('returns 0 for the lowest neighbourhood value (001)', () => {
    expect(neighborhoodCodeScore('77001')).toBe(0);
  });

  it('returns ~2.5 at the midpoint (500)', () => {
    expect(neighborhoodCodeScore('77500')).toBe(2.5);
  });

  it('returns 5 at the maximum value (999)', () => {
    expect(neighborhoodCodeScore('77999')).toBe(5);
  });

  it('uses only the last 3 digits regardless of leading township digits', () => {
    expect(neighborhoodCodeScore('10999')).toBe(5);
    expect(neighborhoodCodeScore('10001')).toBe(0);
  });

  it('returns 0 for an empty string', () => {
    expect(neighborhoodCodeScore('')).toBe(0);
  });

  it('returns 0 for a string shorter than 3 characters', () => {
    expect(neighborhoodCodeScore('12')).toBe(0);
  });

  it('higher neighborhood codes produce higher scores', () => {
    expect(neighborhoodCodeScore('77800')).toBeGreaterThan(neighborhoodCodeScore('77200'));
  });
});

// ─── classifyProperty ─────────────────────────────────────────────────────────

describe('classifyProperty', () => {
  it('classifies class 200 as Residential – Single-Family', () => {
    const r = classifyProperty('200');
    expect(r.broadType).toBe('Residential');
    expect(r.label).toBe('Residential – Single-Family');
  });

  it('classifies class 202 as Residential – Single-Family w/ Garage', () => {
    const r = classifyProperty('202');
    expect(r.broadType).toBe('Residential');
    expect(r.label).toBe('Residential – Single-Family w/ Garage');
  });

  it('classifies class 203 as Residential – 2-Flat', () => {
    expect(classifyProperty('203').label).toBe('Residential – 2-Flat');
  });

  it('classifies class 295 as Residential – Residential Vacant Lot', () => {
    const r = classifyProperty('295');
    expect(r.broadType).toBe('Residential');
    expect(r.label).toBe('Residential – Residential Vacant Lot');
  });

  it('classifies class 100 as Vacant Land', () => {
    const r = classifyProperty('100');
    expect(r.broadType).toBe('Vacant Land');
    expect(r.label).toBe('Vacant Land');
  });

  it('classifies class 500 as Commercial', () => {
    const r = classifyProperty('500');
    expect(r.broadType).toBe('Commercial');
    expect(r.label).toBe('Commercial');
  });

  it('classifies class 599 as Commercial', () => {
    expect(classifyProperty('599').broadType).toBe('Commercial');
  });

  it('classifies class 600 as Industrial', () => {
    const r = classifyProperty('600');
    expect(r.broadType).toBe('Industrial');
    expect(r.label).toBe('Industrial / Manufacturing');
  });

  it('classifies class 300 as Multi-unit Residential', () => {
    expect(classifyProperty('300').broadType).toBe('Multi-unit Residential');
  });

  it('classifies class 400 as Non-profit / Institutional', () => {
    expect(classifyProperty('400').broadType).toBe('Non-profit / Institutional');
  });

  it('classifies class 700 as Special', () => {
    expect(classifyProperty('700').broadType).toBe('Special');
  });

  it('classifies class 0 as Exempt', () => {
    expect(classifyProperty('0').broadType).toBe('Exempt');
  });

  it('returns Unknown for unrecognised codes', () => {
    expect(classifyProperty('').broadType).toBe('Unknown');
    expect(classifyProperty('XYZ').broadType).toBe('Unknown');
  });
});
