import { Component, Input, OnChanges } from '@angular/core';
import { getFlag } from '../flag.util';
import {
  CHAMPION_BONUS,
  KNOCKOUT_MATCHES,
  KnockoutMatch,
  KnockoutRound,
  MATCH_BY_ID,
  ROUND_LABELS,
  ROUND_POINTS,
  ROUNDS_ORDER,
  getTeamTier,
} from '../knockout-bracket';
import { Participant } from '../worldcup.types';

interface HypotheticalEntry {
  participant: Participant;
  delta: number;
  hypotheticalTotal: number;
  rankChange: number;
}

interface RoundColumn {
  round: KnockoutRound;
  label: string;
  points: number;
  matches: KnockoutMatch[];
}

const PICK_FIELDS: (keyof Participant)[] = [
  'tier1_team',
  'tier2_team_a',
  'tier2_team_b',
  'tier3_team_a',
  'tier3_team_b',
  'tier4_team_a',
  'tier4_team_b',
  'tier4_team_c',
];

@Component({
  selector: 'app-bracket',
  imports: [],
  templateUrl: './bracket.component.html',
  styleUrl: './bracket.component.scss',
})
export class BracketComponent implements OnChanges {
  @Input() participants: Participant[] = [];

  picks: Record<string, string> = {};

  readonly roundColumns: RoundColumn[] = ROUNDS_ORDER.map(round => ({
    round,
    label: ROUND_LABELS[round],
    points: ROUND_POINTS[round],
    matches: KNOCKOUT_MATCHES.filter(match => match.round === round),
  }));

  private realRankOrder: number[] = [];

  ngOnChanges(): void {
    this.realRankOrder = [...this.participants]
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map(participant => participant.id);
  }

  get hasAnyPick(): boolean {
    return Object.keys(this.picks).length > 0;
  }

  get champion(): string | null {
    return this.picks['f_1'] ?? null;
  }

  get championBonus(): number {
    return this.champion ? CHAMPION_BONUS[getTeamTier(this.champion)] : 0;
  }

  get championBackers(): Participant[] {
    if (!this.champion) return [];
    return this.participants.filter(participant => participant.champion_pick === this.champion);
  }

  get hypotheticalStandings(): HypotheticalEntry[] {
    const deltas: Record<number, number> = {};
    for (const participant of this.participants) deltas[participant.id] = 0;

    for (const [matchId, winner] of Object.entries(this.picks)) {
      const match = MATCH_BY_ID[matchId];
      if (!match || winner === 'TBD') continue;

      for (const participant of this.participants) {
        const participantPicks = PICK_FIELDS
          .map(field => (participant[field] as string) ?? '')
          .filter(Boolean);

        if (participantPicks.includes(winner)) {
          deltas[participant.id] += ROUND_POINTS[match.round];
        }

        if (match.round === 'FINAL' && winner === participant.champion_pick) {
          deltas[participant.id] += CHAMPION_BONUS[getTeamTier(winner)];
        }
      }
    }

    const entries: HypotheticalEntry[] = this.participants.map(participant => ({
      participant,
      delta: deltas[participant.id],
      hypotheticalTotal: participant.points + deltas[participant.id],
      rankChange: 0,
    }));

    entries.sort(
      (a, b) =>
        b.hypotheticalTotal - a.hypotheticalTotal ||
        a.participant.name.localeCompare(b.participant.name)
    );

    entries.forEach((entry, index) => {
      const realRank = this.realRankOrder.indexOf(entry.participant.id);
      entry.rankChange = realRank - index;
    });

    return entries;
  }

  pickWinner(match: KnockoutMatch, team: string): void {
    if (team === 'TBD') return;

    const currentWinner = this.picks[match.id];

    if (currentWinner === team) {
      const nextPicks = { ...this.picks };
      delete nextPicks[match.id];
      this.picks = nextPicks;
      this.clearDownstreamWinner(match, team);
      return;
    }

    this.picks = {
      ...this.picks,
      [match.id]: team,
    };

    if (currentWinner) {
      this.clearDownstreamWinner(match, currentWinner);
    }
  }

  resolveSlot(match: KnockoutMatch, slot: 1 | 2): string {
    const upstreamMatchId = slot === 1 ? match.slot1From : match.slot2From;
    if (upstreamMatchId && this.picks[upstreamMatchId]) {
      return this.picks[upstreamMatchId];
    }

    return slot === 1 ? match.slot1.team : match.slot2.team;
  }

  clearAll(): void {
    this.picks = {};
  }

  isPicked(match: KnockoutMatch, team: string): boolean {
    return this.picks[match.id] === team;
  }

  isLoser(match: KnockoutMatch, team: string): boolean {
    return Boolean(this.picks[match.id]) && this.picks[match.id] !== team && team !== 'TBD';
  }

  flag(team: string): string {
    return getFlag(team);
  }

  rankDisplay(index: number): string {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return String(index + 1);
  }

  trackMatch(_index: number, match: KnockoutMatch): string {
    return match.id;
  }

  private clearDownstreamWinner(match: KnockoutMatch, winner: string): void {
    const downstreamMatch = match.feedsInto ? MATCH_BY_ID[match.feedsInto.matchId] : null;
    if (!downstreamMatch || this.picks[downstreamMatch.id] !== winner) return;

    const nextPicks = { ...this.picks };
    delete nextPicks[downstreamMatch.id];
    this.picks = nextPicks;
    this.clearDownstreamWinner(downstreamMatch, winner);
  }
}
