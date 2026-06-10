import { Component, Input, OnChanges } from '@angular/core';
import { Participant } from '../worldcup.types';
import { GroupFixture, MatchOutcome, GROUP_FIXTURES, FIXTURES_BY_DATE, ALL_DATES } from '../group-stage-fixtures';
import { getFlag } from '../flag.util';

interface HypotheticalEntry {
  participant: Participant;
  delta: number;
  hypotheticalTotal: number;
  rankChange: number;
}

const PICK_FIELDS: (keyof Participant)[] = [
  'tier1_team', 'tier2_team_a', 'tier2_team_b',
  'tier3_team_a', 'tier3_team_b',
  'tier4_team_a', 'tier4_team_b', 'tier4_team_c',
];

@Component({
  selector: 'app-simulator',
  imports: [],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.scss',
})
export class SimulatorComponent implements OnChanges {
  @Input() participants: Participant[] = [];

  outcomes: Record<number, MatchOutcome> = {};
  selectedDate: string | null = this.defaultDate();

  readonly allDates = ALL_DATES;
  readonly fixturesByDate = FIXTURES_BY_DATE;

  private realRankOrder: number[] = [];

  ngOnChanges(): void {
    this.realRankOrder = [...this.participants]
      .sort((a, b) => b.points - a.points)
      .map(p => p.id);
  }

  get visibleFixtures(): GroupFixture[] {
    if (this.selectedDate) return FIXTURES_BY_DATE[this.selectedDate] ?? [];
    return GROUP_FIXTURES;
  }

  get hasSelections(): boolean {
    return Object.keys(this.outcomes).length > 0;
  }

  get hypotheticalStandings(): HypotheticalEntry[] {
    const deltas: Record<number, number> = {};
    for (const p of this.participants) deltas[p.id] = 0;

    for (const [idStr, outcome] of Object.entries(this.outcomes)) {
      const fixture = GROUP_FIXTURES[Number(idStr) - 1];
      if (!fixture) continue;

      for (const p of this.participants) {
        const picks = PICK_FIELDS
          .map(f => (p[f] as string) ?? '')
          .filter(Boolean);
        const hasHome = picks.includes(fixture.home);
        const hasAway = picks.includes(fixture.away);

        if (outcome === 'home')  { if (hasHome) deltas[p.id] += 3; }
        if (outcome === 'away')  { if (hasAway) deltas[p.id] += 3; }
        if (outcome === 'draw')  {
          if (hasHome) deltas[p.id] += 1;
          if (hasAway) deltas[p.id] += 1;
        }
      }
    }

    const entries: HypotheticalEntry[] = this.participants.map(p => ({
      participant: p,
      delta: deltas[p.id],
      hypotheticalTotal: p.points + deltas[p.id],
      rankChange: 0,
    }));

    entries.sort((a, b) => b.hypotheticalTotal - a.hypotheticalTotal || a.participant.name.localeCompare(b.participant.name));

    // Compute rank change vs real order
    entries.forEach((e, i) => {
      const realRank = this.realRankOrder.indexOf(e.participant.id);
      e.rankChange = realRank - i; // positive = moved up
    });

    return entries;
  }

  setOutcome(fixtureId: number, outcome: MatchOutcome): void {
    if (this.outcomes[fixtureId] === outcome) {
      delete this.outcomes[fixtureId];
    } else {
      this.outcomes[fixtureId] = outcome;
    }
    this.outcomes = { ...this.outcomes };
  }

  clearAll(): void {
    this.outcomes = {};
  }

  selectDate(d: string | null): void {
    this.selectedDate = d;
  }

  flag(team: string): string {
    return getFlag(team);
  }

  formatDate(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  countForDate(date: string): number {
    return (FIXTURES_BY_DATE[date] ?? []).length;
  }

  getOutcome(fixtureId: number): MatchOutcome | null {
    return this.outcomes[fixtureId] ?? null;
  }

  rankDisplay(i: number): string {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return String(i + 1);
  }

  private defaultDate(): string | null {
    const today = new Date().toISOString().slice(0, 10);
    if (ALL_DATES.includes(today)) return today;
    const future = ALL_DATES.find(d => d >= today);
    return future ?? ALL_DATES[ALL_DATES.length - 1] ?? null;
  }
}
