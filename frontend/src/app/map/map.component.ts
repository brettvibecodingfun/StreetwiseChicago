import {
  Component,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ElementRef,
  TemplateRef,
  EmbeddedViewRef,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as L from 'leaflet';
import { environment } from '../../environments/environment';
import { ALL_NEIGHBORHOODS, getZipsForNeighborhoods } from './zip-neighborhoods';

interface Inspection {
  inspection_id: string;
  dba_name: string;
  license_: string;
  address: string;
  inspection_date: string;
  inspection_type: string;
  results: string;
  risk: string;
  violations: string;
  latitude: string;
  longitude: string;
}

interface PopupState {
  idx: number;
  inspections: Inspection[];
  marker: L.Marker;
  historyLoaded: boolean;
}

declare global {
  interface Window { __mapNav: (id: string, delta: number) => void; }
}

@Component({
  selector: 'app-map',
  imports: [FormsModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly popupTpl = viewChild.required<TemplateRef<any>>('popupTpl');

  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  private readonly sanitizer = inject(DomSanitizer);

  startDate = '';
  endDate = '';
  resultsFilter: '' | 'Pass' | 'Fail' = '';
  riskHigh = true;
  riskMedium = true;
  riskLow = true;
  zip = '';
  facilityType = '';
  nameSearch = '';

  selectedNeighborhoods: string[] = [];
  neighborhoodSearch = '';
  neighborhoodOpen = false;

  readonly allNeighborhoods = ALL_NEIGHBORHOODS;

  get filteredNeighborhoods(): string[] {
    const q = this.neighborhoodSearch.toLowerCase();
    return q ? this.allNeighborhoods.filter(n => n.toLowerCase().includes(q)) : this.allNeighborhoods;
  }

  toggleNeighborhood(name: string): void {
    const idx = this.selectedNeighborhoods.indexOf(name);
    if (idx === -1) {
      this.selectedNeighborhoods = [...this.selectedNeighborhoods, name];
    } else {
      this.selectedNeighborhoods = this.selectedNeighborhoods.filter(n => n !== name);
    }
  }

  clearNeighborhoods(): void {
    this.selectedNeighborhoods = [];
  }

  loading = false;
  resultCount = 0;
  locationCount = 0;
  errorMessage = '';

  private map!: L.Map;
  private markerLayer!: L.LayerGroup;
  private popupStates = new Map<string, PopupState>();
  private popupViews = new Map<string, EmbeddedViewRef<any>>();

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapContainer().nativeElement, {
        center: [41.8781, -87.6298],
        zoom: 11,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);

      // Nav handler uses direct DOM manipulation — never calls setPopupContent,
      // which would cause Leaflet to re-render and close the popup.
      window.__mapNav = (id: string, delta: number) => {
        const state = this.popupStates.get(id);
        if (!state) return;
        state.idx = (state.idx + delta + state.inspections.length) % state.inspections.length;
        this.updatePopupDom(id, state);
      };
    });

    this.applyFilters();
  }

  ngOnDestroy(): void {
    for (const view of this.popupViews.values()) view.destroy();
    delete (window as any).__mapNav;
    if (this.map) this.map.remove();
  }

  applyFilters(): void {
    this.loading = true;
    this.errorMessage = '';

    const selectedRisks: string[] = [];
    if (this.riskHigh)   selectedRisks.push('Risk 1 (High)');
    if (this.riskMedium) selectedRisks.push('Risk 2 (Medium)');
    if (this.riskLow)    selectedRisks.push('Risk 3 (Low)');

    let params = new HttpParams();
    if (this.startDate)     params = params.set('startDate', this.startDate);
    if (this.endDate)       params = params.set('endDate', this.endDate);
    if (this.resultsFilter) params = params.set('results', this.resultsFilter);
    if (selectedRisks.length > 0 && selectedRisks.length < 3) {
      params = params.set('risk', selectedRisks.join(','));
    }
    if (this.selectedNeighborhoods.length > 0) {
      params = params.set('zip', getZipsForNeighborhoods(this.selectedNeighborhoods).join(','));
    } else if (this.zip) {
      params = params.set('zip', this.zip);
    }
    if (this.facilityType) params = params.set('facilityType', this.facilityType);
    if (this.nameSearch)   params = params.set('name', this.nameSearch);

    this.http
      .get<Inspection[]>(`${environment.apiUrl}/api/map/inspections`, { params })
      .subscribe({
        next: (inspections) => {
          this.zone.runOutsideAngular(() => {
            const groups = this.renderMarkers(inspections);
            this.zone.run(() => {
              this.resultCount = inspections.length;
              this.locationCount = groups;
              this.loading = false;
            });
          });
        },
        error: () => {
          this.zone.run(() => {
            this.loading = false;
            this.errorMessage = 'Failed to load inspection data. Is the backend running?';
          });
        },
      });
  }

  private renderMarkers(inspections: Inspection[]): number {
    this.markerLayer.clearLayers();
    this.popupStates.clear();
    for (const view of this.popupViews.values()) view.destroy();
    this.popupViews.clear();

    const groups = new Map<string, Inspection[]>();
    for (const insp of inspections) {
      const key = insp.license_?.trim() && insp.license_ !== '0'
        ? `lic_${insp.license_}`
        : `loc_${insp.dba_name}|${insp.address}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(insp);
    }

    let idx = 0;
    for (const [, group] of groups) {
      const first = group[0];
      const lat = parseFloat(first.latitude);
      const lng = parseFloat(first.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;

      const id = `g${idx++}`;
      const marker = L.marker([lat, lng], {
        icon: this.buildIcon(this.getMarkerColor(first.results, first.risk)),
      });

      const state: PopupState = { idx: 0, inspections: group, marker, historyLoaded: false };
      this.popupStates.set(id, state);

      // Build popup once — all future updates go through updatePopupDom (DOM only, no setPopupContent)
      marker.bindPopup(this.buildPopupElement(id, state), { maxWidth: 440, minWidth: 400 });

      marker.on('popupopen', () => {
        if (state.historyLoaded) return;
        const license = first.license_?.trim();
        if (!license || license === '0') {
          state.historyLoaded = true;
          return;
        }

        state.historyLoaded = true;

        // Show loading state via DOM — no setPopupContent
        const navBar = document.getElementById(`map-nav-bar-${id}`);
        const navInfo = document.getElementById(`map-nav-info-${id}`);
        if (navBar)  navBar.style.display = 'flex';
        if (navInfo) navInfo.innerHTML = '<em style="color:#888">Loading history…</em>';
        const prevBtn = document.getElementById(`map-prev-${id}`) as HTMLButtonElement | null;
        const nextBtn = document.getElementById(`map-next-${id}`) as HTMLButtonElement | null;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;

        this.http
          .get<Inspection[]>(`${environment.apiUrl}/api/map/inspections`, {
            params: new HttpParams().set('license', license),
          })
          .subscribe({
            next: (all) => {
              if (!all.length) return;
              const anchorId = state.inspections[state.idx].inspection_id;
              const newIdx = all.findIndex(i => i.inspection_id === anchorId);
              state.idx = newIdx >= 0 ? newIdx : 0;
              state.inspections = all;
              // Update popup via DOM — popup stays open
              this.updatePopupDom(id, state);
            },
          });
      });

      marker.addTo(this.markerLayer);
    }

    return groups.size;
  }

  private updatePopupDom(id: string, state: PopupState): void {
    const insp = state.inspections[state.idx];
    const color = this.getMarkerColor(insp.results, insp.risk);
    const total = state.inspections.length;

    const dateStr = insp.inspection_date
      ? new Date(insp.inspection_date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : 'Unknown';

    const set = (elId: string, html: string) => {
      const el = document.getElementById(elId);
      if (el) el.innerHTML = html;
    };

    const navBar = document.getElementById(`map-nav-bar-${id}`);
    if (navBar) navBar.style.display = total > 1 ? 'flex' : 'none';

    set(`map-nav-info-${id}`, `<b>${state.idx + 1}</b> of <b>${total}</b> inspections`);

    const prevBtn = document.getElementById(`map-prev-${id}`) as HTMLButtonElement | null;
    const nextBtn = document.getElementById(`map-next-${id}`) as HTMLButtonElement | null;
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;

    set(`map-insp-date-${id}`, dateStr);
    set(`map-insp-result-${id}`, `<span style="color:${color};font-weight:600">${this.escapeHtml(insp.results ?? 'Unknown')}</span>`);
    set(`map-insp-risk-${id}`, this.escapeHtml(insp.risk ?? 'Unknown'));
    set(`map-insp-type-${id}`, this.escapeHtml(insp.inspection_type ?? 'Unknown'));
    set(`map-violations-${id}`, this.formatViolations(insp.violations));
  }

  private buildPopupElement(id: string, state: PopupState): HTMLElement {
    const insp = state.inspections[state.idx];
    const total = state.inspections.length;
    const color = this.getMarkerColor(insp.results, insp.risk);
    const dateStr = insp.inspection_date
      ? new Date(insp.inspection_date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : 'Unknown';

    const viewRef = this.popupTpl().createEmbeddedView({
      id,
      dbaName:  insp.dba_name ?? 'Unknown',
      address:  insp.address ?? '',
      showNav:  total > 1,
      navIdx:   state.idx + 1,
      total,
      dateStr,
      color,
      result:   insp.results ?? 'Unknown',
      risk:     insp.risk ?? 'Unknown',
      inspType: insp.inspection_type ?? 'Unknown',
      violationsHtml: this.sanitizer.bypassSecurityTrustHtml(
        this.formatViolations(insp.violations)
      ) as SafeHtml,
    });
    viewRef.detectChanges();
    this.popupViews.set(id, viewRef);
    return viewRef.rootNodes[0] as HTMLElement;
  }

  private formatViolations(violations: string): string {
    if (!violations?.trim()) {
      return '<div style="color:#999;font-style:italic;font-size:12px">None recorded</div>';
    }

    const items = violations.split('|').map(s => s.trim()).filter(Boolean);

    return items.map((item, i) => {
      const sep = item.indexOf(' - Comments: ');
      const title   = sep === -1 ? item : item.substring(0, sep).trim();
      const comment = sep === -1 ? '' : item.substring(sep + ' - Comments: '.length).trim();
      const bg = i % 2 === 0 ? '#fafafa' : '#ffffff';

      return `
        <div style="padding:7px 9px;margin-bottom:4px;background:${bg};border-left:3px solid #CC3433;border-radius:0 4px 4px 0;font-size:12px">
          <div style="font-weight:600;color:#333;margin-bottom:${comment ? '3px' : '0'}">${this.escapeHtml(title)}</div>
          ${comment ? `<div style="color:#555;line-height:1.5">${this.escapeHtml(comment)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  private buildIcon(color: string): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;border-radius:50%;background-color:${color};border:1.5px solid rgba(0,0,0,0.4);box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }

  private getMarkerColor(results: string, risk: string): string {
    const isPassing = results?.toLowerCase().startsWith('pass');
    const isFailing = results?.toLowerCase() === 'fail';
    if (isPassing) {
      if (risk === 'Risk 1 (High)')   return '#2d6a2d';
      if (risk === 'Risk 2 (Medium)') return '#5aad5a';
      if (risk === 'Risk 3 (Low)')    return '#a8d8a8';
      return '#5aad5a';
    }
    if (isFailing) {
      if (risk === 'Risk 1 (High)')   return '#cc0000';
      if (risk === 'Risk 2 (Medium)') return '#ff6600';
      if (risk === 'Risk 3 (Low)')    return '#ffcc00';
      return '#cc0000';
    }
    return '#888888';
  }

  private escapeHtml(str: string): string {
    return (str ?? '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
