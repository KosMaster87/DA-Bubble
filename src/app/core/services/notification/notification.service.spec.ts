import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    service.clear();
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('adds and auto-dismisses a toast', () => {
    service.success('Saved');

    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(4000);

    expect(service.toasts().length).toBe(0);
  });

  it('removes toast manually', () => {
    const toastId = service.error('Broken', 0);

    expect(service.toasts().length).toBe(1);
    service.remove(toastId);

    expect(service.toasts().length).toBe(0);
  });

  it('clears all toasts', () => {
    service.info('One', 0);
    service.warning('Two', 0);

    expect(service.toasts().length).toBe(2);
    service.clear();

    expect(service.toasts().length).toBe(0);
  });

  it('returns visible toasts with max limit', () => {
    service.info('1', 0);
    service.info('2', 0);
    service.info('3', 0);
    service.info('4', 0);

    expect(service.getVisible(3).length).toBe(3);
  });
});
