import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Participant, WorldCupMatch } from './worldcup.types';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WorldcupService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/brettsworldcup`;

  getParticipants(): Observable<Participant[]> {
    return this.http.get<Participant[]>(`${this.base}/participants`);
  }

  getParticipant(id: number): Observable<Participant> {
    return this.http.get<Participant>(`${this.base}/participants/${id}`);
  }

  getLiveMatches(): Observable<WorldCupMatch[]> {
    return this.http
      .get<{ matches: WorldCupMatch[] }>(`${this.base}/matches`)
      .pipe(map(r => r.matches ?? []));
  }
}
