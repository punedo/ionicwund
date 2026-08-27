import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  peopleOutline, 
  listOutline, 
  addCircleOutline, 
  medkitOutline, 
  bandageOutline, 
  thermometerOutline, 
  calendarOutline, 
  documentTextOutline, 
  cartOutline, 
  cubeOutline, 
  personOutline, 
  settingsOutline, 
  shieldOutline, 
  keyOutline, 
  cogOutline, 
  chevronDownOutline, 
  chevronUpOutline,
  logOutOutline
} from 'ionicons/icons';
import { authInterceptor } from './app/interceptors/auth.interceptor';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// Register icons
addIcons({
  'home-outline': homeOutline,
  'people-outline': peopleOutline,
  'list-outline': listOutline,
  'add-circle-outline': addCircleOutline,
  'medkit-outline': medkitOutline,
  'bandage-outline': bandageOutline,
  'thermometer-outline': thermometerOutline,
  'calendar-outline': calendarOutline,
  'document-text-outline': documentTextOutline,
  'cart-outline': cartOutline,
  'cube-outline': cubeOutline,
  'person-outline': personOutline,
  'settings-outline': settingsOutline,
  'shield-outline': shieldOutline,
  'key-outline': keyOutline,
  'cog-outline': cogOutline,
  'chevron-down-outline': chevronDownOutline,
  'chevron-up-outline': chevronUpOutline,
  'log-out-outline': logOutOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
});
