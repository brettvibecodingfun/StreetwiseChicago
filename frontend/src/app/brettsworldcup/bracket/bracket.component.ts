import { Component, Input, OnChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
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
import { Participant, WorldCupMatch } from '../worldcup.types';
import { WorldcupService } from '../worldcup.service';

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

const API_NAME_MAP: Record<string, string> = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  Türkiye: 'Turkey',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast',
  'Congo DR': 'DR Congo',
  'Cape Verde Islands': 'Cape Verde',
};

@Component({
  selector: 'app-bracket',
  imports: [],
  templateUrl: './bracket.component.html',
  styleUrl: './bracket.component.scss',
})
export class BracketComponent implements OnChanges {
  private readonly service = inject(WorldcupService);

  @Input() participants: Participant[] = [];

  picks: Record<string, string> = {};
  officialPicks: Record<string, string> = {};

  readonly roundColumns: RoundColumn[] = ROUNDS_ORDER.map(round => ({
    round,
    label: ROUND_LABELS[round],
    points: ROUND_POINTS[round],
    matches: KNOCKOUT_MATCHES.filter(match => match.round === round),
  }));

  private realRankOrder: number[] = [];

  constructor() {
    interval(60_000)
      .pipe(
        startWith(0),
        switchMap(() => this.service.getLiveMatches().pipe(catchError(() => of([])))),
        takeUntilDestroyed()
      )
      .subscribe(matches => {
        this.syncOfficialResults(matches);
      });
  }

  ngOnChanges(): void {
    this.realRankOrder = [...this.participants]
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map(participant => participant.id);
  }

  get hasAnyPick(): boolean {
    return Object.keys(this.picks).length > 0;
  }

  get champion(): string | null {
    return this.getWinner('f_1');
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
      if (!match || winner === 'TBD' || this.isLocked(match)) continue;

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
    if (team === 'TBD' || this.isLocked(match)) return;

    const currentWinner = this.getWinner(match.id);

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
    return this.resolveSlotFromPicks(match, slot, this.combinedPicks);
  }

  isPicked(match: KnockoutMatch, team: string): boolean {
    return this.getWinner(match.id) === team;
  }

  isLoser(match: KnockoutMatch, team: string): boolean {
    const winner = this.getWinner(match.id);
    return Boolean(winner) && winner !== team && team !== 'TBD';
  }

  isLocked(match: KnockoutMatch): boolean {
    return this.officialPicks[match.id] !== undefined;
  }

  getWinner(matchId: string): string | null {
    return this.officialPicks[matchId] ?? this.picks[matchId] ?? null;
  }

  get hasOfficialResults(): boolean {
    return Object.keys(this.officialPicks).length > 0;
  }

  clearAll(): void {
    this.picks = {};
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

  private get combinedPicks(): Record<string, string> {
    return {
      ...this.picks,
      ...this.officialPicks,
    };
  }

  private resolveSlotFromPicks(match: KnockoutMatch, slot: 1 | 2, picks: Record<string, string>): string {
    const upstreamMatchId = slot === 1 ? match.slot1From : match.slot2From;
    if (upstreamMatchId && picks[upstreamMatchId]) {
      return picks[upstreamMatchId];
    }

    return slot === 1 ? match.slot1.team : match.slot2.team;
  }

  private syncOfficialResults(matches: WorldCupMatch[]): void {
    const nextOfficialPicks: Record<string, string> = {};
    const finishedKnockoutMatches = matches
      .filter(match => match.status === 'FINISHED' && ROUNDS_ORDER.includes(match.stage as KnockoutRound))
      .sort((a, b) => ROUNDS_ORDER.indexOf(a.stage as KnockoutRound) - ROUNDS_ORDER.indexOf(b.stage as KnockoutRound));

    for (const apiMatch of finishedKnockoutMatches) {
      const winner = this.getOfficialWinner(apiMatch);
      if (!winner) continue;

      const bracketMatch = this.findBracketMatch(apiMatch, nextOfficialPicks);
      if (bracketMatch) {
        nextOfficialPicks[bracketMatch.id] = winner;
      }
    }

    this.officialPicks = nextOfficialPicks;
    this.removeInvalidUserPicks();
  }

  private clearDownstreamWinner(match: KnockoutMatch, winner: string): void {
    const downstreamMatch = match.feedsInto ? MATCH_BY_ID[match.feedsInto.matchId] : null;
    if (!downstreamMatch || this.picks[downstreamMatch.id] !== winner) return;

    const nextPicks = { ...this.picks };
    delete nextPicks[downstreamMatch.id];
    this.picks = nextPicks;
    this.clearDownstreamWinner(downstreamMatch, winner);
  }

  private findBracketMatch(apiMatch: WorldCupMatch, officialPicks: Record<string, string>): KnockoutMatch | null {
    const byId = KNOCKOUT_MATCHES.find(match => match.footballDataId === apiMatch.id);
    if (byId) return byId;

    const home = this.normalizeTeam(apiMatch.homeTeam?.name);
    const away = this.normalizeTeam(apiMatch.awayTeam?.name);
    if (!home || !away) return null;

    return KNOCKOUT_MATCHES.find(match => {
      if (match.round !== apiMatch.stage) return false;

      const slot1 = this.resolveSlotFromPicks(match, 1, officialPicks);
      const slot2 = this.resolveSlotFromPicks(match, 2, officialPicks);
      return (slot1 === home && slot2 === away) || (slot1 === away && slot2 === home);
    }) ?? null;
  }

  private getOfficialWinner(match: WorldCupMatch): string | null {
    if (match.score.winner === 'HOME_TEAM') return this.normalizeTeam(match.homeTeam?.name);
    if (match.score.winner === 'AWAY_TEAM') return this.normalizeTeam(match.awayTeam?.name);
    return null;
  }

  private normalizeTeam(team: string | null | undefined): string {
    if (!team) return '';
    return API_NAME_MAP[team] ?? team;
  }

  private removeInvalidUserPicks(): void {
    let nextPicks = { ...this.picks };

    for (const matchId of Object.keys(this.officialPicks)) {
      delete nextPicks[matchId];
    }

    let changed = true;
    while (changed) {
      changed = false;

      for (const [matchId, pick] of Object.entries(nextPicks)) {
        const match = MATCH_BY_ID[matchId];
        if (!match) {
          delete nextPicks[matchId];
          changed = true;
          continue;
        }

        const slot1 = this.resolveSlotFromPicks(match, 1, { ...nextPicks, ...this.officialPicks });
        const slot2 = this.resolveSlotFromPicks(match, 2, { ...nextPicks, ...this.officialPicks });
        if (pick !== slot1 && pick !== slot2) {
          delete nextPicks[matchId];
          changed = true;
        }
      }
    }

    this.picks = nextPicks;
  }
}
