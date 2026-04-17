import { User } from '@core/models/user.model';
import { describe, expect, it } from 'vitest';
import { UserStateHelper } from './user-state.helper';

const makeUser = (uid: string, displayName = 'Test'): User =>
  ({ uid, displayName, email: `${uid}@test.com` }) as User;

describe('UserStateHelper.updateUserInArray', () => {
  it('updates the matching user', () => {
    const users = [makeUser('a'), makeUser('b')];
    const result = UserStateHelper.updateUserInArray(users, 'a', { displayName: 'Updated' });
    expect(result.find((u) => u.uid === 'a')?.displayName).toBe('Updated');
  });

  it('leaves other users unchanged', () => {
    const users = [makeUser('a'), makeUser('b')];
    const result = UserStateHelper.updateUserInArray(users, 'a', { displayName: 'X' });
    expect(result.find((u) => u.uid === 'b')?.displayName).toBe('Test');
  });

  it('returns unchanged array when uid not found', () => {
    const users = [makeUser('a')];
    const result = UserStateHelper.updateUserInArray(users, 'z', { displayName: 'X' });
    expect(result).toEqual(users);
  });
});

describe('UserStateHelper.removeUserFromArray', () => {
  it('removes user with matching uid', () => {
    const users = [makeUser('a'), makeUser('b')];
    const result = UserStateHelper.removeUserFromArray(users, 'a');
    expect(result.length).toBe(1);
    expect(result[0].uid).toBe('b');
  });

  it('returns unchanged array when uid not found', () => {
    const users = [makeUser('a')];
    const result = UserStateHelper.removeUserFromArray(users, 'z');
    expect(result.length).toBe(1);
  });
});

describe('UserStateHelper.appendUser', () => {
  it('appends the new user to the end', () => {
    const users = [makeUser('a')];
    const result = UserStateHelper.appendUser(users, makeUser('b'));
    expect(result.length).toBe(2);
    expect(result[1].uid).toBe('b');
  });

  it('does not mutate the original array', () => {
    const users = [makeUser('a')];
    UserStateHelper.appendUser(users, makeUser('b'));
    expect(users.length).toBe(1);
  });
});

describe('UserStateHelper.isPermissionError', () => {
  it('returns true for permission-denied code', () => {
    expect(UserStateHelper.isPermissionError({ code: 'permission-denied' })).toBe(true);
  });

  it('returns true when message includes "permissions"', () => {
    expect(
      UserStateHelper.isPermissionError({ message: 'Missing or insufficient permissions' }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(UserStateHelper.isPermissionError(new Error('other'))).toBe(false);
    expect(UserStateHelper.isPermissionError(null)).toBe(false);
  });
});
