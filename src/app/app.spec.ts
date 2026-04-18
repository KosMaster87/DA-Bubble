import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { App } from './app';
import { FirebaseService } from './core/services/firebase/firebase.service';
import { HeartbeatService } from './core/services/heartbeat/heartbeat.service';
import { NavigationService } from './core/services/navigation/navigation.service';
import { UserPresenceStore } from './stores';
import { AuthStore } from './stores/auth';

describe('App', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: FirebaseService, useValue: {} },
        {
          provide: HeartbeatService,
          useValue: { startHeartbeat: vi.fn(), stopHeartbeat: vi.fn() },
        },
        { provide: NavigationService, useValue: { handlePageReload: vi.fn() } },
        {
          provide: AuthStore,
          useValue: { isLoggedIn: vi.fn(() => false), user: vi.fn(() => null) },
        },
        {
          provide: UserPresenceStore,
          useValue: { startPresenceListener: vi.fn(() => vi.fn()), clearOnlineUsers: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    // Verify app renders without errors
    expect(compiled).toBeTruthy();
    // Verify router outlet is present
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
