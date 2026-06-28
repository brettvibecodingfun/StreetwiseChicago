import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap, catchError, of } from 'rxjs';
import { WorldcupService } from './worldcup.service';
import { Participant, WorldCupMatch } from './worldcup.types';
import { ParticipantRowComponent } from './participant-row/participant-row.component';
import { BracketComponent } from './bracket/bracket.component';
import { getFlag } from './flag.util';

export interface TierEntry {
  team: string;
  flag: string;
  count: number;
}

@Component({
  selector: 'app-brettsworldcup',
  imports: [ParticipantRowComponent, BracketComponent],
  templateUrl: './brettsworldcup.component.html',
  styleUrl: './brettsworldcup.component.scss',
})
export class BrettsworldcupComponent implements OnInit, OnDestroy {
  private readonly service = inject(WorldcupService);
  private readonly titleService = inject(Title);
  private readonly previousTitle = this.titleService.getTitle();

  activeTab: 'leaderboard' | 'bracket' = 'leaderboard';

  participants: Participant[] = [];
  todaysMatches: WorldCupMatch[] = [];
  loading = true;
  error: string | null = null;

  tier1Dist: TierEntry[] = [];
  tier2Dist: TierEntry[] = [];
  tier3Dist: TierEntry[] = [];
  tier4Dist: TierEntry[] = [];

  constructor() {
    interval(60_000)
      .pipe(
        startWith(0),
        switchMap(() => this.service.getLiveMatches().pipe(catchError(() => of([])))),
        takeUntilDestroyed()
      )
      .subscribe(matches => {
        this.todaysMatches = this.filterTodaysMatches(matches);
      });
  }

  ngOnInit(): void {
    this.titleService.setTitle('World Cup Pool');
    this.service.getParticipants().subscribe({
      next: p => {
        this.participants = p;
        this.loading = false;
        this.computeDistributions();
      },
      error: () => {
        this.error = 'Could not load leaderboard. Please try again later.';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.titleService.setTitle(this.previousTitle);
  }

  trackByFn(_i: number, p: Participant): number {
    return p.id;
  }

  getLastUpdated(): string | null {
    if (!this.participants.length) return null;
    const latest = this.participants
      .map(p => new Date(p.last_etl_updated_at ?? p.updated_at).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    return latest ? new Date(latest).toLocaleString() : null;
  }

  private computeDistributions(): void {
    this.tier1Dist = this.buildDist(['tier1_team']);
    this.tier2Dist = this.buildDist(['tier2_team_a', 'tier2_team_b']);
    this.tier3Dist = this.buildDist(['tier3_team_a', 'tier3_team_b']);
    this.tier4Dist = this.buildDist(['tier4_team_a', 'tier4_team_b', 'tier4_team_c']);
  }

  private buildDist(fields: (keyof Participant)[]): TierEntry[] {
    const counts: Record<string, number> = {};
    for (const p of this.participants) {
      for (const f of fields) {
        const team = p[f] as string;
        if (team?.trim()) {
          counts[team] = (counts[team] ?? 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .map(([team, count]) => ({ team, flag: getFlag(team), count }))
      .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team));
  }

  private filterTodaysMatches(matches: WorldCupMatch[]): WorldCupMatch[] {
    const today = new Date().toISOString().slice(0, 10);
    return matches.filter(m => {
      const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED';
      const isToday = m.utcDate.slice(0, 10) === today;
      return isLive || isToday;
    });
  }

  matchScore(m: WorldCupMatch): string {
    const h = m.score.fullTime.home;
    const a = m.score.fullTime.away;
    if (h !== null && a !== null) return `${h} – ${a}`;
    return new Date(m.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  matchStatusLabel(m: WorldCupMatch): string {
    if (m.status === 'IN_PLAY' || m.status === 'PAUSED') return 'LIVE';
    if (m.status === 'FINISHED') return 'FT';
    return new Date(m.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  isLive(m: WorldCupMatch): boolean {
    return m.status === 'IN_PLAY' || m.status === 'PAUSED';
  }
}
