/**
 * KaguraID v1.0.0
 * Browser fingerprinting library - proprietary KaguraHash-256 algorithm
 */

(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define(factory);
  } else {
    const api = factory();
    (global || self).kaguraId = api;
  }
})(this, function () {
  "use strict";

  const VERSION = "1.0.0";

  const SIGNAL_TIMEOUT = 3000;

  const sleep = (ms, v) => new Promise((r) => setTimeout(r, ms, v));
  const isPromise = (v) => !!v && typeof v.then === "function";
  const noop = () => 0;
  const suppress = (p) => {
    p.then(void 0, () => {});
    return p;
  };
  const countTrue = (arr) => arr.reduce((n, v) => n + (v ? 1 : 0), 0);
  const toInt = (v) => parseInt(v, 10);
  const toFloat = (v) => parseFloat(v);
  const orDefault = (v, d) => (typeof v === "number" && isNaN(v) ? d : v);
  const roundTo = (v, p) => (Math.abs(p) >= 1 ? Math.round(v / p) * p : Math.round(v * (1 / p)) / (1 / p));
  const mq = (f, v) => {
    try {
      return matchMedia(`(${f}: ${v})`).matches;
    } catch (e) {
      void e;
      return false;
    }
  };

  function withTimeout(promise, ms, fallback) {
    return Promise.race([promise, new Promise((r) => setTimeout(() => r(fallback), ms))]);
  }

  async function yieldBatch(items, fn, every = 16) {
    const out = new Array(items.length);
    let last = Date.now();
    for (let i = 0; i < items.length; i++) {
      out[i] = fn(items[i], i);
      const now = Date.now();
      if (now >= last + every) {
        last = now;
        await new Promise((r) => {
          const c = new MessageChannel();
          c.port1.onmessage = () => r();
          c.port2.postMessage(null);
        });
      }
    }
    return out;
  }

  const INF_PRIME = [0x9e3779b9, 0x6c62272e, 0xc2b2ae35, 0x27d4eb2f];
  const INF_SEED = [0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344];

  function infRotl32(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  function infMix32(v) {
    v = (((v >>> 16) ^ v) * 0x45d9f3b) | 0;
    v = (((v >>> 16) ^ v) * 0x45d9f3b) | 0;
    return ((v >>> 16) ^ v) >>> 0;
  }

  function infAvalanche(state, chunk) {
    let [a, b, c, d] = state;
    const k = chunk >>> 0;
    a = (infRotl32((a ^ k) * INF_PRIME[0], 13) + b) >>> 0;
    b = (infRotl32((b ^ infMix32(k)) * INF_PRIME[1], 17) ^ c) >>> 0;
    c = (infRotl32((c + a) * INF_PRIME[2], 11) - d) >>> 0;
    d = (infRotl32((d ^ b) * INF_PRIME[3], 7) + k) >>> 0;
    a = (a ^ infRotl32(b, 5) ^ infRotl32(c, 19) ^ infRotl32(d, 28)) >>> 0;
    b = (b ^ infRotl32(c, 3) ^ infRotl32(d, 23) ^ infRotl32(a, 11)) >>> 0;
    c = (c ^ infRotl32(d, 17) ^ infRotl32(a, 13) ^ infRotl32(b, 7)) >>> 0;
    d = (d ^ infRotl32(a, 29) ^ infRotl32(b, 2) ^ infRotl32(c, 21)) >>> 0;
    return [a, b, c, d];
  }

  function infFinalize(state) {
    let [a, b, c, d] = state;
    a = (a ^ (b >>> 11) ^ (c >>> 22) ^ (d >>> 5)) >>> 0;
    b = (b ^ (c >>> 13) ^ (d >>> 7) ^ (a >>> 19)) >>> 0;
    c = (c ^ (d >>> 17) ^ (a >>> 3) ^ (b >>> 29)) >>> 0;
    d = (d ^ (a >>> 23) ^ (b >>> 11) ^ (c >>> 7)) >>> 0;
    a = infMix32(a ^ d);
    b = infMix32(b ^ a);
    c = infMix32(c ^ b);
    d = infMix32(d ^ c);
    return [a, b, c, d];
  }

  function infHash256(str) {
    if (!str) return "0".repeat(64);
    const enc = new TextEncoder().encode(str);
    let state = [...INF_SEED];

    let i = 0;
    for (; i <= enc.length - 4; i += 4) {
      const chunk = (enc[i] | (enc[i + 1] << 8) | (enc[i + 2] << 16) | (enc[i + 3] << 24)) >>> 0;
      state = infAvalanche(state, chunk);
    }
    if (i < enc.length) {
      let tail = 0;
      for (let j = i; j < enc.length; j++) tail |= enc[j] << ((j - i) * 8);
      state = infAvalanche(state, tail >>> 0);
    }
    state = infAvalanche(state, enc.length ^ 0xdeadbeef);
    state = infFinalize(state);

    return state.map((v) => ("00000000" + (v >>> 0).toString(16)).slice(-8)).join("");
  }

  const isWebKit = () =>
    countTrue([
      "ApplePayError" in window,
      "CSSPrimitiveValue" in window,
      (navigator.vendor || "").indexOf("Apple") === 0,
      "RGBColor" in window,
      "WebKitMediaKeys" in window
    ]) >= 3;

  const isGecko = () =>
    countTrue([
      "buildID" in navigator,
      "MozAppearance" in (document.documentElement?.style || {}),
      "onmozfullscreenchange" in window,
      "mozInnerScreenX" in window,
      "CSSMozDocumentRule" in window
    ]) >= 3;

  const isDesktopWebKit = () =>
    countTrue([
      "safari" in window,
      !("ongestureend" in window),
      !("TouchEvent" in window),
      !("orientation" in window)
    ]) >= 3;

  const isAndroid = () => /android/i.test(navigator.userAgent || "");

  async function withIframe(fn, srcdoc) {
    for (; !document.body; ) await sleep(50);
    const iframe = document.createElement("iframe");
    try {
      await new Promise((res, rej) => {
        let done = false;
        const ok = () => {
          if (!done) {
            done = true;
            res();
          }
        };
        iframe.onload = ok;
        iframe.onerror = (e) => {
          if (!done) {
            done = true;
            rej(e);
          }
        };
        const s = iframe.style;
        s.setProperty("display", "block", "important");
        s.position = "absolute";
        s.top = "0";
        s.left = "0";
        s.visibility = "hidden";
        if (srcdoc && "srcdoc" in iframe) iframe.srcdoc = srcdoc;
        else iframe.src = "about:blank";
        document.body.appendChild(iframe);
        const poll = () => {
          if (done) return;
          iframe.contentWindow?.document?.readyState === "complete" ? ok() : setTimeout(poll, 10);
        };
        poll();
      });
      for (; !iframe.contentWindow?.document?.body; ) await sleep(50);
      return await fn(iframe, iframe.contentWindow);
    } finally {
      iframe.parentNode?.removeChild(iframe);
    }
  }

  const GENERIC_FONTS = ["monospace", "sans-serif", "serif"];
  const TEST_FONTS = [
    "Arial Unicode MS",
    "Calibri",
    "Century Gothic",
    "Clarendon",
    "Courier New",
    "Franklin Gothic",
    "Futura Md BT",
    "GOTHAM",
    "Gill Sans",
    "Helvetica Neue",
    "Lucida Bright",
    "Lucida Sans",
    "Menlo",
    "MS Mincho",
    "Meiryo UI",
    "Minion Pro",
    "Monotype Corsiva",
    "Pristina",
    "Segoe UI Light",
    "SimHei",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Georgia",
    "Palatino",
    "Book Antiqua",
    "Garamond",
    "Impact",
    "Comic Sans MS",
    "Consolas"
  ];
  const FONT_TEXT = "mmMwWLliI0fiflO&1";

  async function collectFonts() {
    return withIframe(async (iframe, win) => {
      const doc = win.document;
      doc.body.style.fontSize = "48px";
      const wrap = doc.createElement("div");
      wrap.style.setProperty("visibility", "hidden", "important");
      const baseSpans = GENERIC_FONTS.map((f) => {
        const s = doc.createElement("span");
        s.style.fontFamily = f;
        s.textContent = FONT_TEXT;
        wrap.appendChild(s);
        return s;
      });
      const testSpans = {};
      for (const font of TEST_FONTS) {
        testSpans[font] = GENERIC_FONTS.map((g) => {
          const s = doc.createElement("span");
          s.style.fontFamily = `'${font}',${g}`;
          s.textContent = FONT_TEXT;
          wrap.appendChild(s);
          return s;
        });
      }
      doc.body.appendChild(wrap);
      const bw = {},
        bh = {};
      GENERIC_FONTS.forEach((f, i) => {
        bw[f] = baseSpans[i].offsetWidth;
        bh[f] = baseSpans[i].offsetHeight;
      });
      return TEST_FONTS.filter((font) =>
        GENERIC_FONTS.some(
          (g, i) => testSpans[font][i].offsetWidth !== bw[g] || testSpans[font][i].offsetHeight !== bh[g]
        )
      );
    });
  }

  async function collectFontLoadAPI() {
    if (!document.fonts || typeof document.fonts.check !== "function") {
      return { supported: false };
    }
    try {
      await document.fonts.ready;
      const probes = [
        "Arial",
        "Helvetica",
        "Times New Roman",
        "Courier New",
        "Georgia",
        "Verdana",
        "Trebuchet MS",
        "Impact",
        "Comic Sans MS",
        "Consolas",
        "Menlo",
        "Monaco",
        "Lucida Console",
        "Segoe UI",
        "Tahoma",
        "Palatino",
        "Garamond",
        "Bookman",
        "Avant Garde",
        "Candara"
      ];
      const detected = probes.filter((f) => document.fonts.check(`12px '${f}'`));
      return { supported: true, detected };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function _renderCanvas() {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    c.width = 240;
    c.height = 60;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.font = '11pt "Times New Roman"';
    ctx.fillText(`Cwm fjordbank ${String.fromCharCode(55357, 56835)}`, 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.2)";
    ctx.font = "18pt Arial";
    ctx.fillText(`Cwm fjordbank ${String.fromCharCode(55357, 56835)}`, 4, 45);
    const text = c.toDataURL();
    c.width = 122;
    c.height = 110;
    ctx.globalCompositeOperation = "multiply";
    for (const [col, x, y] of [
      ["#f2f", 40, 40],
      ["#2ff", 80, 40],
      ["#ff2", 60, 80]
    ]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, 2 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
    }
    const geometry = c.toDataURL();
    const tc = document.createElement("canvas").getContext("2d");
    tc.rect(0, 0, 10, 10);
    tc.rect(2, 2, 6, 6);
    const winding = tc.isPointInPath(5, 5, "evenodd");
    return { winding, geometry, text };
  }

  function collectCanvas() {
    try {
      const r1 = _renderCanvas();
      if (!r1) return { winding: false, geometry: "unsupported", text: "unsupported", stable: false };
      const r2 = _renderCanvas();
      const stable = !!(r2 && r1.text === r2.text && r1.geometry === r2.geometry);
      return { ...r1, stable };
    } catch (e) {
      void e;
      return { error: e.message };
    }
  }

  function collectCanvasNoise() {
    try {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext("2d");
      if (!ctx) return { supported: false };
      const g = ctx.createLinearGradient(0, 0, 16, 0);
      g.addColorStop(0, "#f09");
      g.addColorStop(1, "#0cf");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 16);
      ctx.font = "6px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("fp", 1, 10);
      const data = ctx.getImageData(0, 0, 16, 16).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum = (sum + data[i] * (i + 1)) >>> 0;
      return { supported: true, checksum: sum };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  // -- 5-E. WebGL basics ----------------------------------------
  const _glCache = {};
  function getGL() {
    if (_glCache.ctx) return _glCache.ctx;
    const c = document.createElement("canvas");
    for (const t of ["webgl2", "webgl", "experimental-webgl"]) {
      try {
        _glCache.ctx = c.getContext(t);
      } catch (e) {
        void e;
      }
      if (_glCache.ctx) {
        _glCache.version = t;
        break;
      }
    }
    return _glCache.ctx;
  }

  function collectWebGLBasics() {
    const gl = getGL();
    if (!gl) return -1;
    const dbg = isGecko() ? null : gl.getExtension("WEBGL_debug_renderer_info");
    return {
      contextVersion: _glCache.version || "webgl",
      version: String(gl.getParameter(gl.VERSION) || ""),
      vendor: String(gl.getParameter(gl.VENDOR) || ""),
      vendorUnmasked: dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "") : "",
      renderer: String(gl.getParameter(gl.RENDERER) || ""),
      rendererUnmasked: dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "") : "",
      shadingLanguage: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || ""),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewport: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) || []),
      antialias: gl.getContextAttributes()?.antialias ?? null
    };
  }

  function collectWebGLExtensions() {
    const gl = getGL();
    if (!gl) return -1;
    return (gl.getSupportedExtensions() || []).sort();
  }

  function collectWebGL2Params() {
    const gl = getGL();
    if (!gl || _glCache.version !== "webgl2") return { supported: false };
    try {
      return {
        supported: true,
        maxSamples: gl.getParameter(gl.MAX_SAMPLES),
        maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
        maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
        maxUniformBufferBindings: gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS),
        maxTransformFeedback: gl.getParameter(gl.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS),
        max3DTextureSize: gl.getParameter(gl.MAX_3D_TEXTURE_SIZE),
        maxArrayTextureLayers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)
      };
    } catch (e) {
      void e;
      return { supported: false, error: e.message };
    }
  }

  function collectShaderPrecision() {
    const gl = getGL();
    if (!gl) return { supported: false };
    try {
      const result = {};
      for (const shader of ["VERTEX_SHADER", "FRAGMENT_SHADER"]) {
        result[shader] = {};
        for (const prec of ["LOW_FLOAT", "MEDIUM_FLOAT", "HIGH_FLOAT", "LOW_INT", "MEDIUM_INT", "HIGH_INT"]) {
          const fmt = gl.getShaderPrecisionFormat(gl[shader], gl[prec]);
          result[shader][prec] = fmt ? [fmt.rangeMin, fmt.rangeMax, fmt.precision] : null;
        }
      }
      return { supported: true, ...result };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectGPUScore() {
    const gl = getGL();
    if (!gl) return -1;
    let vs, fs, prog, buf;
    try {
      const vsSrc = [
        "attribute vec2 p;",
        "void main(){",
        "  float x=p.x;",
        "  for(int i=0;i<64;i++) x=sin(x)*cos(x);",
        "  gl_Position=vec4(x,p.y,0.0,1.0);",
        "  gl_PointSize=1.0;",
        "}"
      ].join("\n");
      const fsSrc = [
        "precision highp float;",
        "void main(){",
        "  gl_FragColor=vec4(fract(sin(gl_FragCoord.x)*43758.5),0.0,0.0,1.0);",
        "}"
      ].join("\n");
      vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vsSrc);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) return -2;
      fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fsSrc);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return -2;
      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return -2;
      buf = gl.createBuffer();
      const pts = new Float32Array(512);
      for (let i = 0; i < 512; i++) pts[i] = Math.sin(i * 0.1);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
      gl.useProgram(prog);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) gl.drawArrays(gl.POINTS, 0, 256);
      gl.finish();
      return Math.round((performance.now() - t0) * 100) / 100;
    } catch (e) {
      void e;
      return -3;
    } finally {
      if (prog) gl.deleteProgram(prog);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (buf) gl.deleteBuffer(buf);
    }
  }

  function collectAudio() {
    const ACtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!ACtx) return Promise.resolve(-2);
    return new Promise((resolve) => {
      try {
        const ctx = new ACtx(1, 5000, 44100);
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = 10000;
        const cmp = ctx.createDynamicsCompressor();
        cmp.threshold.value = -50;
        cmp.knee.value = 40;
        cmp.ratio.value = 12;
        cmp.attack.value = 0;
        cmp.release.value = 0.25;
        osc.connect(cmp);
        cmp.connect(ctx.destination);
        osc.start(0);
        const tm = setTimeout(() => resolve(-3), SIGNAL_TIMEOUT);
        ctx.oncomplete = (e) => {
          clearTimeout(tm);
          const data = e.renderedBuffer.getChannelData(0).subarray(4500);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
          resolve(Math.round(sum * 1e8) / 1e8);
        };
        ctx.startRendering();
      } catch (e) {
        void e;
        resolve(-2);
      }
    });
  }

  function collectAudioLatency() {
    if (!window.AudioContext) return -1;
    try {
      const ctx = new AudioContext();
      const lat = ctx.baseLatency;
      ctx.close?.();
      return lat ?? -1;
    } catch (e) {
      void e;
      return -1;
    }
  }

  async function collectBattery() {
    try {
      if (typeof navigator.getBattery !== "function") return { supported: false };
      const b = await navigator.getBattery();
      return {
        supported: true,
        charging: b.charging,
        chargingTime: isFinite(b.chargingTime) ? b.chargingTime : null,
        dischargingTime: isFinite(b.dischargingTime) ? b.dischargingTime : null,
        levelBand: Math.floor((b.level || 0) * 10) * 10
      };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectNetwork() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { supported: false };
    return {
      supported: true,
      effectiveType: conn.effectiveType || null,
      downlink: conn.downlink || null,
      rtt: conn.rtt || null,
      saveData: conn.saveData || false
    };
  }

  function collectConnectionType() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { supported: false };
    return {
      supported: true,
      type: conn.type || null // "wifi" | "cellular" | "ethernet" | "bluetooth" | "none" | "other"
    };
  }

  function collectPerformanceTiming() {
    try {
      const nav = performance.getEntriesByType?.("navigation")?.[0] || performance.timing;
      if (!nav) return -1;
      if (nav.responseStart !== undefined && nav.requestStart !== undefined) {
        return {
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          domParse: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd - nav.responseEnd) : null
        };
      }
      return -1;
    } catch (e) {
      void e;
      return -1;
    }
  }

  function collectMemory() {
    const mem = performance.memory;
    if (!mem) return { supported: false };
    return {
      supported: true,
      jsHeapSizeLimitMB: Math.round(mem.jsHeapSizeLimit / 1048576)
    };
  }

  async function collectWebRTCIPs() {
    try {
      if (!window.RTCPeerConnection) return { supported: false };
      const ips = new Set();
      let hasIPv6 = false;
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise((resolve) => {
        const tm = setTimeout(() => {
          try {
            pc.close();
          } catch (e) {
            void e;
          }
          resolve();
        }, 1500);
        pc.onicecandidate = (e) => {
          if (!e || !e.candidate) {
            clearTimeout(tm);
            try {
              pc.close();
            } catch (e) {
              void e;
            }
            resolve();
            return;
          }
          const cand = e.candidate.candidate || "";
          (cand.match(/(\d{1,3}\.){3}\d{1,3}/g) || []).forEach((ip) => ips.add(ip));
          if (/[0-9a-f]{1,4}:[0-9a-f]{1,4}/i.test(cand)) hasIPv6 = true;
        };
      });
      const all = Array.from(ips);
      return {
        supported: true,
        hasLocalIP: all.some((ip) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01]))/.test(ip)),
        hasIPv6,
        ipCount: all.length
      };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  async function collectWebRTCCodecs() {
    try {
      if (!window.RTCPeerConnection) return { supported: false };
      const pc = new RTCPeerConnection();
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      pc.close();
      const codecs = new Set();
      for (const line of offer.sdp.split("\n")) {
        if (line.startsWith("a=rtpmap:")) {
          const m = line.match(/a=rtpmap:\d+\s+([\w-]+)/);
          if (m) codecs.add(m[1].toUpperCase());
        }
      }
      return { supported: true, codecs: Array.from(codecs).sort() };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectCSSFeatures() {
    const CSS = window.CSS;
    if (!CSS?.supports) return { supported: false };
    return {
      supported: true,
      containerQueries: CSS.supports("container-type", "inline-size"),
      layerCascade: CSS.supports("@layer", "a"),
      nestingSelector: CSS.supports("selector(&)"),
      colorMix: CSS.supports("color", "color-mix(in srgb, red, blue)"),
      hasSelector: CSS.supports("selector(:has(a))"),
      logicalProperties: CSS.supports("margin-inline", "1px"),
      subgrid: CSS.supports("grid-template-columns", "subgrid"),
      viewTransition: "startViewTransition" in document,
      oklch: CSS.supports("color", "oklch(50% 0.2 200)"),
      anchorPos: CSS.supports("anchor-name", "--a"),
      scrollTimeline: CSS.supports("animation-timeline", "scroll()"),
      popover: "popover" in document.createElement("div")
    };
  }

  function collectCSSComputedStyle() {
    try {
      const el = document.createElement("div");
      el.style.cssText = [
        "position:absolute",
        "top:-9999px",
        "left:-9999px",
        "font:normal 72px sans-serif",
        "line-height:1",
        "width:auto",
        "height:auto",
        "visibility:hidden"
      ].join(";");
      el.textContent = "Sphinx";
      document.body.appendChild(el);
      const cs = window.getComputedStyle(el);
      const result = {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        wordSpacing: cs.wordSpacing,
        scrollbarWidth: cs.scrollbarWidth || null
      };
      document.body.removeChild(el);
      return result;
    } catch (e) {
      void e;
      return { error: e.message };
    }
  }

  async function collectAutofillHint() {
    return withIframe(async (iframe, win) => {
      const doc = win.document;
      const form = doc.createElement("form");
      const inp = doc.createElement("input");
      inp.type = "text";
      inp.autocomplete = "email";
      inp.name = "email";
      form.appendChild(inp);
      doc.body.appendChild(form);
      await sleep(150);
      const bg = win.getComputedStyle(inp).backgroundColor;
      const changed = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "";
      return { autofillDetected: changed, bgColor: bg };
    });
  }

  function collectExtensionHints() {
    return {
      reactDevTools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
      reduxDevTools: !!window.__REDUX_DEVTOOLS_EXTENSION__,
      grammarly: !!document.querySelector("grammarly-extension"),
      adBlockGlobal: !!(window.adblockDetected || window.adBlockDetected || window.blockAdBlock),
      onePassword: !!(window._1password || document.querySelector("[data-onepassword-sign-in]")),
      ethereum: !!window.ethereum,
      solana: !!window.solana,
      lastPass: !!window.lpTag,
      darkReader: !!document.querySelector("meta[name='darkreader']"),
      uBlockStyle: !!document.querySelector("style[id^='uBlock']")
    };
  }

  function collectPointerPrecision() {
    return {
      coarsePointer: mq("pointer", "coarse"),
      finePointer: mq("pointer", "fine"),
      noPointer: mq("pointer", "none"),
      anyHover: mq("any-hover", "hover"),
      hover: mq("hover", "hover"),
      anyFine: mq("any-pointer", "fine")
    };
  }

  function collectScreenInfo() {
    const s = screen;
    return {
      resolution: [orDefault(toInt(s.width), null), orDefault(toInt(s.height), null)].sort().reverse(),
      colorDepth: s.colorDepth,
      pixelRatio: roundTo(window.devicePixelRatio || 1, 0.0001),
      orientation: screen.orientation?.type || null
    };
  }

  function collectScreenFrame() {
    const s = screen;
    return [
      orDefault(toFloat(s.availTop), null),
      orDefault(toFloat(s.width) - toFloat(s.availWidth) - orDefault(toFloat(s.availLeft), 0), null),
      orDefault(toFloat(s.height) - toFloat(s.availHeight) - orDefault(toFloat(s.availTop), 0), null),
      orDefault(toFloat(s.availLeft), null)
    ].map((v) => (v === null ? null : roundTo(v, 10)));
  }

  function collectScreenLuminance() {
    return {
      hdr: mq("dynamic-range", "high"),
      hdrVideo: mq("video-dynamic-range", "high"),
      maxLuminance: screen.luminanceLevel !== undefined ? screen.luminanceLevel : null
    };
  }

  function collectTimezone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch (e) {
      void e;
    }
    const y = new Date().getFullYear();
    const off = -Math.max(
      toFloat(new Date(y, 0, 1).getTimezoneOffset()),
      toFloat(new Date(y, 6, 1).getTimezoneOffset())
    );
    return `UTC${off >= 0 ? "+" : ""}${off}`;
  }

  function collectLocale() {
    try {
      const opts = Intl.DateTimeFormat().resolvedOptions();
      return {
        locale: opts.locale,
        calendar: opts.calendar,
        numberingSystem: opts.numberingSystem || null
      };
    } catch (e) {
      void e;
      return { locale: navigator.language || null };
    }
  }

  function collectMath() {
    const M = Math;
    return {
      acos: (M.acos || noop)(0.12312423423423424),
      acosh: (M.acosh || noop)(1e308),
      asin: (M.asin || noop)(0.12312423423423424),
      asinh: (M.asinh || noop)(1),
      atanh: (M.atanh || noop)(0.5),
      atan: (M.atan || noop)(0.5),
      sin: (M.sin || noop)(-1e300),
      cos: (M.cos || noop)(10.000000000123),
      tan: (M.tan || noop)(-1e300),
      exp: (M.exp || noop)(1),
      expm1: (M.expm1 || noop)(1),
      log1p: (M.log1p || noop)(10),
      powPI: ((v) => M.pow(M.PI, v))(-100),
      cbrt: (M.cbrt || noop)(17),
      hypot: (M.hypot || noop)(3, 4),
      clz32: (M.clz32 || noop)(1),
      fround: (M.fround || noop)(1.337)
    };
  }

  function collectHardware() {
    const f = new Float32Array(1);
    const b = new Uint8Array(f.buffer);
    f[0] = Infinity;
    f[0] = f[0] - f[0];
    return {
      hardwareConcurrency: orDefault(toInt(navigator.hardwareConcurrency), undefined),
      deviceMemory: orDefault(toFloat(navigator.deviceMemory), undefined),
      architecture: b[3], // 0 = little-endian (x86/ARM); 1 = big-endian
      maxTouchPoints: toInt(navigator.maxTouchPoints || 0)
    };
  }

  async function collectUserAgentData() {
    try {
      const uad = navigator.userAgentData;
      if (!uad) return { supported: false };
      const base = {
        supported: true,
        mobile: uad.mobile,
        brands: (uad.brands || []).map((b) => ({ brand: b.brand, version: b.version })),
        platform: uad.platform || null
      };
      if (typeof uad.getHighEntropyValues === "function") {
        try {
          const hi = await uad.getHighEntropyValues([
            "architecture",
            "bitness",
            "model",
            "platformVersion",
            "uaFullVersion"
          ]);
          base.architecture = hi.architecture || null;
          base.bitness = hi.bitness || null;
          base.model = hi.model || null;
          base.platformVersion = hi.platformVersion || null;
          base.uaFullVersion = hi.uaFullVersion || null;
        } catch (e) {
          void e;
        }
      }
      return base;
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectDeviceSensors() {
    return {
      deviceMotion: typeof DeviceMotionEvent !== "undefined",
      deviceOrientation: typeof DeviceOrientationEvent !== "undefined",
      permissionsAPI: !!navigator.permissions,
      geolocation: !!navigator.geolocation,
      ambientLight: typeof AmbientLightSensor !== "undefined",
      accelerometer: typeof Accelerometer !== "undefined",
      gyroscope: typeof Gyroscope !== "undefined"
    };
  }

  async function collectPermissions() {
    if (!navigator.permissions) return { supported: false };
    const names = ["notifications", "geolocation", "camera", "microphone", "clipboard-read", "clipboard-write"];
    const result = { supported: true };
    await Promise.all(
      names.map(async (name) => {
        try {
          const r = await navigator.permissions.query({ name });
          result[name] = r.state;
        } catch (e) {
          void e;
          result[name] = "unavailable";
        }
      })
    );
    return result;
  }

  async function collectWebXR() {
    if (!navigator.xr) return { supported: false };
    try {
      const [vr, ar, inline] = await Promise.all([
        navigator.xr.isSessionSupported("immersive-vr").catch(() => false),
        navigator.xr.isSessionSupported("immersive-ar").catch(() => false),
        navigator.xr.isSessionSupported("inline").catch(() => false)
      ]);
      return { supported: true, immersiveVR: vr, immersiveAR: ar, inline };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectOffscreenCanvas() {
    if (typeof OffscreenCanvas === "undefined") return { supported: false };
    try {
      const oc = new OffscreenCanvas(2, 2);
      const ctx = oc.getContext("2d");
      if (!ctx) return { supported: true, context2d: false };
      ctx.fillStyle = "#abc";
      ctx.fillRect(0, 0, 2, 2);
      const hasTransfer = typeof oc.transferToImageBitmap === "function";
      return { supported: true, context2d: true, transferToImageBitmap: hasTransfer };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectDOMAPIs() {
    return {
      intersectionObserver: typeof IntersectionObserver !== "undefined",
      intersectionObserverV2: "isIntersecting" in (IntersectionObserverEntry?.prototype || {}),
      resizeObserver: typeof ResizeObserver !== "undefined",
      mutationObserver: typeof MutationObserver !== "undefined",
      navigationAPI: typeof navigation !== "undefined",
      customElements: !!window.customElements,
      shadowDOM: !!HTMLElement.prototype.attachShadow,
      cssHoudini: !!window.CSS?.paintWorklet,
      webLocks: !!navigator.locks,
      idleDetection: typeof IdleDetector !== "undefined",
      wakeLock: !!navigator.wakeLock,
      fileSystemAccess: typeof showOpenFilePicker !== "undefined",
      webShare: !!navigator.share,
      credentials: !!navigator.credentials
    };
  }

  function collectReducedData() {
    return {
      prefersReducedData: mq("prefers-reduced-data", "reduce"),
      saveData: !!navigator.connection?.saveData
    };
  }

  function collectPlugins() {
    const ps = navigator.plugins;
    if (!ps) return undefined;
    const r = [];
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p) continue;
      const mimes = [];
      for (let j = 0; j < p.length; j++) mimes.push({ type: p[j].type, suffixes: p[j].suffixes });
      r.push({ name: p.name, description: p.description, mimeTypes: mimes });
    }
    return r;
  }

  function collectBrowserEnv() {
    return {
      cookiesEnabled: (() => {
        try {
          document.cookie = "iptest=1;SameSite=Strict";
          const ok = document.cookie.includes("iptest");
          document.cookie = "iptest=;SameSite=Strict;expires=Thu, 01-Jan-1970 00:00:01 GMT";
          return ok;
        } catch (e) {
          void e;
          return false;
        }
      })(),
      sessionStorage: (() => {
        try {
          return !!window.sessionStorage;
        } catch (e) {
          void e;
          return true;
        }
      })(),
      localStorage: (() => {
        try {
          return !!window.localStorage;
        } catch (e) {
          void e;
          return true;
        }
      })(),
      indexedDB: (() => {
        try {
          return !!window.indexedDB;
        } catch (e) {
          void e;
          return true;
        }
      })(),
      openDatabase: !!window.openDatabase,
      pdfViewerEnabled: !!navigator.pdfViewerEnabled,
      doNotTrack: navigator.doNotTrack || navigator.msDoNotTrack || null,
      platform: navigator.platform || null,
      vendor: navigator.vendor || "",
      language: navigator.language || null,
      languages: Array.isArray(navigator.languages) ? Array.from(navigator.languages) : [],
      cpuClass: navigator.cpuClass || null
    };
  }

  function collectVisualPrefs() {
    return {
      colorGamut: (() => {
        for (const g of ["rec2020", "p3", "srgb"]) if (mq("color-gamut", g)) return g;
        return null;
      })(),
      contrast: (() => {
        if (mq("prefers-contrast", "no-preference")) return 0;
        if (mq("prefers-contrast", "high") || mq("prefers-contrast", "more")) return 1;
        if (mq("prefers-contrast", "low") || mq("prefers-contrast", "less")) return -1;
        return undefined;
      })(),
      monochrome: (() => {
        if (!mq("min-monochrome", "0")) return undefined;
        for (let i = 0; i <= 100; i++) if (mq("max-monochrome", String(i))) return i;
        return undefined;
      })(),
      reducedMotion: mq("prefers-reduced-motion", "reduce") || undefined,
      reducedTransparency: mq("prefers-reduced-transparency", "reduce") || undefined,
      invertedColors: mq("inverted-colors", "inverted") || undefined,
      forcedColors: mq("forced-colors", "active") || undefined,
      darkMode: mq("prefers-color-scheme", "dark")
    };
  }

  function collectVendorFlavors() {
    return [
      "chrome",
      "safari",
      "__crWeb",
      "__gCrWeb",
      "yandex",
      "__yb",
      "__ybro",
      "__firefox__",
      "__edgeTrackingPreventionStatistics",
      "webkit",
      "oprt",
      "samsungAr",
      "ucweb",
      "UCShellJava",
      "puffinDevice"
    ]
      .filter((k) => window[k] && typeof window[k] === "object")
      .sort();
  }

  function collectApplePay() {
    const APS = window.ApplePaySession;
    if (typeof APS?.canMakePayments !== "function") return -1;
    try {
      return APS.canMakePayments() ? 1 : 0;
    } catch (e) {
      void e;
      return -2;
    }
  }

  function collectWindowContext() {
    let isInIframe;
    try {
      isInIframe = window.self !== window.top;
    } catch (e) {
      void e;
      isInIframe = true;
    }
    return {
      isInIframe,
      isFullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement),
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight
    };
  }

  async function collectClipboardAccess() {
    try {
      if (!navigator.permissions) return { supported: false };
      const r = await navigator.permissions.query({ name: "clipboard-read" });
      return { supported: true, state: r.state };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectGamepadSupport() {
    return {
      supported: !!navigator.getGamepads,
      connected: navigator.getGamepads ? Array.from(navigator.getGamepads() || []).filter(Boolean).length : 0
    };
  }

  function collectWorkerSupport() {
    return {
      serviceWorker: "serviceWorker" in navigator,
      webWorker: typeof Worker !== "undefined",
      sharedWorker: typeof SharedWorker !== "undefined",
      broadcastChannel: typeof BroadcastChannel !== "undefined"
    };
  }

  function collectWasmSupport() {
    if (!window.WebAssembly) return false;
    try {
      return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    } catch (e) {
      void e;
      return false;
    }
  }

  function collectIntlSupport() {
    try {
      const c = new Intl.Collator().resolvedOptions();
      return {
        supported: true,
        locale: c.locale,
        usage: c.usage,
        segmenter: typeof Intl.Segmenter !== "undefined",
        displayNames: typeof Intl.DisplayNames !== "undefined",
        relativeTime: typeof Intl.RelativeTimeFormat !== "undefined"
      };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  async function collectSpeechSynthesis() {
    if (!window.speechSynthesis) return { supported: false };
    try {
      const voices = await new Promise((resolve) => {
        const list = window.speechSynthesis.getVoices();
        if (list.length > 0) {
          resolve(list);
          return;
        }
        const tm = setTimeout(() => resolve([]), 1000);
        window.speechSynthesis.onvoiceschanged = () => {
          clearTimeout(tm);
          resolve(window.speechSynthesis.getVoices());
        };
      });
      return {
        supported: true,
        count: voices.length,
        locales: [...new Set(voices.map((v) => v.lang))].sort(),
        hasLocal: voices.some((v) => v.localService)
      };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  async function collectMediaDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return { supported: false };
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const counts = { audioinput: 0, audiooutput: 0, videoinput: 0 };
      for (const d of devices) if (d.kind in counts) counts[d.kind]++;
      return {
        supported: true,
        micCount: counts.audioinput,
        speakerCount: counts.audiooutput,
        cameraCount: counts.videoinput
      };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  function collectTimingJitter() {
    try {
      const samples = [];
      for (let i = 0; i < 20; i++) {
        const t = performance.now();
        let x = 0;
        for (let j = 0; j < 100; j++) x += j;
        void x;
        samples.push(performance.now() - t);
      }
      samples.sort((a, b) => a - b);
      const min = samples[0];
      const median = samples[10];
      let precisionLevel = "high"; // < 0.1 ms (SharedArrayBuffer available)
      if (min >= 1.0)
        precisionLevel = "low"; // >= 1 ms (cross-origin isolated)
      else if (min >= 0.1) precisionLevel = "medium";
      return {
        precisionLevel,
        minMs: Math.round(min * 10000) / 10000,
        medianMs: Math.round(median * 10000) / 10000
      };
    } catch (e) {
      void e;
      return { precisionLevel: "unknown" };
    }
  }

  async function collectStorageQuota() {
    if (!navigator.storage?.estimate) return { supported: false };
    try {
      const est = await navigator.storage.estimate();
      return {
        supported: true,
        quotaGB: Math.round(((est.quota || 0) / 1073741824) * 10) / 10,
        usageMB: Math.round(((est.usage || 0) / 1048576) * 10) / 10
      };
    } catch (e) {
      void e;
      return { supported: false };
    }
  }

  const SOURCES = {
    canvas: { stable: true, weight: 15, timeout: 2000, fn: () => collectCanvas() },
    webGlBasics: { stable: true, weight: 12, timeout: 1000, fn: () => collectWebGLBasics() },
    fonts: { stable: true, weight: 12, timeout: 5000, fn: () => collectFonts() },
    webGlExtensions: { stable: true, weight: 10, timeout: 1000, fn: () => collectWebGLExtensions() },
    shaderPrecision: { stable: true, weight: 9, timeout: 1000, fn: () => collectShaderPrecision() },
    audio: { stable: true, weight: 10, timeout: 4000, fn: () => collectAudio() },
    webGL2Params: { stable: true, weight: 8, timeout: 1000, fn: () => collectWebGL2Params() },
    hardware: { stable: true, weight: 8, timeout: 500, fn: () => collectHardware() },
    math: { stable: true, weight: 8, timeout: 500, fn: () => collectMath() },
    canvasNoise: { stable: true, weight: 7, timeout: 1000, fn: () => collectCanvasNoise() },
    fontLoadAPI: { stable: true, weight: 7, timeout: 2000, fn: () => collectFontLoadAPI() },
    speechSynthesis: { stable: true, weight: 6, timeout: 2000, fn: () => collectSpeechSynthesis() },
    cssFeatures: { stable: true, weight: 6, timeout: 500, fn: () => collectCSSFeatures() },
    screen: { stable: true, weight: 6, timeout: 500, fn: () => collectScreenInfo() },
    cssComputedStyle: { stable: true, weight: 6, timeout: 500, fn: () => collectCSSComputedStyle() },
    vendorFlavors: { stable: true, weight: 5, timeout: 500, fn: () => collectVendorFlavors() },
    plugins: { stable: true, weight: 5, timeout: 500, fn: () => collectPlugins() },
    browserEnv: { stable: true, weight: 5, timeout: 500, fn: () => collectBrowserEnv() },
    timingJitter: { stable: true, weight: 5, timeout: 1000, fn: () => collectTimingJitter() },
    domAPIs: { stable: true, weight: 5, timeout: 500, fn: () => collectDOMAPIs() },
    userAgentData: { stable: true, weight: 5, timeout: 2000, fn: () => collectUserAgentData() },
    mediaDevices: { stable: true, weight: 4, timeout: 2000, fn: () => collectMediaDevices() },
    visualPrefs: { stable: true, weight: 4, timeout: 500, fn: () => collectVisualPrefs() },
    intl: { stable: true, weight: 4, timeout: 500, fn: () => collectIntlSupport() },
    applePay: { stable: true, weight: 4, timeout: 500, fn: () => collectApplePay() },
    deviceSensors: { stable: true, weight: 4, timeout: 500, fn: () => collectDeviceSensors() },
    offscreenCanvas: { stable: true, weight: 4, timeout: 500, fn: () => collectOffscreenCanvas() },
    timezone: { stable: true, weight: 4, timeout: 500, fn: () => collectTimezone() },
    locale: { stable: true, weight: 3, timeout: 500, fn: () => collectLocale() },
    pointerPrecision: { stable: true, weight: 3, timeout: 500, fn: () => collectPointerPrecision() },
    workers: { stable: true, weight: 3, timeout: 500, fn: () => collectWorkerSupport() },
    wasm: { stable: true, weight: 3, timeout: 500, fn: () => collectWasmSupport() },
    screenLuminance: { stable: true, weight: 3, timeout: 500, fn: () => collectScreenLuminance() },
    webXR: { stable: true, weight: 3, timeout: 2000, fn: () => collectWebXR() },
    gpuScore: { stable: false, weight: 2, timeout: 2000, fn: () => collectGPUScore() },
    audioLatency: { stable: false, weight: 2, timeout: 1000, fn: () => collectAudioLatency() },
    screenFrame: { stable: false, weight: 2, timeout: 500, fn: () => collectScreenFrame() },
    memory: { stable: false, weight: 2, timeout: 500, fn: () => collectMemory() },
    webrtcIPs: { stable: false, weight: 2, timeout: 2000, fn: () => collectWebRTCIPs() },
    webRTCCodecs: { stable: false, weight: 2, timeout: 2000, fn: () => collectWebRTCCodecs() },
    extensionHints: { stable: false, weight: 3, timeout: 500, fn: () => collectExtensionHints() },
    autofillHint: { stable: false, weight: 2, timeout: 2000, fn: () => collectAutofillHint() },
    storageQuota: { stable: false, weight: 2, timeout: 2000, fn: () => collectStorageQuota() },
    permissions: { stable: false, weight: 2, timeout: 2000, fn: () => collectPermissions() },
    reducedData: { stable: false, weight: 1, timeout: 500, fn: () => collectReducedData() },
    connectionType: { stable: false, weight: 1, timeout: 500, fn: () => collectConnectionType() },
    battery: { stable: false, weight: 1, timeout: 2000, fn: () => collectBattery() },
    network: { stable: false, weight: 1, timeout: 500, fn: () => collectNetwork() },
    clipboardAccess: { stable: false, weight: 1, timeout: 1000, fn: () => collectClipboardAccess() },
    performance: { stable: false, weight: 1, timeout: 500, fn: () => collectPerformanceTiming() },
    windowContext: { stable: false, weight: 1, timeout: 500, fn: () => collectWindowContext() },
    gamepad: { stable: false, weight: 1, timeout: 500, fn: () => collectGamepadSupport() }
  };

  function runSource(key) {
    const src = SOURCES[key];
    const start = Date.now();

    return suppress(
      new Promise((resolve) => {
        const done = (val) => resolve({ value: val, duration: Date.now() - start });
        const fail = (e) => resolve({ error: e, duration: Date.now() - start });

        try {
          const raw = src.fn();
          const p = isPromise(raw)
            ? withTimeout(raw, src.timeout ?? SIGNAL_TIMEOUT, { __timeout: true })
            : Promise.resolve(raw);
          p.then(done, fail);
        } catch (e) {
          void e;
          fail(e);
        }
      })
    );
  }

  async function loadAllSources() {
    const keys = Object.keys(SOURCES);
    const promises = await yieldBatch(keys, (k) => runSource(k));
    const results = await Promise.all(promises);
    const components = {};
    for (let i = 0; i < keys.length; i++) components[keys[i]] = results[i];
    return components;
  }

  function serializeStable(components) {
    let str = "";
    for (const key of Object.keys(SOURCES).sort()) {
      if (!SOURCES[key].stable) continue;
      const comp = components[key];
      if (!comp) continue;
      const val = "error" in comp ? "error" : JSON.stringify(comp.value);
      str += `${str ? "|" : ""}${key.replace(/([:|\\])/g, "\\$1")}:${val}`;
    }
    return str;
  }

  function serializeAll(components) {
    let str = "";
    for (const key of Object.keys(components).sort()) {
      const comp = components[key];
      const val = "error" in comp ? "error" : JSON.stringify(comp.value);
      str += `${str ? "|" : ""}${key.replace(/([:|\\])/g, "\\$1")}:${val}`;
    }
    return str;
  }

  const buildVisitorId = (components) => infHash256(serializeStable(components));
  const buildSessionId = (components) => infHash256(serializeAll(components));
  const buildStableId = (visitorId) => visitorId.slice(0, 16);

  function matchComponents(compA, compB) {
    let totalWeight = 0,
      matchedWeight = 0;
    const breakdown = {};

    for (const key of Object.keys(SOURCES)) {
      const src = SOURCES[key];
      const a = compA[key];
      const b = compB[key];
      const w = src.weight ?? 1;

      if (!a || !b) continue;
      if ("error" in a || "error" in b) continue;

      totalWeight += w;
      const matched = JSON.stringify(a.value) === JSON.stringify(b.value);
      if (matched) matchedWeight += w;
      breakdown[key] = { matched, weight: w, stable: src.stable };
    }

    const score = totalWeight > 0 ? roundTo(matchedWeight / totalWeight, 0.001) : 0;

    let verdict;
    if (score >= 0.92) verdict = "same";
    else if (score >= 0.75) verdict = "likely";
    else if (score >= 0.55) verdict = "unknown";
    else verdict = "different";

    return { score, verdict, matchedWeight, totalWeight, breakdown };
  }

  function calcConfidence(components) {
    let base = isAndroid() ? 0.4 : isWebKit() ? (isDesktopWebKit() ? 0.45 : 0.5) : 0.65;

    const hiKeys = Object.keys(SOURCES).filter((k) => (SOURCES[k].weight ?? 1) >= 8);
    const hiErrors = hiKeys.filter((k) => components[k] && "error" in components[k]).length;
    const penalty = (hiErrors / hiKeys.length) * 0.3;

    return Math.max(0, Math.min(1, roundTo(base - penalty, 0.001)));
  }

  function calcStability(components) {
    let totalW = 0,
      successW = 0;
    for (const key of Object.keys(SOURCES)) {
      if (!SOURCES[key].stable) continue;
      const w = SOURCES[key].weight ?? 1;
      totalW += w;
      if (components[key] && !("error" in components[key])) successW += w;
    }
    return totalW > 0 ? roundTo(successW / totalW, 0.001) : 0;
  }

  function componentsToDebugString(components) {
    return JSON.stringify(
      components,
      (k, v) => {
        if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack?.split("\n") };
        return v;
      },
      2
    );
  }

  async function waitForIdle(fb = 50) {
    const ric = window.requestIdleCallback;
    return ric ? new Promise((r) => ric.call(window, () => r(), { timeout: fb * 2 })) : sleep(Math.min(fb, fb * 2));
  }

  /**
   * kaguraId.load(options?) -> FingerprintAgent
   * @param {object} [options]
   * @param {number}  [options.delayFallback=50] - fallback idle wait ms
   * @param {boolean} [options.debug=false]      - log full debug block to console
   */
  async function load(options = {}) {
    const { delayFallback, debug } = options;
    await waitForIdle(delayFallback);
    const loadedAt = Date.now();

    return {
      /**
       * fp.get(options?) -> FingerprintResult
       * @returns {Promise<{
       *   visitorId:  string,   // 64-char hex, stable signals only
       *   sessionId:  string,   // 64-char hex, all signals
       *   stableId:   string,   // 16-char shorthand
       *   components: object,
       *   confidence: number,   // 0-1
       *   stability:  number,   // 0-1
       *   version:    string
       * }>}
       */
      async get(getOptions) {
        const startedAt = Date.now();
        const components = await loadAllSources();
        const visitorId = buildVisitorId(components);
        const sessionId = buildSessionId(components);
        const stableId = buildStableId(visitorId);
        const confidence = calcConfidence(components);
        const stability = calcStability(components);

        if (debug || getOptions?.debug) {
          console.log(
            `[KaguraID v${VERSION}] Debug:\n\`\`\`\n` +
              `version: ${VERSION}\n` +
              `userAgent: ${navigator.userAgent}\n` +
              `loadToGet: ${startedAt - loadedAt}ms\n` +
              `scanDuration: ${Date.now() - startedAt}ms\n` +
              `visitorId: ${visitorId}\n` +
              `sessionId: ${sessionId}\n` +
              `stableId: ${stableId}\n` +
              `confidence: ${confidence}\n` +
              `stability: ${stability}\n` +
              `totalSignals: ${Object.keys(components).length}\n` +
              `stableSignals: ${Object.keys(SOURCES).filter((k) => SOURCES[k].stable).length}\n` +
              `components:\n${componentsToDebugString(components)}\n\`\`\``
          );
        }

        return { visitorId, sessionId, stableId, components, confidence, stability, version: VERSION };
      }
    };
  }

  return {
    load,
    matchComponents,
    componentsToDebugString,
    infHash256,
    VERSION
  };
});
