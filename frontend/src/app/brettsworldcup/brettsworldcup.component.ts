import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap, catchError, of } from 'rxjs';
import { WorldcupService } from './worldcup.service';
import { Participant, WorldCupMatch } from './worldcup.types';
import { ParticipantRowComponent } from './participant-row/participant-row.component';

@Component({
  selector: 'app-brettsworldcup',
  imports: [ParticipantRowComponent],
  templateUrl: './brettsworldcup.component.html',
  styleUrl: './brettsworldcup.component.scss',
})
export class BrettsworldcupComponent implements OnInit {
  private readonly service = inject(WorldcupService);

  participants: Participant[] = [];
  todaysMatches: WorldCupMatch[] = [];
  loading = true;
  error: string | null = null;

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
    this.service.getParticipants().subscribe({
      next: p => {
        this.participants = p;
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load leaderboard. Please try again later.';
        this.loading = false;
      },
    });
  }

  trackByFn(_i: number, p: Participant): number {
    return p.id;
  }

  getLastUpdated(): string | null {
    if (!this.participants.length) return null;
    const latest = this.participants
      .map(p => new Date(p.updated_at).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    return latest ? new Date(latest).toLocaleString() : null;
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
