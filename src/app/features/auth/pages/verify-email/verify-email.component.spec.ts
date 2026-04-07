import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification/notification.service';
import { describe, expect, it, vi } from 'vitest';
import { VerifyEmailComponent } from './verify-email.component';

describe('VerifyEmailComponent', () => {
  it('shows info toast when email is not verified', async () => {
    const notification = { info: vi.fn(), error: vi.fn(), success: vi.fn() };
    const navigate = vi.fn();
    const authMock = {
      currentUser: {
        email: 'user@example.com',
        emailVerified: false,
        reload: vi.fn().mockResolvedValue(undefined),
      },
      signOut: vi.fn(),
    } as unknown as Auth;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: Auth, useValue: authMock },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new VerifyEmailComponent());
    await component.checkVerification();

    expect(notification.info).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });
});
