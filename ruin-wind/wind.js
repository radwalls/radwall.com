(() => {
  "use strict";

  const scenes = [
    {
      number: "I",
      name: "Iron Desert",
      place: "THE RIGS STILL REIGN",
      note: "Hot pressure drags through derricks, pipework and oxidized wire.",
      color: "#c66b36",
      params: { force: 0.62, gust: 0.76, tone: 0.18, howl: 0.68, pulse: 0.36, space: 0.58, omen: 0.28 }
    },
    {
      number: "II",
      name: "Outside the Atrium",
      place: "THE SECRET BALCONY",
      note: "The first unsealed air in years circles a structure larger than sight.",
      color: "#a7b6ae",
      params: { force: 0.48, gust: 0.46, tone: 0.42, howl: 0.38, pulse: 0.24, space: 0.91, omen: 0.16 }
    },
    {
      number: "III",
      name: "Red Coast",
      place: "PLANETARY ALIGNMENT",
      note: "A thousand-foot wall gathers beyond the escape line, then arrives.",
      color: "#d3564d",
      params: { force: 0.86, gust: 0.9, tone: 0.22, howl: 0.12, pulse: 0.17, space: 0.82, omen: 0.42 }
    },
    {
      number: "IV",
      name: "Grey Earth",
      place: "THOUSANDS OF YEARS LATER",
      note: "Shrapnel, stone and the rubble of nations keep their own weather.",
      color: "#8c8a83",
      params: { force: 0.45, gust: 0.65, tone: 0.12, howl: 0.46, pulse: 0.44, space: 0.74, omen: 0.55 }
    }
  ];

  const playButton = document.querySelector("#playButton");
  const captureButton = document.querySelector("#captureButton");
  const summonButton = document.querySelector("#summonButton");
  const driftButton = document.querySelector("#driftButton");
  const statusMessage = document.querySelector("#statusMessage");
  const sceneName = document.querySelector("#sceneName");
  const sceneNumber = document.querySelector("#sceneNumber");
  const scenePlace = document.querySelector("#scenePlace");
  const sceneNote = document.querySelector("#sceneNote");
  const sceneButtons = [...document.querySelectorAll(".scene-button")];
  const parameterInputs = [...document.querySelectorAll("[data-parameter]")];
  const canvas = document.querySelector("#windTrace");
  const canvasContext = canvas.getContext("2d");

  let currentScene = 0;
  let values = { ...scenes[0].params };
  let audioContext = null;
  let windNode = null;
  let analyser = null;
  let mediaRecorder = null;
  let initializing = null;
  let recordingTimer = null;
  let recordingSeconds = 0;
  let recordingChunks = [];
  let recordingStopping = false;
  let recordingMimeType = "";
  let recordingScene = 0;
  let captureUnavailable = false;
  let discardPendingCapture = false;
  let animationFrame = 0;
  let tracePhase = 0;
  let analyserData = new Uint8Array(256);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(value) {
    return Math.min(1, Math.max(0, value));
  }

  function setMessage(message) {
    statusMessage.textContent = message;
  }

  function syncCaptureAvailability() {
    captureButton.disabled = captureUnavailable || recordingStopping || document.body.dataset.audio === "loading";
  }

  function setAudioState(state) {
    document.body.dataset.audio = state;
    const running = state === "running";
    playButton.classList.toggle("is-running", running);
    playButton.querySelector("b").textContent = running ? "HOLD WIND" : state === "loading" ? "OPENING…" : "WAKE WIND";
    playButton.disabled = state === "loading";
    summonButton.disabled = !running;
    syncCaptureAvailability();
  }

  function postParameters() {
    windNode?.port.postMessage({ type: "parameters", scene: currentScene, values });
  }

  function updateInput(input, value) {
    input.value = String(value);
    input.style.setProperty("--value", `${Math.round(value * 100)}%`);
    const output = input.parentElement.querySelector("output");
    if (output) output.value = String(Math.round(value * 100));
  }

  function chooseScene(index) {
    const nextIndex = Math.max(0, Math.min(scenes.length - 1, index));
    const scene = scenes[nextIndex];
    currentScene = nextIndex;
    values = { ...scene.params };

    document.body.dataset.scene = String(nextIndex);
    document.documentElement.style.setProperty("--scene", scene.color);
    sceneName.textContent = scene.name;
    sceneNumber.textContent = `SCENE ${scene.number}`;
    scenePlace.textContent = scene.place;
    sceneNote.textContent = scene.note;

    sceneButtons.forEach((button, buttonIndex) => {
      const active = buttonIndex === nextIndex;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    parameterInputs.forEach(input => updateInput(input, values[input.dataset.parameter]));
    postParameters();
    setMessage(scene.place);
    if (reducedMotion) drawTrace();
  }

  function makeRecorder(destination) {
    if (!("MediaRecorder" in window)) {
      captureUnavailable = true;
      syncCaptureAvailability();
      captureButton.title = "Capture is unavailable in this browser";
      return;
    }

    try {
      const types = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
      const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
      mediaRecorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
      captureUnavailable = false;
      syncCaptureAvailability();

      mediaRecorder.addEventListener("dataavailable", event => {
        if (event.data.size > 0) recordingChunks.push(event.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        window.clearInterval(recordingTimer);
        recordingTimer = null;
        recordingStopping = false;
        captureButton.classList.remove("is-recording");
        captureButton.querySelector("b").textContent = "CAPTURE";
        syncCaptureAvailability();

        if (discardPendingCapture) {
          discardPendingCapture = false;
          recordingChunks = [];
          return;
        }

        const blob = new Blob(recordingChunks, { type: recordingMimeType || "audio/webm" });
        recordingChunks = [];
        if (blob.size === 0) {
          setMessage("CAPTURE EMPTY");
          return;
        }

        const extension = recordingMimeType.includes("mp4") ? "m4a" : "webm";
        const objectUrl = URL.createObjectURL(blob);
        const download = document.createElement("a");
        download.href = objectUrl;
        download.download = `ruin-wind-scene-${recordingScene + 1}-${Date.now()}.${extension}`;
        document.body.appendChild(download);
        download.click();
        download.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        setMessage("CAPTURE SAVED");
      });

      mediaRecorder.addEventListener("error", () => {
        window.clearInterval(recordingTimer);
        recordingTimer = null;
        recordingChunks = [];
        recordingStopping = false;
        captureButton.classList.remove("is-recording");
        captureButton.querySelector("b").textContent = "CAPTURE";
        syncCaptureAvailability();
        setMessage("CAPTURE INTERRUPTED");
      });
    } catch (error) {
      console.warn("Ruin Wind capture is unavailable.", error);
      captureUnavailable = true;
      syncCaptureAvailability();
    }
  }

  async function wake() {
    if (initializing) return initializing;
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.resume();
      setAudioState("running");
      setMessage("OPEN AIR");
      return;
    }

    setAudioState("loading");
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || !window.AudioWorkletNode) {
      setAudioState("idle");
      setMessage("AUDIOWORKLET NOT SUPPORTED");
      return;
    }

    audioContext = new AudioContextClass({ latencyHint: "interactive" });
    const openingContext = audioContext;
    const resumePromise = openingContext.resume();

    initializing = (async () => {
      await resumePromise;
      await openingContext.audioWorklet.addModule("wind-worklet.js?v=1.0.3");

      windNode = new AudioWorkletNode(openingContext, "ruin-wind-processor", {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      });

      const master = openingContext.createGain();
      analyser = openingContext.createAnalyser();
      const captureDestination = openingContext.createMediaStreamDestination();
      master.gain.value = 0.52;
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;
      analyserData = new Uint8Array(analyser.frequencyBinCount);

      windNode.connect(master);
      master.connect(analyser);
      analyser.connect(openingContext.destination);
      master.connect(captureDestination);
      makeRecorder(captureDestination);
      postParameters();

      openingContext.onstatechange = () => {
        if (audioContext !== openingContext) return;
        if (openingContext.state === "running") setAudioState("running");
        if (openingContext.state === "suspended" || openingContext.state === "interrupted") {
          stopCapture();
          setAudioState("paused");
        }
      };

      setAudioState("running");
      setMessage("OPEN AIR");
    })();

    try {
      await initializing;
    } catch (error) {
      console.error("Ruin Wind could not open its audio engine.", error);
      if (audioContext === openingContext) audioContext = null;
      try { await openingContext.close(); } catch { /* already closed */ }
      windNode = null;
      analyser = null;
      setAudioState("idle");
      setMessage("AUDIO BLOCKED — TAP AGAIN");
    } finally {
      initializing = null;
    }
  }

  function stopCapture() {
    if (recordingStopping) return;
    if (mediaRecorder?.state === "recording") {
      recordingStopping = true;
      captureButton.querySelector("b").textContent = "SAVING…";
      syncCaptureAvailability();
      try {
        mediaRecorder.stop();
      } catch (error) {
        console.warn("Ruin Wind capture could not stop cleanly.", error);
        recordingStopping = false;
        recordingChunks = [];
        captureButton.classList.remove("is-recording");
        captureButton.querySelector("b").textContent = "CAPTURE";
        syncCaptureAvailability();
        setMessage("CAPTURE INTERRUPTED");
      }
    }
    window.clearInterval(recordingTimer);
    recordingTimer = null;
  }

  async function toggleAudio() {
    try {
      if (!audioContext || audioContext.state === "closed") {
        await wake();
      } else if (audioContext.state === "running") {
        stopCapture();
        await audioContext.suspend();
        setAudioState("paused");
        setMessage("AIR HELD");
      } else {
        await audioContext.resume();
        setAudioState("running");
        setMessage("OPEN AIR");
      }
    } catch (error) {
      console.error("Ruin Wind transport failed.", error);
      setAudioState("paused");
      setMessage("TRANSPORT INTERRUPTED");
    }
  }

  async function toggleCapture() {
    if (recordingStopping) return;
    if (initializing) await initializing;
    if (!audioContext || audioContext.state !== "running") await wake();
    if (!mediaRecorder) {
      setMessage("CAPTURE UNAVAILABLE HERE");
      return;
    }

    if (mediaRecorder.state === "recording") {
      stopCapture();
      return;
    }

    recordingChunks = [];
    recordingSeconds = 0;
    recordingScene = currentScene;
    recordingMimeType = mediaRecorder.mimeType || "audio/webm";
    try {
      mediaRecorder.start(500);
    } catch (error) {
      console.warn("Ruin Wind capture could not start.", error);
      recordingChunks = [];
      setMessage("CAPTURE INTERRUPTED");
      return;
    }
    captureButton.classList.add("is-recording");
    captureButton.querySelector("b").textContent = "STOP 00:00";
    setMessage("CAPTURING WEATHER");
    recordingTimer = window.setInterval(() => {
      recordingSeconds += 1;
      const minutes = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
      const seconds = String(recordingSeconds % 60).padStart(2, "0");
      captureButton.querySelector("b").textContent = `STOP ${minutes}:${seconds}`;
    }, 1000);
  }

  function alterWeather() {
    parameterInputs.forEach(input => {
      const key = input.dataset.parameter;
      values[key] = clamp(values[key] + (Math.random() - 0.5) * 0.26);
      updateInput(input, values[key]);
    });
    postParameters();
    setMessage("WEATHER ALTERED");
  }

  function drawTrace() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    canvasContext.clearRect(0, 0, width, height);
    canvasContext.lineWidth = 1;
    canvasContext.strokeStyle = `${scenes[currentScene].color}88`;
    canvasContext.beginPath();
    const isRunning = document.body.dataset.audio === "running";
    if (analyser && isRunning) analyser.getByteTimeDomainData(analyserData);
    tracePhase += isRunning ? .018 : .006;

    for (let x = 0; x <= width; x += 2) {
      const index = Math.floor((x / Math.max(width, 1)) * (analyserData.length - 1));
      const audio = analyser && isRunning ? (analyserData[index] - 128) / 128 : 0;
      const idle = Math.sin(x * .018 + tracePhase) * .08 + Math.sin(x * .006 - tracePhase * .7) * .06;
      const y = height * .5 + (audio * .72 + idle) * height * .42;
      if (x === 0) canvasContext.moveTo(x, y);
      else canvasContext.lineTo(x, y);
    }
    canvasContext.stroke();
    canvasContext.strokeStyle = `${scenes[currentScene].color}22`;
    canvasContext.beginPath();
    canvasContext.moveTo(0, height * .5);
    canvasContext.lineTo(width, height * .5);
    canvasContext.stroke();

    if (!reducedMotion) animationFrame = requestAnimationFrame(drawTrace);
  }

  sceneButtons.forEach(button => {
    button.addEventListener("click", () => chooseScene(Number(button.dataset.scene)));
  });

  parameterInputs.forEach(input => {
    updateInput(input, Number(input.value));
    input.addEventListener("input", () => {
      const key = input.dataset.parameter;
      values[key] = Number(input.value);
      updateInput(input, values[key]);
      postParameters();
    });
  });

  playButton.addEventListener("click", toggleAudio);
  captureButton.addEventListener("click", toggleCapture);
  driftButton.addEventListener("click", alterWeather);
  summonButton.addEventListener("click", () => {
    windNode?.port.postMessage({ type: "summon" });
    setMessage(currentScene === 2 ? "THE WAVE ARRIVES" : "SOMETHING ANSWERS");
  });

  window.addEventListener("keydown", event => {
    const target = event.target;
    if (target instanceof HTMLInputElement) return;
    if (/^[1-4]$/.test(event.key)) chooseScene(Number(event.key) - 1);
    if (event.code === "Space" && !(target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement)) {
      event.preventDefault();
      toggleAudio();
    }
  });

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    discardPendingCapture = mediaRecorder?.state === "recording";
    stopCapture();
    const closingContext = audioContext;
    audioContext = null;
    windNode = null;
    analyser = null;
    mediaRecorder = null;
    if (closingContext && closingContext.state !== "closed") closingContext.close().catch(() => undefined);
  });

  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    setAudioState("idle");
    setMessage("SEALED");
    if (reducedMotion) drawTrace();
    else if (!animationFrame) drawTrace();
  });

  chooseScene(0);
  drawTrace();
})();
