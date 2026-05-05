import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

type WeightKey =
  | 'rideshare' | 'business' | 'footTraffic' | 'streetClosures'
  | 'crime' | 'development' | 'transit' | 'foodSafety' | 'parks' | 'propertySales';

interface Candidate {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

interface CategoryData {
  score: number;
  count: number;
  label: string;
  emoji: string;
  description: string;
}

interface EnrichedCategory {
  cat: CategoryData;
  weightKey: WeightKey;
}

interface WeightPreset {
  id: string;
  label: string;
  emoji: string;
  weights: Record<WeightKey, number>;
}

interface LocationScoreResult {
  address: string;
  lat: number;
  lng: number;
  totalScore: number;
  breakdown: {
    rideshare: CategoryData;
    business: CategoryData;
    footTraffic: CategoryData;
    streetClosures: CategoryData;
    crime: CategoryData;
    development: CategoryData;
    transit: CategoryData;
    foodSafety: CategoryData;
    parks: CategoryData;
    propertySales: CategoryData;
  };
}

@Component({
  selector: 'app-location',
  imports: [FormsModule],
  templateUrl: './location.component.html',
  styleUrl: './location.component.scss',
})
export class LocationComponent {
  private readonly http = inject(HttpClient);

  address = '';
  loading = false;
  result: LocationScoreResult | null = null;
  candidates: Candidate[] = [];
  error = '';
  selectedAddress = '';
  showWeightsModal = false;

  weights: Record<WeightKey, number> = {
    rideshare: 1,
    business: 1,
    footTraffic: 1,
    streetClosures: 1,
    crime: 1,
    development: 1,
    transit: 1,
    foodSafety: 1,
    parks: 1,
    propertySales: 1,
  };

  activePreset: string | null = null;

  readonly presets: WeightPreset[] = [
    {
      id: 'housing',
      label: 'Housing',
      emoji: '🏠',
      weights: {
        rideshare: 0.5, business: 1.5, footTraffic: 0.5, streetClosures: 0.5,
        crime: 3.0, development: 1.0, transit: 2.0, foodSafety: 1.5,
        parks: 2.5, propertySales: 3.0,
      },
    },
    {
      id: 'restaurant',
      label: 'Restaurant',
      emoji: '🍽️',
      weights: {
        rideshare: 2.0, business: 2.5, footTraffic: 3.0, streetClosures: 1.5,
        crime: 2.0, development: 1.0, transit: 1.5, foodSafety: 2.5,
        parks: 0.5, propertySales: 0.5,
      },
    },
    {
      id: 'bar',
      label: 'Bar / Nightlife',
      emoji: '🍺',
      weights: {
        rideshare: 3.0, business: 2.0, footTraffic: 3.0, streetClosures: 2.5,
        crime: 1.5, development: 1.0, transit: 1.5, foodSafety: 0.5,
        parks: 0.5, propertySales: 0.5,
      },
    },
    {
      id: 'office',
      label: 'Office Space',
      emoji: '💼',
      weights: {
        rideshare: 1.0, business: 2.0, footTraffic: 1.5, streetClosures: 0.5,
        crime: 2.5, development: 2.5, transit: 3.0, foodSafety: 0.5,
        parks: 1.0, propertySales: 1.5,
      },
    },
    {
      id: 'retail',
      label: 'Retail',
      emoji: '🛍️',
      weights: {
        rideshare: 2.0, business: 2.5, footTraffic: 3.0, streetClosures: 1.5,
        crime: 2.5, development: 1.5, transit: 2.0, foodSafety: 0.5,
        parks: 0.5, propertySales: 1.0,
      },
    },
  ];

  readonly weightConfig: Array<{ key: WeightKey; label: string; emoji: string; hint: string }> = [
    { key: 'rideshare',      label: 'Rideshare Demand',      emoji: '🚗', hint: 'Uber/Lyft pickup volume nearby' },
    { key: 'business',       label: 'Business Activity',     emoji: '🏪', hint: 'Active business licenses in the area' },
    { key: 'footTraffic',    label: 'Foot Traffic',          emoji: '🚶', hint: '311 requests as pedestrian activity proxy' },
    { key: 'streetClosures', label: 'Street Closures',       emoji: '🚧', hint: 'Events & festivals vs. construction closures' },
    { key: 'crime',          label: 'Crime Safety',          emoji: '🔒', hint: 'Incident rate normalized by local activity' },
    { key: 'development',    label: 'Development Activity',  emoji: '🏗️', hint: 'New construction & renovation permits' },
    { key: 'transit',        label: 'Transit Access',        emoji: '🚇', hint: 'CTA L station ridership & proximity' },
    { key: 'foodSafety',     label: 'Food Safety',           emoji: '🍽️', hint: 'Failed restaurant inspections nearby' },
    { key: 'parks',          label: 'Green Space',           emoji: '🌳', hint: 'Park access & Lake Michigan proximity' },
    { key: 'propertySales',  label: 'Property Market',       emoji: '🏠', hint: 'Neighborhood residential sales volume' },
  ];

  readonly examples = [
    '1925 N Lincoln Ave',
    '35 W Wacker Dr',
    '2970 N Lake Shore Dr',
    '1925 W Cortland St',
  ];

  readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  readonly circumference = 2 * Math.PI * 70;
  readonly maxScore = 50;

