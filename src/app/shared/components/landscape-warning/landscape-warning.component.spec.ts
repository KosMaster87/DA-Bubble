import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification/notification.service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandscapeWarningComponent } from './landscape-warning.component';

describe('LandscapeWarningComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows info toast when install prompt is unavailable', async () => {
    const notification = { info: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LandscapeWarningComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LandscapeWarningComponent);
    const component = fixture.componentInstance as unknown as {
      deferredPrompt: unknown;
      installPWA: () => Promise<void>;
    };

    component.deferredPrompt = null;
    await component.installPWA();

    expect(notification.info).toHaveBeenCalledOnce();
  });
});
