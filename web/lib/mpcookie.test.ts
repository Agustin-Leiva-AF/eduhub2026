import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cifrarToken, descifrarToken, leerCookie } from './mpcookie';

const SECRETO = 'secreto-de-prueba-largo-y-aleatorio';

test('cookie de MP: cifra y descifra; no filtra el token en claro', () => {
  const v = cifrarToken('APP_USR-1234-token', SECRETO, 3600);
  assert.ok(!v.includes('APP_USR'));
  assert.ok(!Buffer.from(v, 'base64url').toString('utf8').includes('APP_USR'));
  assert.equal(descifrarToken(v, SECRETO), 'APP_USR-1234-token');
  assert.notEqual(cifrarToken('APP_USR-1234-token', SECRETO, 3600), v); // IV aleatorio
});

test('cookie de MP: secreto equivocado, manipulación, expiración y basura dan null', () => {
  const v = cifrarToken('tok', SECRETO, 3600);
  assert.equal(descifrarToken(v, 'otro-secreto'), null);
  const b = Buffer.from(v, 'base64url');
  b[b.length - 1] ^= 1;
  assert.equal(descifrarToken(b.toString('base64url'), SECRETO), null);
  assert.equal(descifrarToken(v, SECRETO, Date.now() + 7200_000), null);
  assert.equal(descifrarToken('xx', SECRETO), null);
  assert.equal(descifrarToken('', SECRETO), null);
});

test('leerCookie extrae por nombre', () => {
  const req = new Request('http://x', { headers: { cookie: 'a=1; mp_token=abc%3D; b=2' } });
  assert.equal(leerCookie(req, 'mp_token'), 'abc=');
  assert.equal(leerCookie(req, 'zzz'), undefined);
});
