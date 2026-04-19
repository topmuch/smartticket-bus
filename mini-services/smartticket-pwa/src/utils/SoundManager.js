// ============================================
// SmartTicket Bus - Gestionnaire Audio (Bip)
// Génère des sons natifs via Web Audio API
// Pas besoin de fichiers audio externes
// ============================================

let audioCtx = null;

/**
 * Initialise le contexte audio (doit être appelé après une interaction utilisateur)
 * Certains navigateurs bloquent l'AudioContext tant qu'il n'y a pas eu de clic/tap
 */
export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

/**
 * Joue un bip de validation (ticket VALIDE)
 * Son montant : 880Hz → 1100Hz (confirmation positive)
 */
export const playBeepValid = () => {
  if (!audioCtx) return;
  try {
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 880;
    gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.15);

    // Deuxième ton montant après 180ms
    setTimeout(() => {
      if (!audioCtx) return;
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1100;
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.2);
    }, 180);
  } catch (e) {
    // Audio not supported, ignore silently
  }
};

/**
 * Joue un bip d'erreur (ticket INVALIDE)
 * Son grave : 300Hz sawtooth (alarme courte)
 */
export const playBeepInvalid = () => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 300;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    // Audio not supported, ignore silently
  }
};

/**
 * Joue un bip générique (scan détecté)
 * Son court : 1200Hz pendant 150ms
 */
export const playBeep = () => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // Audio not supported, ignore silently
  }
};

/**
 * Joue le bip approprié selon la validité du ticket
 */
export const playResultSound = (isValid) => {
  if (isValid) {
    playBeepValid();
  } else {
    playBeepInvalid();
  }
};
