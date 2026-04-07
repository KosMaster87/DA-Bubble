import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification/notification.service';
import { AuthStore } from '@stores/auth';
import { describe, expect, it, vi } from 'vitest';
import { SigninComponent } from './signin.component';

describe('SigninComponent', () => {
  it('shows an error toast for login failures', () => {
    const notification = { error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthStore, useValue: {} },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SigninComponent());
    component.handleLoginError(new Error('Invalid credentials'));

    expect(notification.error).toHaveBeenCalledOnce();
  });
});
