import { Component } from '@angular/core';
import { LocationComponent } from './location/location.component';

@Component({
  selector: 'app-root',
  imports: [LocationComponent],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <div class="header-brand">
          <img src="chicago-streetwise-logo.png" alt="Chicago Streetwise" class="brand-logo" />
          <div class="brand-text">
            <span class="brand-name">Chicago Streetwise</span>
            <span class="brand-tagline">Location Intelligence</span>
          </div>
        </div>
        <div class="header-right">
          <span class="header-badge">Chicago Open Data</span>
        </div>
      </header>
      <main class="app-body">
        <app-location />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }

    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: oklch(12% 0.03 265);
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: oklch(10% 0.025 265);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0 24px;
      height: 58px;
      flex-shrink: 0;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      height: 36px;
      width: 36px;
      border-radius: 9px;
      object-fit: cover;
      box-shadow: 0 0 18px oklch(55% 0.28 250 / 0.45);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .brand-name {
      font-size: 0.97rem;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.95);
      letter-spacing: 0.01em;
      font-family: var(--font-display);
      line-height: 1;
    }

    .brand-tagline {
      font-size: 0.65rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      line-height: 1;
    }

    .header-right {
      display: flex;
      align-items: center;
    }

    .header-badge {
      font-size: 0.7rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.28);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 5px 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
    }

    .app-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    @media (max-width: 767px) {
      :host { height: auto; min-height: 100dvh; overflow: visible; }
      .app-shell { height: auto; min-height: 100dvh; }
      .app-body { overflow: visible; flex: 0 0 auto; }
      .app-header { padding: 0 14px; height: 52px; }
      .header-badge { display: none; }
      .brand-tagline { display: none; }
    }
  `],
})
export class AppComponent {}
