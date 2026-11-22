/**
 * Sons chiptune synthétisés dans le navigateur (aucun fichier audio).
 * Le contexte audio ne démarre qu'après un geste du joueur.
 */

type Preset = "funky" | "upbeat" | "tense" | "lofi" | "none";

const SCALES: Record<Exclude<Preset, "none">, number[]> = {
  funky: [0, 3, 5, 7, 10, 12],
  upbeat: [0, 4, 7, 9, 12, 16],
  tense: [0, 1, 5, 6, 8, 12],
  lofi: [0, 3, 7, 10, 14, 15],
};

export class Chip {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  sfxOn = true;
  musicOn = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType = "square", delay = 0, vol = 1): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  sfx(name: "click" | "good" | "bad" | "tick" | "win" | "lose" | "coin" | "hit"): void {
    if (!this.sfxOn) return;
    switch (name) {
      case "click": return this.tone(660, 0.05);
      case "tick": return this.tone(1200, 0.02, "square", 0, 0.4);
      case "good": this.tone(660, 0.08); return this.tone(990, 0.12, "square", 0.08);
      case "bad": this.tone(220, 0.12, "sawtooth"); return this.tone(150, 0.2, "sawtooth", 0.1);
      case "coin": this.tone(988, 0.06); return this.tone(1319, 0.2, "square", 0.06);
      case "hit": return this.tone(110, 0.15, "triangle");
      case "win": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, "square", i * 0.1)); return;
      case "lose": [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.2, "triangle", i * 0.14)); return;
    }
  }

  /**
   * Petites musiques des moments clés, façon borne d'arcade (une seule voix, quelques notes) :
   * ready (début), clear (niveau réussi), boss (arrivée du boss), oneup (vie bonus), gameover, hiscore (record).
   */
  jingle(kind: "ready" | "clear" | "boss" | "oneup" | "gameover" | "hiscore"): void {
    if (!this.sfxOn) return;
    const seq: Record<string, Array<[number, number, OscillatorType?]>> = {
      ready: [[523, 0.09], [659, 0.09], [784, 0.16]],
      clear: [[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.22]],
      boss: [[196, 0.18, "sawtooth"], [185, 0.18, "sawtooth"], [175, 0.18, "sawtooth"], [147, 0.4, "sawtooth"]],
      oneup: [[1319, 0.07], [1568, 0.07], [2637, 0.07], [2093, 0.07], [2349, 0.07], [3136, 0.16]],
      gameover: [[392, 0.22, "triangle"], [370, 0.22, "triangle"], [349, 0.22, "triangle"], [262, 0.5, "triangle"]],
      hiscore: [[523, 0.1], [523, 0.1], [784, 0.1], [784, 0.1], [880, 0.1], [880, 0.1], [784, 0.3]],
    };
    let at = 0;
    for (const [f, d, type] of seq[kind] ?? []) { this.tone(f, d, type ?? "square", at, 0.8); at += d * 0.95; }
  }

  /** Note d'une touche de la mécanique « sequence » (gamme pentatonique). */
  pad(index: number, dur = 0.28): void {
    if (!this.sfxOn) return;
    const notes = [330, 392, 440, 523, 587, 659];
    this.tone(notes[index % notes.length]!, dur, "square", 0, 0.8);
  }

  /** Bip court à fréquence libre (aiguille de jauge, apparition d'une cible…). */
  blip(freq: number, dur = 0.04): void {
    if (this.sfxOn) this.tone(freq, dur, "square", 0, 0.35);
  }

  /** Petite boucle basse + arpège selon le preset de la cartouche. */
  startMusic(preset: Preset, bpm = 120): void {
    this.stopMusic();
    if (preset === "none" || !this.musicOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const scale = SCALES[preset];
    const root = preset === "tense" ? 110 : preset === "lofi" ? 98 : 131;
    const step = 60 / bpm / 2;
    let n = 0;
    this.musicTimer = setInterval(() => {
      if (!this.musicOn) return;
      const bar = Math.floor(n / 8) % 4;
      const shift = [0, 5, 3, 7][bar]!;
      if (n % 4 === 0) this.tone(root * Math.pow(2, shift / 12) / 2, step * 1.8, "triangle", 0, 0.7);
      const deg = scale[(n * 3 + bar) % scale.length]!;
      this.tone(root * 2 * Math.pow(2, (deg + shift) / 12), step * 0.8, "square", 0, 0.25);
      n++;
    }, step * 1000);
  }

  stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
