/**
 * Test script: Simulasi ESP32 Node2 mengirim data smoke via MQTT
 * Jalankan: node test_smoke_mqtt.js
 */
import mqtt from 'mqtt';

const BROKER = 'mqtt://broker.emqx.io:1883';
const TOPIC  = 'projek_orange_pi/sensor/node2';

const client = mqtt.connect(BROKER, {
  clientId: 'test-script-node2-' + Math.random().toString(16).slice(2, 8),
  clean: true,
  connectTimeout: 10000,
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  runTest();
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
  process.exit(1);
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function publish(payload) {
  return new Promise((resolve, reject) => {
    const msg = JSON.stringify(payload);
    client.publish(TOPIC, msg, { qos: 1 }, (err) => {
      if (err) { console.error('❌ Publish failed:', err); reject(err); }
      else { console.log(`📤 Published: ${msg}`); resolve(); }
    });
  });
}

async function runTest() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Simulasi Data ESP32 Node2 - Smoke Detector');
  console.log('══════════════════════════════════════════════\n');

  // ── FASE 1: Kirim status NORMAL (state_smoke = false) ──────────
  console.log('🟢 FASE 1: Mengirim status NORMAL (state_smoke: false)...');
  console.log('   → Ekspektasi: Card berubah ke "Aktif - Aman" (hijau)\n');
  for (let i = 0; i < 3; i++) {
    await publish({ node_smoke: 1, state_smoke: false });
    await sleep(1000);
  }

  // ── Jeda ──────────────────────────────────────────────────────
  console.log('\n⏳ Menunggu 5 detik sebelum simulasi ALARM...\n');
  await sleep(5000);

  // ── FASE 2: Kirim status DANGER (state_smoke = true) ──────────
  console.log('🔴 FASE 2: Mengirim status ALARM (state_smoke: true)...');
  console.log('   → Ekspektasi: Card berubah ke "Aktif - Bahaya" (merah)\n');
  for (let i = 0; i < 5; i++) {
    await publish({ node_smoke: 1, state_smoke: true });
    await sleep(1000);
  }

  // ── Jeda ──────────────────────────────────────────────────────
  console.log('\n⏳ Menunggu 5 detik sebelum kembali ke NORMAL...\n');
  await sleep(5000);

  // ── FASE 3: Kembali ke NORMAL ──────────────────────────────────
  console.log('🟢 FASE 3: Kembali ke status NORMAL...');
  console.log('   → Ekspektasi: Card kembali ke "Aktif - Aman" (hijau)\n');
  for (let i = 0; i < 3; i++) {
    await publish({ node_smoke: 1, state_smoke: false });
    await sleep(1000);
  }

  console.log('\n✅ Test selesai! Cek dashboard di http://localhost:5173/monitoring → tab Bangunan');
  client.end();
  process.exit(0);
}
