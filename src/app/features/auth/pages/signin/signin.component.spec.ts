import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { notificationCopy } from '@core/services/notification/notification-copy';
import { NotificationService } from '@core/services/notification/notification.service';
import { AuthStore } from '@stores/auth';
import { describe, expect, it, vi } from 'vitest';
import { SigninComponent } from './signin.component';

describe('SigninComponent', () => {
  it('shows signed-out info toast when redirected from logout', () => {
    const notification = { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };
    const router = {
      navigate: vi.fn().mockResolvedValue(true),
      currentNavigation: vi.fn().mockReturnValue({
        extras: { state: { signedOut: true } },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthStore, useValue: {} },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: notification },
      ],
    });

    TestBed.runInInjectionContext(() => new SigninComponent());

    expect(notification.info).toHaveBeenCalledWith(notificationCopy.signedOutInfo);
  });

  it('shows a success toast for successful email login', async () => {
    vi.useFakeTimers();

    const notification = { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };
    const authStore = { loginWithEmail: vi.fn().mockResolvedValue(undefined) };
    const router = {
      navigate: vi.fn().mockResolvedValue(true),
      currentNavigation: vi.fn().mockReturnValue(null),
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthStore, useValue: authStore },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SigninComponent());
    const form = (component as unknown as { signinForm: { patchValue: (value: object) => void } })
      .signinForm;
    form.patchValue({ email: 'jane@example.com', password: 'secret123' });

    const loginPromise = component.performEmailLogin();

    await Promise.resolve();

    expect(notification.success).toHaveBeenCalledWith(notificationCopy.signinSuccessEmail);
    expect(router.navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(220);
    await loginPromise;

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);

    vi.useRealTimers();
  });

  it('shows warning toast when signin form is invalid', async () => {
    const notification = { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthStore, useValue: {} },
        {
          provide: Router,
          useValue: { navigate: vi.fn(), currentNavigation: vi.fn().mockReturnValue(null) },
        },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SigninComponent());

    await component.onSubmit();

    expect(notification.warning).toHaveBeenCalledWith(notificationCopy.authFormInvalid);
  });

  it('does not show success toast or navigate on failed email login', async () => {
    vi.useFakeTimers();

    const notification = { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };
    const authStore = {
      loginWithEmail: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
    };
    const router = {
      navigate: vi.fn().mockResolvedValue(true),
      currentNavigation: vi.fn().mockReturnValue(null),
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthStore, useValue: authStore },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SigninComponent());
    const form = (component as unknown as { signinForm: { patchValue: (value: object) => void } })
      .signinForm;
    form.patchValue({ email: 'jane@example.com', password: 'wrongpw' });

    await component.performEmailLogin();

    expect(notification.success).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(notification.error).toHaveBeenCalledOnce();

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows an error toast for login failures', () => {
    const notification = { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthStore, useValue: {} },
        {
          provide: Router,
          useValue: { navigate: vi.fn(), currentNavigation: vi.fn().mockReturnValue(null) },
        },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SigninComponent());
    component.handleLoginError(new Error('Invalid credentials'));

    expect(notification.error).toHaveBeenCalledOnce();
  });
});
