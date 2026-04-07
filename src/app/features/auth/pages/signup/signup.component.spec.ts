import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification/notification.service';
import { AuthStore } from '@stores/auth';
import { describe, expect, it, vi } from 'vitest';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  it('shows an error toast for registration failures', async () => {
    const notification = { error: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        {
          provide: AuthStore,
          useValue: { signup: vi.fn().mockRejectedValue(new Error('Failed')) },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SignupComponent());
    const form = (component as unknown as { signupForm: { patchValue: (value: object) => void } })
      .signupForm;
    form.patchValue({
      name: 'Jane',
      email: 'jane@example.com',
      password: 'secret123',
      privacy: true,
    });

    await component.performRegistration();

    expect(notification.error).toHaveBeenCalledOnce();
  });
});
