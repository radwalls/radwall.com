const TAU = Math.PI * 2;
const SCENE_ROOTS = new Float32Array([55, 73.42, 46.25, 41.2]);
const INTERVALS_A = new Float32Array([1.5, 2, 1.3348, 1.1892]);
const INTERVALS_B = new Float32Array([2.25, 2.9966, 1.4983, 1.4142]);
const HOWL_FREQUENCIES_A = new Float32Array([420, 285, 170, 220]);
const HOWL_FREQUENCIES_B = new Float32Array([1080, 520, 320, 390]);
const HOWL_Q_A = new Float32Array([18, 7.5, 4, 5.5]);
const HOWL_Q_B = new Float32Array([23, 9, 5, 7]);
const HOWL_MIX_B = new Float32Array([0.56, 0.36, 0.3, 0.34]);
const HOWL_WIDTH = new Float32Array([0.12, 0.34, 0.48, 0.42]);
const HOWL_LEVEL = new Float32Array([1, 0.82, 0.64, 0.74]);
const HOWL_DELAY_SECONDS = new Float32Array([0.043, 0.11, 0.155, 0.088]);

class RuinWindProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targets = { force: 0.62, gust: 0.76, tone: 0.18, howl: 0.55, pulse: 0.36, space: 0.58, omen: 0.28 };
    this.values = { ...this.targets };
    this.scene = 0;
    this.seed = 0x57314e44;
    this.sample = 0;
    this.gustPhase = 0;
    this.pulsePhase = 0;
    this.panPhase = 0;
    this.wavePhase = 0;
    this.whistlePhaseA = 0;
    this.whistlePhaseB = 0;
    this.presencePhase = 0;
    this.rootBase = SCENE_ROOTS[0];
    this.intervalA = INTERVALS_A[0];
    this.intervalB = INTERVALS_B[0];
    this.brown = 0;
    this.pinkL = [0, 0, 0];
    this.pinkR = [0, 0, 0];
    this.lowL = 0;
    this.lowR = 0;
    this.airL = 0;
    this.airR = 0;
    this.voiceEnvelope = 0;
    this.voiceAttack = 1 - Math.exp(-1 / (sampleRate * 0.12));
    this.voiceRelease = 1 - Math.exp(-1 / (sampleRate * 0.7));
    this.howlEnvelope = 0;
    this.howlAttack = 1 - Math.exp(-1 / (sampleRate * 0.18));
    this.howlRelease = 1 - Math.exp(-1 / (sampleRate * 1.25));
    this.howlDrift = 0;
    this.howlDriftCoefficient = 1 - Math.exp(-1 / (sampleRate * 0.08));
    this.howlSceneSlew = 1 - Math.exp(-32 / (sampleRate * 0.09));
    this.howlBase = HOWL_FREQUENCIES_A[0];
    this.howlRatio = HOWL_FREQUENCIES_B[0] / HOWL_FREQUENCIES_A[0];
    this.howlQ1 = HOWL_Q_A[0];
    this.howlQ2 = HOWL_Q_B[0];
    this.howlMixB = HOWL_MIX_B[0];
    this.howlWidth = HOWL_WIDTH[0];
    this.howlSceneLevel = HOWL_LEVEL[0];
    this.howlFrequencyA = HOWL_FREQUENCIES_A[0];
    this.howlFrequencyB = HOWL_FREQUENCIES_B[0];
    this.howlFilterA1 = 1;
    this.howlFilterA2 = 0;
    this.howlFilterA3 = 0;
    this.howlFilterB1 = 1;
    this.howlFilterB2 = 0;
    this.howlFilterB3 = 0;
    this.howlNormA = 1;
    this.howlNormB = 1;
    this.howlIc1A = 0;
    this.howlIc2A = 0;
    this.howlIc1B = 0;
    this.howlIc2B = 0;
    this.howlDelay = new Float32Array(Math.max(2048, Math.ceil(sampleRate * 0.22)));
    this.howlDelayIndex = 0;
    this.howlDelaySamples = Math.min(this.howlDelay.length - 2, sampleRate * HOWL_DELAY_SECONDS[0]);
    this.surge = 0;
    this.surgeRise = 0;
    this.dcInL = 0;
    this.dcInR = 0;
    this.dcOutL = 0;
    this.dcOutR = 0;
    this.dcCoefficient = Math.exp(-TAU * 18 / sampleRate);
    this.nextAutoEvent = sampleRate * 18;

    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'parameters') {
        this.scene = Math.max(0, Math.min(3, data.scene | 0));
        Object.keys(this.targets).forEach((key) => {
          if (Number.isFinite(data.values?.[key])) this.targets[key] = Math.max(0, Math.min(1, data.values[key]));
        });
      }
      if (data.type === 'summon') {
        this.surgeRise = 1;
        this.surge = Math.max(this.surge, 0.02);
      }
    };
  }

  random() {
    let x = this.seed | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x | 0;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  }

  pink(white, state) {
    state[0] = 0.99765 * state[0] + white * 0.099046;
    state[1] = 0.963 * state[1] + white * 0.2965164;
    state[2] = 0.57 * state[2] + white * 1.0526913;
    return (state[0] + state[1] + state[2] + white * 0.1848) * 0.12;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const left = output[0];
    const right = output[1] || output[0];
    for (let i = 0; i < left.length; i += 1) {
      this.values.force += (this.targets.force - this.values.force) * 0.0007;
      this.values.gust += (this.targets.gust - this.values.gust) * 0.0007;
      this.values.tone += (this.targets.tone - this.values.tone) * 0.0007;
      this.values.howl += (this.targets.howl - this.values.howl) * 0.0007;
      this.values.pulse += (this.targets.pulse - this.values.pulse) * 0.0007;
      this.values.space += (this.targets.space - this.values.space) * 0.0007;
      this.values.omen += (this.targets.omen - this.values.omen) * 0.0007;
      this.rootBase += (SCENE_ROOTS[this.scene] - this.rootBase) * 0.00035;
      this.intervalA += (INTERVALS_A[this.scene] - this.intervalA) * 0.00035;
      this.intervalB += (INTERVALS_B[this.scene] - this.intervalB) * 0.00035;
      const p = this.values;

      if ((this.sample & 127) === 0) {
        this.brown = Math.max(-1, Math.min(1, this.brown * 0.985 + this.random() * 0.11));
      }

      const gustRate = 0.035 + p.gust * 0.23 + this.scene * 0.009;
      this.gustPhase += TAU * gustRate / sampleRate;
      const breath = Math.sin(this.gustPhase) * 0.42 + Math.sin(this.gustPhase * 0.371 + 1.8) * 0.23 + this.brown * 0.35;
      const gust = Math.max(0.06, 0.55 + breath * (0.18 + p.gust * 0.62));
      this.howlDrift += (breath - this.howlDrift) * this.howlDriftCoefficient;
      const howlThreshold = 0.12 + (1 - p.gust) * 0.18;
      let howlCrest = Math.min(1, Math.max(0, (this.howlDrift - howlThreshold) * 1.5));
      howlCrest = howlCrest * howlCrest * (3 - 2 * howlCrest);
      const howlTarget = howlCrest * (0.25 + p.gust * 0.75);
      const howlSlew = howlTarget > this.howlEnvelope ? this.howlAttack : this.howlRelease;
      this.howlEnvelope += (howlTarget - this.howlEnvelope) * howlSlew;

      if ((this.sample & 31) === 0) {
        this.howlBase += (HOWL_FREQUENCIES_A[this.scene] - this.howlBase) * this.howlSceneSlew;
        this.howlRatio += (HOWL_FREQUENCIES_B[this.scene] / HOWL_FREQUENCIES_A[this.scene] - this.howlRatio) * this.howlSceneSlew;
        this.howlQ1 += (HOWL_Q_A[this.scene] - this.howlQ1) * this.howlSceneSlew;
        this.howlQ2 += (HOWL_Q_B[this.scene] - this.howlQ2) * this.howlSceneSlew;
        this.howlMixB += (HOWL_MIX_B[this.scene] - this.howlMixB) * this.howlSceneSlew;
        this.howlWidth += (HOWL_WIDTH[this.scene] - this.howlWidth) * this.howlSceneSlew;
        this.howlSceneLevel += (HOWL_LEVEL[this.scene] - this.howlSceneLevel) * this.howlSceneSlew;

        const bend = 0.94 + this.howlEnvelope * 0.08 + this.howlDrift * 0.012;
        const maximumHowlFrequency = Math.min(3200, sampleRate * 0.18);
        this.howlFrequencyA = Math.max(90, Math.min(maximumHowlFrequency, this.howlBase * bend));
        this.howlFrequencyB = Math.max(120, Math.min(maximumHowlFrequency, this.howlFrequencyA * this.howlRatio * (1 - this.howlDrift * 0.006)));
        const qAmount = 0.72 + p.howl * 0.28;
        const kA = 1 / Math.min(24, Math.max(0.65, this.howlQ1 * qAmount));
        const kB = 1 / Math.min(24, Math.max(0.65, this.howlQ2 * qAmount));
        const gA = Math.tan(Math.PI * this.howlFrequencyA / sampleRate);
        const gB = Math.tan(Math.PI * this.howlFrequencyB / sampleRate);
        this.howlFilterA1 = 1 / (1 + gA * (gA + kA));
        this.howlFilterA2 = gA * this.howlFilterA1;
        this.howlFilterA3 = gA * this.howlFilterA2;
        this.howlFilterB1 = 1 / (1 + gB * (gB + kB));
        this.howlFilterB2 = gB * this.howlFilterB1;
        this.howlFilterB3 = gB * this.howlFilterB2;
        this.howlNormA = kA;
        this.howlNormB = kB;
      }

      const pulseRate = 0.09 + p.pulse * p.pulse * 3.8;
      this.pulsePhase += TAU * pulseRate / sampleRate;
      const rhythmic = 1 - p.pulse * 0.44 + p.pulse * 0.44 * Math.pow(Math.max(0, Math.sin(this.pulsePhase)), 2.4);

      if (this.surgeRise > 0) {
        this.surge += (1 - this.surge) * (this.scene === 2 ? 0.00003 : 0.00022);
        if (this.surge > 0.96) this.surgeRise = 0;
      } else {
        this.surge *= this.scene === 2 ? 0.99999 : 0.99982;
      }
      if (this.scene === 2 && this.sample > this.nextAutoEvent) {
        this.surgeRise = 1;
        this.nextAutoEvent = this.sample + sampleRate * (24 + (this.random() + 1) * 10);
      }

      const whiteL = this.random();
      const whiteR = this.random();
      const pinkL = this.pink(whiteL, this.pinkL);
      const pinkR = this.pink(whiteR, this.pinkR);
      const cutoff = 0.0025 + p.tone * 0.028 + p.force * 0.018;
      this.lowL += (pinkL - this.lowL) * cutoff;
      this.lowR += (pinkR - this.lowR) * cutoff;
      this.airL += (whiteL - this.airL) * (0.012 + p.tone * 0.08);
      this.airR += (whiteR - this.airR) * (0.012 + p.tone * 0.08);
      const highL = whiteL - this.airL;
      const highR = whiteR - this.airR;

      const root = this.rootBase * (4.5 + p.tone * 8.5);
      const whistleDrift = 1 + breath * (0.0015 + p.gust * 0.0045) + Math.sin(this.gustPhase * 0.173) * 0.0018;
      this.whistlePhaseA += TAU * root * this.intervalA * whistleDrift / sampleRate;
      this.whistlePhaseB += TAU * root * this.intervalB / whistleDrift / sampleRate;
      if (this.whistlePhaseA > TAU) this.whistlePhaseA -= TAU;
      if (this.whistlePhaseB > TAU) this.whistlePhaseB -= TAU;
      const voiceThreshold = 0.14 + (1 - p.gust) * 0.12;
      const crest = Math.min(1, Math.max(0, (breath - voiceThreshold) * 1.55));
      const voiceTarget = crest * crest * (3 - 2 * crest);
      const voiceSlew = voiceTarget > this.voiceEnvelope ? this.voiceAttack : this.voiceRelease;
      this.voiceEnvelope += (voiceTarget - this.voiceEnvelope) * voiceSlew;
      const voiceAmount = p.tone * (0.35 + 0.65 * p.tone);
      const voiceGain = voiceAmount * (0.01 + p.force * 0.014) * this.voiceEnvelope;
      const voiceA = Math.sin(this.whistlePhaseA) + Math.sin(this.whistlePhaseA * 2 + 0.3) * 0.14;
      const voiceB = Math.sin(this.whistlePhaseB);
      const voiceL = voiceA * 0.58 + voiceB * 0.26 + highL * 0.08;
      const voiceR = voiceB * 0.58 + voiceA * 0.26 + highR * 0.08;

      const howlExciter = ((pinkL + pinkR) * 0.38 + (whiteL + whiteR) * 0.055) * (0.65 + Math.min(1, gust) * 0.35);
      const howlV3A = howlExciter - this.howlIc2A;
      const howlBandA = this.howlFilterA1 * this.howlIc1A + this.howlFilterA2 * howlV3A;
      const howlLowA = this.howlIc2A + this.howlFilterA2 * this.howlIc1A + this.howlFilterA3 * howlV3A;
      this.howlIc1A = 2 * howlBandA - this.howlIc1A;
      this.howlIc2A = 2 * howlLowA - this.howlIc2A;
      const howlV3B = howlExciter - this.howlIc2B;
      const howlBandB = this.howlFilterB1 * this.howlIc1B + this.howlFilterB2 * howlV3B;
      const howlLowB = this.howlIc2B + this.howlFilterB2 * this.howlIc1B + this.howlFilterB3 * howlV3B;
      this.howlIc1B = 2 * howlBandB - this.howlIc1B;
      this.howlIc2B = 2 * howlLowB - this.howlIc2B;
      const howlModeA = howlBandA * this.howlNormA;
      const howlModeB = howlBandB * this.howlNormB;
      const howlCenter = howlModeA * 0.82 + howlModeB * this.howlMixB;
      const howlSide = (howlModeA * 0.11 - howlModeB * 0.08) * this.howlWidth * (0.65 + p.space * 0.5);

      const targetDelaySamples = Math.min(this.howlDelay.length - 2, sampleRate * HOWL_DELAY_SECONDS[this.scene] * (0.72 + p.space * 0.5));
      this.howlDelaySamples += (targetDelaySamples - this.howlDelaySamples) * 0.00002;
      let howlReadPosition = this.howlDelayIndex - this.howlDelaySamples;
      if (howlReadPosition < 0) howlReadPosition += this.howlDelay.length;
      const howlReadIndex = Math.floor(howlReadPosition);
      const howlReadNext = howlReadIndex + 1 === this.howlDelay.length ? 0 : howlReadIndex + 1;
      const howlReadFraction = howlReadPosition - howlReadIndex;
      const howlReflection = this.howlDelay[howlReadIndex] * (1 - howlReadFraction) + this.howlDelay[howlReadNext] * howlReadFraction;
      this.howlDelay[this.howlDelayIndex] = howlCenter;
      this.howlDelayIndex += 1;
      if (this.howlDelayIndex === this.howlDelay.length) this.howlDelayIndex = 0;

      const howlAmount = p.howl * p.howl * (3 - 2 * p.howl);
      const howlGain = this.targets.howl === 0 ? 0 : howlAmount * this.howlEnvelope * (0.36 + p.force * 0.34) * this.howlSceneLevel;
      const howlPan = Math.sin(this.panPhase + 1.8) * (0.08 + p.space * 0.12);
      const howlL = ((howlCenter + howlSide) * (1 - howlPan) + howlReflection * 0.24 * (1 + howlPan)) * howlGain;
      const howlR = ((howlCenter - howlSide) * (1 + howlPan) + howlReflection * 0.24 * (1 - howlPan)) * howlGain;

      const presenceFrequency = this.rootBase * (5.2 + p.omen * 3.5);
      this.presencePhase += TAU * presenceFrequency * (1 + breath * 0.002) / sampleRate;
      if (this.presencePhase > TAU) this.presencePhase -= TAU;
      const distantCall = Math.sin(this.presencePhase + Math.sin(this.gustPhase * 0.23) * 0.18) * p.omen * p.omen * p.omen * this.voiceEnvelope * this.voiceEnvelope * 0.009;
      const gaiaBreathL = pinkL * (1 - p.omen) * gust * 0.025;
      const gaiaBreathR = pinkR * (1 - p.omen) * gust * 0.025;
      const baseGain = (0.055 + p.force * 0.3) * gust * rhythmic;
      this.wavePhase += TAU * (31 + p.gust * 17) / sampleRate;
      if (this.wavePhase > TAU) this.wavePhase -= TAU;
      const wave = this.surge * this.surge * (Math.sin(this.wavePhase) * 0.28 + pinkL * 0.72 + highL * 0.035);
      const bodyL = (this.lowL * 2.3 + highL * (0.01 + p.tone * 0.055)) * baseGain;
      const bodyR = (this.lowR * 2.3 + highR * (0.01 + p.tone * 0.055)) * baseGain;

      this.panPhase += TAU * (0.018 + p.space * 0.045) / sampleRate;
      const pan = Math.sin(this.panPhase) * p.space * 0.38;
      const common = distantCall + wave * (this.scene === 2 ? 0.5 : 0.18);
      const dryL = bodyL + gaiaBreathL + voiceL * voiceGain * (1 - pan) + howlL + common * (1 - pan);
      const dryR = bodyR + gaiaBreathR + voiceR * voiceGain * (1 + pan) + howlR + common * (1 + pan);

      const saturatedL = Math.tanh(dryL * 1.42);
      const saturatedR = Math.tanh(dryR * 1.42);
      const blockedL = saturatedL - this.dcInL + this.dcCoefficient * this.dcOutL;
      const blockedR = saturatedR - this.dcInR + this.dcCoefficient * this.dcOutR;
      this.dcInL = saturatedL;
      this.dcInR = saturatedR;
      this.dcOutL = blockedL;
      this.dcOutR = blockedR;
      left[i] = Math.tanh(blockedL) * 0.82;
      right[i] = Math.tanh(blockedR) * 0.82;
      this.sample += 1;
    }
    return true;
  }
}

registerProcessor('ruin-wind-processor', RuinWindProcessor);
