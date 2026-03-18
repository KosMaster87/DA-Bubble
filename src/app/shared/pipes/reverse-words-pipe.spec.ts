import { ReverseWordsPipe } from './reverse-words-pipe';

describe('ReverseWordsPipe', () => {
  let pipe: ReverseWordsPipe;

  beforeEach(() => {
    pipe = new ReverseWordsPipe();
  });

  it('should create the pipe', () => {
    expect(pipe).toBeTruthy();
  });

  it('should reverse each word individually', () => {
    expect(pipe.transform('Hello World')).toBe('olleH dlroW');
  });

  it('should reverse a single word', () => {
    expect(pipe.transform('Angular')).toBe('ralugnA');
  });

  it('should handle an empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('should return empty string for null input', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should preserve spaces between words', () => {
    expect(pipe.transform('Angular Signals')).toBe('ralugnA slangS');
  });

  it('should preserve multiple spaces between words while reversing each word', () => {
    expect(pipe.transform('hello  world')).toBe('olleh  dlrow');
  });
});
