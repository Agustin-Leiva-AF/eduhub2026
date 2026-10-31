// Genera las claves VAPID para las notificaciones del navegador/teléfono. Uso: npm run vapid
// Pegá las tres líneas en web/.env.local (nunca las subas al repo).
import webpush from 'web-push';

const k = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${k.privateKey}`);
console.log('VAPID_SUBJECT=mailto:tu-mail@ejemplo.com');
console.log('\n# Opcional, WhatsApp o SMS por Twilio:');
console.log('# TWILIO_ACCOUNT_SID=AC...\n# TWILIO_AUTH_TOKEN=...\n# TWILIO_FROM=whatsapp:+14155238886   (sandbox de WhatsApp) o +1XXXXXXXXXX (SMS)');
console.log('\n# Protege /api/avisos/despachar (el cron manda: Authorization: Bearer <valor>):');
console.log('# CRON_SECRET=una-clave-larga-al-azar');
