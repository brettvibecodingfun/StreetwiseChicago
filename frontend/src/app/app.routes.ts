import { Routes } from '@angular/router';
import { LocationComponent } from './location/location.component';

export const routes: Routes = [
  { path: '', component: LocationComponent },
  {
    path: 'brettsworldcup',
    loadComponent: () =>
      import('./brettsworldcup/brettsworldcup.component').then(
        m => m.BrettsworldcupComponent
      ),
  },
];
