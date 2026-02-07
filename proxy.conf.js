// Source - https://stackoverflow.com/q/65190345
// Posted by MattMan569
// Retrieved 2026-02-04, License - CC BY-SA 4.0

// proxy.conf.js
// COOP-Headers werden NICHT hier gesetzt - nur in firebase.json für Production!
// Development Server sollte KEINE Security-Header setzen, um Auth-Popups zu ermöglichen

module.exports = {
  // Proxy für Firebase Functions Emulator (optional)
  // Falls nicht verwendet, kann diese Datei ignoriert werden
  "/api": {
    target: "http://localhost:5001",
    secure: false,
    changeOrigin: true,
    logLevel: "debug"
  }
};
