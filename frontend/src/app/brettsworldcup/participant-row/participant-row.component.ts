import { Component, Input, HostListener } from '@angular/core';
import { Participant } from '../worldcup.types';
import { getFlag } from '../flag.util';

@Component({
  selector: 'app-participant-row',
  imports: [],
  templateUrl: './participant-row.component.html',
  styleUrl: './participant-row.component.scss',
})
export class ParticipantRowComponent {
  @Input() participant!: Participant;
  @Input() rank!: number;

  modalOpen = false;

  openModal(): void {
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }

  get rankDisplay(): string {
    if (this.rank === 1) return '🥇';
    if (this.rank === 2) return '🥈';
    if (this.rank === 3) return '🥉';
    return String(this.rank);
  }

  flag(team: string | null | undefined): string {
    return getFlag(team);
  }

  get breakdownEntries(): { key: string; value: number; label: string }[] {
    return Object.entries(this.participant.points_breakdown ?? {}).map(([key, value]) => ({
      key,
      value,
      label: key === 'champion_bonus'
        ? 'Champion Pick Bonus'
        : key.replace(/_match_\d+$/, '') + ' — match',
    }));
  }
}
