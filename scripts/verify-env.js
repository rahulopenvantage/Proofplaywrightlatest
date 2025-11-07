import 'dotenv/config';

const keys = [
  'ADMIN_MS_USERNAME',
  'ADMIN_MS_PASSWORD',
  'NORMAL_MS_USERNAME',
  'NORMAL_MS_PASSWORD',
  'UAT_URL',
  'trex_private',
  'ELASTICSEARCH_URL'
];

const status = {};
for (const k of keys) {
  status[k] = typeof process.env[k] === 'string' && process.env[k].length > 0;
}

console.log('Env presence check (true = loaded):');
for (const [k, v] of Object.entries(status)) {
  console.log(`${k}: ${v}`);
}
