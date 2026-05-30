const presetKey = 'grey-red-presets';
const maxPresets = 200;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function cleanNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanParams(params = {}) {
  return {
    baseFreq: cleanNumber(params.baseFreq, 30, 440, 82),
    modRatio: cleanNumber(params.modRatio, 0.25, 8, 2.01),
    modIndex: cleanNumber(params.modIndex, 0, 1200, 240),
    sweep: cleanNumber(params.sweep, -36, 36, 12),
    sweepTime: cleanNumber(params.sweepTime, 0.05, 4, 1.2),
    attack: cleanNumber(params.attack, 0.001, 1, 0.02),
    decay: cleanNumber(params.decay, 0.05, 5, 1.6),
    noise: cleanNumber(params.noise, 0, 0.8, 0.18),
    distortion: cleanNumber(params.distortion, 0, 1200, 520),
    crush: cleanNumber(params.crush, 0, 0.95, 0.42),
    filterFreq: cleanNumber(params.filterFreq, 120, 6000, 900),
    resonance: cleanNumber(params.resonance, 0.1, 30, 9),
    delayMix: cleanNumber(params.delayMix, 0, 0.5, 0.12),
    volume: cleanNumber(params.volume, 0, 1, 0.55),
    mode: ['rise', 'fall', 'pulse'].includes(params.mode) ? params.mode : 'rise',
    reverb: ['off', 'bunker', 'scorched', 'cavern', 'colony'].includes(params.reverb) ? params.reverb : 'bunker'
  };
}

function cleanName(value) {
  return String(value || 'untitled signal')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 32) || 'untitled signal';
}

async function readPresets(env) {
  return (await env.GREY_RED_PRESETS.get(presetKey, 'json')) || [];
}

async function writePresets(env, presets) {
  await env.GREY_RED_PRESETS.put(presetKey, JSON.stringify(presets.slice(0, maxPresets)));
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!env.GREY_RED_PRESETS) {
    return json({ presets: [], error: 'GREY_RED_PRESETS KV binding is not configured.' }, 503);
  }

  if (request.method === 'GET') {
    const presets = await readPresets(env);
    return json({ presets });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const preset = {
    id: crypto.randomUUID(),
    name: cleanName(body.name),
    params: cleanParams(body.params),
    createdAt: new Date().toISOString()
  };

  const presets = await readPresets(env);
  presets.unshift(preset);
  await writePresets(env, presets);

  return json({ preset, presets: presets.slice(0, maxPresets) }, 201);
}
