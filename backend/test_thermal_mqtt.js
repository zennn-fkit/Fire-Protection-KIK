/**
 * Test script: Simulasi ESP32 Node1 mengirim data thermal 8x8 pixel via MQTT
 * Jalankan: node test_thermal_mqtt.js
 */
import mqtt from 'mqtt';

const BROKER = 'mqtt://broker.emqx.io:1883';
const TOPIC  = 'projek_orange_pi/sensor/node1';

const client = mqtt.connect(BROKER, {
  clientId: 'test-script-node1-thermal-' + Math.random().toString(16).slice(2, 8),
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
      else { console.log(`📤 Published: ${msg.slice(0, 100)}...`); resolve(); }
    });
  });
}

async function runTest() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Simulasi Data ESP32 Node1 - Thermal Grid 8x8');
  console.log('══════════════════════════════════════════════\n');

  let tick = 0;
  // Kirim data thermal simulasi setiap 1 detik selama 120 detik
  while (tick < 120) {
    const t = tick / 2;
    const cx = 3.5 + 2.0 * Math.sin(t);
    const cy = 3.5 + 2.0 * Math.cos(t * 1.3);

    const mockPixels = Array.from({ length: 64 }, (_, i) => {
      const px = i % 8;
      const py = Math.floor(i / 8);
      const distSq = (px - cx) ** 2 + (py - cy) ** 2;
      const baseTemp = 25.5 + Math.sin(px * 0.5) * 0.5 + (Math.random() - 0.5) * 0.2;
      const hotspotTemp = 28.0 * Math.exp(-distSq / 3.0); // Hotspot peak +28°C
      return +(baseTemp + hotspotTemp).toFixed(1);
    });

    const maxThermal = Math.max(...mockPixels);

    const payload = {
      node_id: 1,
      voltage: 224.5,
      current_amp: 2.45,
      frequency: 50.0,
      power_watt: 550,
      temperature_sht: 28.5,
      humidity: 56.2,
      thermal_pixels: mockPixels,
      thermal_temp: maxThermal,
      co2_ppm: 0.015,
      uv_value: 0
    };

    await publish(payload);
    await sleep(1000);
    tick++;
  }

  console.log('\n✅ Simulasi selesai!');
  client.end();
  process.exit(0);
}
