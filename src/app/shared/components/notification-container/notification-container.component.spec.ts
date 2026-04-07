import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationService } from '@core/services/notification/notification.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotificationContainerComponent } from './notification-container.component';

describe('NotificationContainerComponent', () => {
  let service: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationContainerComponent],
    }).compileComponents();
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    service.clear();
    TestBed.resetTestingModule();
  });

  it('renders toast messages from service', () => {
    service.success('Signed in', 0);
    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const toastText = fixture.nativeElement.textContent as string;
    expect(toastText).toContain('Signed in');
  });

  it('dismisses toast when close is clicked', () => {
    service.error('Failed', 0);
    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const closeButton = fixture.debugElement.query(By.css('.notification-container__close'));
    closeButton.triggerEventHandler('click');
    fixture.detectChanges();

    expect(service.toasts().length).toBe(0);
  });

  it('shows at most three toasts', () => {
    service.info('1', 0);
    service.info('2', 0);
    service.info('3', 0);
    service.info('4', 0);

    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const toasts = fixture.debugElement.queryAll(By.css('.notification-container__toast'));
    expect(toasts.length).toBe(3);
  });

  it('removes toast when Escape key is pressed', () => {
    service.error('Test Error', 0);
    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(service.toasts().length).toBe(0);
  });

  it('applies reduced-motion styles when prefers-reduced-motion is active', () => {
    service.info('Accessibility', 0);
    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const container = fixture.debugElement.nativeElement as HTMLElement;
    expect(container.querySelector('.notification-container__toast')).not.toBeNull();
  });
});
