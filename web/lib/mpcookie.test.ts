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

test('cookie de MP: guarda vía y cuenta; sin secreto en desarrollo hay uno efímero estable, en producción null', async () => {
  const { descifrarCookie, secretoCookie } = await import('./mpcookie');
  const v = cifrarToken('tok', SECRETO, 3600, Date.now(), { via: 'token', cuenta: { id: 5, apodo: 'YO' } });
  assert.deepEqual(descifrarCookie(v, SECRETO), { token: 'tok', via: 'token', cuenta: { id: 5, apodo: 'YO' } });
  assert.equal(descifrarCookie(cifrarToken('t', SECRETO, 60), SECRETO)?.via, 'oauth');
  const env = process.env as Record<string, string | undefined>;
  const [s0, n0] = [env.MP_COOKIE_SECRET, env.NODE_ENV];
  try {
    delete env.MP_COOKIE_SECRET;
    env.NODE_ENV = 'development';
    const a = secretoCookie();
    assert.ok(a && a.length >= 32 && a === secretoCookie());
    env.NODE_ENV = 'production';
    assert.equal(secretoCookie(), null);
  } finally { env.MP_COOKIE_SECRET = s0; env.NODE_ENV = n0; if (s0 === undefined) delete env.MP_COOKIE_SECRET; }
});
