const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["src/**/*.js", "example/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      // UMD wrapper uses script scope (not ES module)
      sourceType: "script",
      globals: {
        ...globals.browser,
        // UMD globals
        module: "writable",
        define: "readonly",
        // Explicit browser globals used in signals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        matchMedia: "readonly",
        performance: "readonly",
        screen: "readonly",
        // Web APIs used in signals
        OfflineAudioContext: "readonly",
        AudioContext: "readonly",
        RTCPeerConnection: "readonly",
        OffscreenCanvas: "readonly",
        IntersectionObserver: "readonly",
        IntersectionObserverEntry: "readonly",
        ResizeObserver: "readonly",
        MutationObserver: "readonly",
        navigation: "readonly",
        IdleDetector: "readonly",
        showOpenFilePicker: "readonly",
        AmbientLightSensor: "readonly",
        Accelerometer: "readonly",
        Gyroscope: "readonly",
        Worker: "readonly",
        SharedWorker: "readonly",
        BroadcastChannel: "readonly",
        WebAssembly: "readonly",
        DeviceMotionEvent: "readonly",
        DeviceOrientationEvent: "readonly",
      },
    },
    rules: {
      // Warnings only — do not block CI
      "no-unused-vars": "warn",
      "no-undef": "warn",
      // Errors — genuine code quality issues
      eqeqeq: "error",
      "no-eval": "error",
      semi: ["error", "always"],
      // UMD pattern assigns to `global` intentionally; new ESLint v10 rule
      "no-useless-assignment": "warn",
      // Intentional empty catch blocks are common in feature-detection code
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
