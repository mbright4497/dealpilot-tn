import { generateDeadlinesForDeal, calculateBAD } from '../../src/lib/timeline-engine';

describe('Timeline Engine', () => {
  it('calculates BAD correctly', () => {
    const d = '2026-03-01';
    expect(calculateBAD(d)).toEqual(d);
  });

  it('generates expected deadline categories', () => {
    const dls = generateDeadlinesForDeal('deal-1', '2026-03-01', { inspection_days: 7, financingType: 'loan' });
    const cats = new Set(dls.map(x => x.category));
    expect(cats.has('loan-obligation')).toBeTruthy();
    expect(cats.has('appraisal')).toBeTruthy();
    expect(cats.has('inspection')).toBeTruthy();
    expect(cats.has('closing')).toBeTruthy();
  });

  it('generates closing alerts', () => {
    const dls = generateDeadlinesForDeal('deal-2', '2026-01-01');
    const closingAlerts = dls.filter(d => d.name.startsWith('Closing alert'));
    expect(closingAlerts.length).toBeGreaterThanOrEqual(5);
  });
});
