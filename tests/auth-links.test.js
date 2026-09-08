import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNativeAuthLink, readAuthCallbackError } from '../src/features/auth/authLinks.js';

const tokens = '#access_token=test-access&refresh_token=test-refresh&type=signup';

test('OAuth errors are decoded from query strings and fragments', () => {
  assert.equal(
    readAuthCallbackError(
      'https://jpms.example/auth/callback?error_description=Provider+is+disabled',
    ),
    'Provider is disabled',
  );
  assert.match(
    readAuthCallbackError('https://jpms.example/auth/callback#error=access_denied'),
    /cancelled/,
  );
  assert.match(
    readAuthCallbackError(
      'https://jpms.example/auth/callback#error=access_denied&error_code=otp_expired',
    ),
    /expired/,
  );
  assert.match(
    readAuthCallbackError('https://jpms.example/auth/callback?error_code=unexpected_failure'),
    /could not be completed/,
  );
  assert.equal(readAuthCallbackError(`https://jpms.example/auth/callback${tokens}`), null);
  assert.equal(readAuthCallbackError('not a URL'), null);
});

test('native callbacks reject other schemes, hosts, paths and credential-bearing URLs', () => {
  for (const url of [
    'not a URL',
    'https://auth/callback',
    'com.jakaria.jpms://auth.evil/callback',
    'com.jakaria.jpms://auth/callback/extra',
    'com.jakaria.jpms://auth/settings',
    'com.jakaria.jpms://user@auth/callback',
    'com.jakaria.jpms://auth:3000/callback',
  ])
    assert.equal(parseNativeAuthLink(`${url}${tokens}`), null);
});

test('valid native Google callbacks preserve tokens and do not trigger password recovery', () => {
  assert.deepEqual(parseNativeAuthLink(`com.jakaria.jpms://auth/callback${tokens}`), {
    access_token: 'test-access',
    refresh_token: 'test-refresh',
    recovery: false,
  });
});

test('native password recovery remains supported by path and by token type', () => {
  assert.equal(parseNativeAuthLink(`com.jakaria.jpms://auth/recovery${tokens}`).recovery, true);
  assert.equal(
    parseNativeAuthLink(`com.jakaria.jpms://auth/callback${tokens.replace('signup', 'recovery')}`)
      .recovery,
    true,
  );
});

test('cancelled and incomplete native callbacks never return a usable session', () => {
  for (const suffix of [
    '?error=access_denied',
    '#error_description=Provider+disabled',
    '#access_token=test-access',
    '#refresh_token=test-refresh',
    '?access_token=test-access&refresh_token=test-refresh',
    '',
  ]) {
    const result = parseNativeAuthLink(`com.jakaria.jpms://auth/callback${suffix}`);
    assert.equal(typeof result.error, 'string');
    assert.equal(result.access_token, undefined);
    assert.equal(result.refresh_token, undefined);
  }
});