  get hasCustomWeights(): boolean {
    return Object.values(this.weights).some(w => w !== 1);
  }

  get weightedTotalScore(): number {
    if (!this.result) return 0;
    const b = this.result.breakdown;
    const entries: Array<[number, WeightKey]> = [
      [b.rideshare.score,      'rideshare'],
      [b.business.score,       'business'],
      [b.footTraffic.score,    'footTraffic'],
      [b.streetClosures.score, 'streetClosures'],
      [b.crime.score,          'crime'],
      [b.development.score,    'development'],
      [b.transit.score,        'transit'],
      [b.foodSafety.score,     'foodSafety'],
      [b.parks.score,          'parks'],
      [b.propertySales.score,  'propertySales'],
    ];

    let weightedSum = 0;
    let totalWeight = 0;
    const count = entries.length;

    for (const [score, key] of entries) {
      const w = this.weights[key];
      weightedSum += score * w;
      totalWeight += w;
    }

    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / totalWeight * count) * 10) / 10;
  }

  get gaugeColor(): string {
    if (!this.result) return '#ffffff';
    const s = this.weightedTotalScore;
    if (s >= 32) return '#22c55e';
    if (s >= 21) return '#f59e0b';
    return '#CC3433';
  }

  get scoreGrade(): string {
    if (!this.result) return '';
    const s = this.weightedTotalScore;
    if (s >= 43.0) return 'A+';
    if (s >= 40.0) return 'A';
    if (s >= 32.0) return 'B+';
    if (s >= 29.0) return 'B';
    if (s >= 22.0) return 'C+';
    if (s >= 20.0) return 'C';
    if (s >= 13.0) return 'D';
    return 'F';
  }

  get gaugeOffset(): number {
    if (!this.result) return this.circumference;
    return this.circumference * (1 - this.weightedTotalScore / this.maxScore);
  }

  get shortAddress(): string {
    if (!this.result) return '';
    return this.result.address.split(',').slice(0, 3).join(',').trim();
  }

  get enrichedCategoryList(): EnrichedCategory[] {
    if (!this.result) return [];
    const b = this.result.breakdown;
    return [
      { cat: b.rideshare,      weightKey: 'rideshare' },
      { cat: b.business,       weightKey: 'business' },
      { cat: b.footTraffic,    weightKey: 'footTraffic' },
      { cat: b.streetClosures, weightKey: 'streetClosures' },
      { cat: b.crime,          weightKey: 'crime' },
      { cat: b.development,    weightKey: 'development' },
      { cat: b.transit,        weightKey: 'transit' },
      { cat: b.foodSafety,     weightKey: 'foodSafety' },
      { cat: b.parks,          weightKey: 'parks' },
      { cat: b.propertySales,  weightKey: 'propertySales' },
    ];
  }

  catColor(score: number): string {
    if (score >= 3.5) return '#22c55e';
    if (score >= 2.0) return '#f59e0b';
    return '#CC3433';
  }

  catBarWidth(score: number): number {
    return (score / 5) * 100;
  }

  catLabel(score: number): string {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Good';
    if (score >= 2.0) return 'Average';
    if (score >= 1.0) return 'Below Avg';
    return 'Poor';
  }

  formatWeight(w: number): string {
    if (w === 0) return 'Off';
    if (w === 1) return 'Normal';
    return `${w.toFixed(1)}×`;
  }

  openWeightsModal(): void {
    this.showWeightsModal = true;
  }

  closeWeightsModal(): void {
    this.showWeightsModal = false;
  }

  applyPreset(preset: WeightPreset): void {
    this.weights = { ...preset.weights };
    this.activePreset = preset.id;
  }

  onWeightChange(): void {
    this.activePreset = null;
  }

  resetWeights(): void {
    for (const key of Object.keys(this.weights) as WeightKey[]) {
      this.weights[key] = 1;
    }
    this.activePreset = null;
  }

  setExample(addr: string): void {
    this.address = addr;
    this.analyze();
  }

  analyze(): void {
    if (!this.address.trim() || this.loading) return;
    this.loading = true;
    this.error = '';
    this.result = null;
    this.candidates = [];

    this.http
      .get<{ candidates: Candidate[] }>(
        `${environment.apiUrl}/api/location-resolve?q=${encodeURIComponent(this.address.trim())}`
      )
      .subscribe({
        next: ({ candidates }) => {
          if (candidates.length === 1) {
            this.scoreCandidate(candidates[0]);
          } else {
            this.candidates = candidates;
            this.loading = false;
          }
        },
        error: (err) => {
          this.error =
            err?.error?.error ?? 'Location not found. Try a full address or add a neighborhood.';
          this.loading = false;
        },
      });
  }

  scoreCandidate(candidate: Candidate): void {
    this.candidates = [];
    this.selectedAddress = candidate.address.trim();
    this.loading = true;
    this.http
      .post<LocationScoreResult>(`${environment.apiUrl}/api/location-score`, {
        lat: candidate.lat,
        lng: candidate.lng,
        displayName: candidate.name,
        address: candidate.address.trim(),
      })
      .subscribe({
        next: (data) => {
          this.result = data;
          this.loading = false;
        },
        error: (err) => {
          this.error =
            err?.error?.error ?? 'Failed to analyze location. Please try again.';
          this.loading = false;
        },
      });
  }
}
