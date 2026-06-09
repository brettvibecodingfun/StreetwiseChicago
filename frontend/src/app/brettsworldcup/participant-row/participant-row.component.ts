import { Component, Input } from '@angular/core';
import { Participant } from '../worldcup.types';

@Component({
  selector: 'app-participant-row',
  imports: [],
  templateUrl: './participant-row.component.html',
  styleUrl: './participant-row.component.scss',
})
export class ParticipantRowComponent {
  @Input() participant!: Participant;
  @Input() rank!: number;

  expanded = false;

  toggle(): void {
    this.expanded = !this.expanded;
  }

  get rankDisplay(): string {
    if (this.rank === 1) return '🥇';
    if (this.rank === 2) return '🥈';
    if (this.rank === 3) return '🥉';
    return String(this.rank);
  }
}
