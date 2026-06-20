import { describe, it, expect } from 'vitest';
import { isPrivateHost } from './server/ai-shared.js';

describe('isPrivateHost', () => {
  it('blocks loopback and private IPv4 literals', () => {
    expect(isPrivateHost('127.0.0.1')).toBe(true);
    expect(isPrivateHost('10.0.0.5')).toBe(true);
    expect(isPrivateHost('172.16.0.1')).toBe(true);
    expect(isPrivateHost('172.31.255.255')).toBe(true);
    expect(isPrivateHost('192.168.1.1')).toBe(true);
    expect(isPrivateHost('169.254.1.1')).toBe(true);
    expect(isPrivateHost('0.0.0.0')).toBe(true);
  });

  it('blocks IPv6 loopback and link-local', () => {
    expect(isPrivateHost('::1')).toBe(true);
    expect(isPrivateHost('[::1]')).toBe(true);
    expect(isPrivateHost('[::]')).toBe(true);
    expect(isPrivateHost('fc00::1')).toBe(true);
    expect(isPrivateHost('fe80::1')).toBe(true);
  });

  it('blocks the localhost hostname and its variants', () => {
    expect(isPrivateHost('localhost')).toBe(true);
    expect(isPrivateHost('LOCALHOST')).toBe(true);
    expect(isPrivateHost('localhost.localdomain')).toBe(true);
    expect(isPrivateHost('api.localhost')).toBe(true);
  });

  it('allows public hosts', () => {
    expect(isPrivateHost('api.openai.com')).toBe(false);
    expect(isPrivateHost('api.anthropic.com')).toBe(false);
    expect(isPrivateHost('example.com')).toBe(false);
    expect(isPrivateHost('8.8.8.8')).toBe(false);
    expect(isPrivateHost('172.32.0.1')).toBe(false);
  });
});
