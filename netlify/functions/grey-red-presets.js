const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
};

const presetPath = process.env.GREY_RED_PRESET_PATH || 'data/grey-red-presets.json';
const branch = process.env.GREY_RED_PRESET_BRANCH || 'main';
const maxPresets = 250;

const numericFields = {
  baseFreq: [30, 440],
  modRatio: [0.25, 8],
  modIndex: [0, 1200],
  sweep: [-36, 36],
  sweepTime: [0.05, 4],
  attack: [0.001, 1],
  decay: [0.05, 5],
  noise: [0, 0.8],
  distortion: [0, 1200],
  crush: [0, 0.95],
  filterFreq: [120, 6000],
  resonance: [0.1, 30],
  delayMix: [0, 0.5],
  volume: [0, 1]
};

const modes = new Set(['rise', 'fall', 'pulse']);
const reverbs = new Set(['off', 'bunker', 'scorched', 'cavern', 'colony']);

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function repoConfig() {
  const repoSlug = process.env.GREY_RED_PRESET_REPO || process.env.GITHUB_REPOSITORY || '';
  const token = process.env.GREY_RED_PRESET_TOKEN || process.env.GITHUB_TOKEN || '';
  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo || !token) return null;
  return { owner, repo, token };
}

async function githubRequest(path, options = {}) {
  const config = repoConfig();
  if (!config) throw new Error('missing GitHub preset storage config');
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  return response;
}

function decodeBase64(value) {
  return Buffer.from(value || '', 'base64').toString('utf8');
}

function encodeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

async function readPresetFile() {
  const response = await githubRequest(`/contents/${presetPath}?ref=${encodeURIComponent(branch)}`);
  if (response.status === 404) return { presets: [], sha: null };
  if (!response.ok) throw new Error(`GitHub read failed: ${response.status}`);

  const file = await response.json();
  const parsed = JSON.parse(decodeBase64(file.content) || '{"presets":[]}');
  return { presets: Array.isArray(parsed.presets) ? parsed.presets : [], sha: file.sha };
}

async function writePresetFile(presets, sha) {
  const body = {
    message: 'Update Grey Red shared presets',
    content: encodeBase64(JSON.stringify({ presets }, null, 2) + '\n'),
    branch
  };
  if (sha) body.sha = sha;

  const response = await githubRequest(`/contents/${presetPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`GitHub write failed: ${response.status}`);
}

function cleanName(value) {
  return String(value || '')
    .replace(/[^a-z0-9 _.-]/gi, '')
    .trim()
    .slice(0, 32) || 'unnamed signal';
}

function cleanParams(raw) {
  const cleaned = {};
  Object.entries(numericFields).forEach(([key, [min, max]]) => {
    const value = Number(raw && raw[key]);
    if (!Number.isFinite(value)) throw new Error(`invalid ${key}`);
    cleaned[key] = Math.min(max, Math.max(min, value));
  });
  cleaned.mode = modes.has(raw && raw.mode) ? raw.mode : 'rise';
  cleaned.reverb = reverbs.has(raw && raw.reverb) ? raw.reverb : 'bunker';
  return cleaned;
}

function cleanPreset(raw) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName(raw && raw.name),
    params: cleanParams(raw && raw.params),
    createdAt: new Date().toISOString()
  };
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (!repoConfig()) {
    return json(503, {
      error: 'Shared preset storage is not configured.',
      setup: 'Set GREY_RED_PRESET_REPO=owner/repo and GREY_RED_PRESET_TOKEN with repo contents access.'
    });
  }

  if (event.httpMethod === 'GET') {
    const data = await readPresetFile();
    return json(200, { presets: data.presets.slice(-maxPresets).reverse() });
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const preset = cleanPreset(body);
    const data = await readPresetFile();
    const presets = [...data.presets, preset].slice(-maxPresets);
    await writePresetFile(presets, data.sha);
    return json(201, { preset });
  }

  return json(405, { error: 'Method not allowed' });
};
