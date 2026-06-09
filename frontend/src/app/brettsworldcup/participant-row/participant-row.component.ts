import { Component, Input, HostListener } from '@angular/core';
import { Participant } from '../worldcup.types';

const FLAG_MAP: Record<string, string> = {
  'algeria': '🇩🇿',
  'argentina': '🇦🇷',
  'australia': '🇦🇺',
  'austria': '🇦🇹',
  'bahrain': '🇧🇭',
  'belgium': '🇧🇪',
  'bolivia': '🇧🇴',
  'brazil': '🇧🇷',
  'cameroon': '🇨🇲',
  'canada': '🇨🇦',
  'chile': '🇨🇱',
  'colombia': '🇨🇴',
  'comoros': '🇰🇲',
  'congo': '🇨🇩',
  'costa rica': '🇨🇷',
  'croatia': '🇭🇷',
  'czechia': '🇨🇿',
  'czech republic': '🇨🇿',
  'denmark': '🇩🇰',
  'ecuador': '🇪🇨',
  'egypt': '🇪🇬',
  'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'france': '🇫🇷',
  'germany': '🇩🇪',
  'ghana': '🇬🇭',
  'greece': '🇬🇷',
  'honduras': '🇭🇳',
  'hungary': '🇭🇺',
  'iran': '🇮🇷',
  'iraq': '🇮🇶',
  'israel': '🇮🇱',
  'ivory coast': '🇨🇮',
  "côte d'ivoire": '🇨🇮',
  'jamaica': '🇯🇲',
  'japan': '🇯🇵',
  'kuwait': '🇰🇼',
  'mali': '🇲🇱',
  'mexico': '🇲🇽',
  'morocco': '🇲🇦',
  'netherlands': '🇳🇱',
  'new zealand': '🇳🇿',
  'nigeria': '🇳🇬',
  'norway': '🇳🇴',
  'panama': '🇵🇦',
  'paraguay': '🇵🇾',
  'peru': '🇵🇪',
  'poland': '🇵🇱',
  'portugal': '🇵🇹',
  'qatar': '🇶🇦',
  'romania': '🇷🇴',
  'saudi arabia': '🇸🇦',
  'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'senegal': '🇸🇳',
  'serbia': '🇷🇸',
  'slovakia': '🇸🇰',
  'south africa': '🇿🇦',
  'south korea': '🇰🇷',
  'korea republic': '🇰🇷',
  'spain': '🇪🇸',
  'sweden': '🇸🇪',
  'switzerland': '🇨🇭',
  'tunisia': '🇹🇳',
  'turkey': '🇹🇷',
  'türkiye': '🇹🇷',
  'ukraine': '🇺🇦',
  'uruguay': '🇺🇾',
  'usa': '🇺🇸',
  'united states': '🇺🇸',
  'venezuela': '🇻🇪',
  'wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
};

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
    if (!team) return '';
    return FLAG_MAP[team.toLowerCase().trim()] ?? '';
  }
}
