import { useState, useRef, useCallback, useEffect } from "react";

interface AmbientMusicState {
  playing: boolean;
  toggle: () => void;
}

export function useAmbientMusic(): AmbientMusicState {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const buildGraph = useCallback(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const nodes: AudioNode[] = [];

    // Pad: detuned sine/triangle oscillators → low-pass filter → warm drone
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 350;
    padFilter.Q.value = 1;
    padFilter.connect(master);
    nodes.push(padFilter);

    const padFreqs = [130, 164, 196]; // C3-ish, E3-ish, G3-ish
    const padTypes: OscillatorType[] = ["sine", "triangle", "sine"];
    for (let i = 0; i < padFreqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = padTypes[i];
      osc.frequency.value = padFreqs[i];
      osc.detune.value = (Math.random() - 0.5) * 12; // slight detuning
      const g = ctx.createGain();
      g.gain.value = 0.4;
      osc.connect(g);
      g.connect(padFilter);
      osc.start();
      nodes.push(osc, g);
    }

    // Shimmer: higher oscillator with LFO-modulated gain
    const shimmerOsc = ctx.createOscillator();
    shimmerOsc.type = "sine";
    shimmerOsc.frequency.value = 523; // C5
    shimmerOsc.detune.value = 5;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.12;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.15; // slow pulse
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain);
    lfoGain.connect(shimmerGain.gain);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(master);
    shimmerOsc.start();
    lfo.start();
    nodes.push(shimmerOsc, shimmerGain, lfo, lfoGain);

    nodesRef.current = nodes;
  }, []);

  const toggle = useCallback(() => {
    if (!ctxRef.current) {
      buildGraph();
    }

    const ctx = ctxRef.current!;
    const master = masterGainRef.current!;
    const now = ctx.currentTime;

    if (!playing) {
      // Resume context (browser may have suspended it)
      if (ctx.state === "suspended") ctx.resume();
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.15, now + 1);
      setPlaying(true);
    } else {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 1);
      setPlaying(false);
    }
  }, [playing, buildGraph]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.close();
        ctxRef.current = null;
      }
    };
  }, []);

  return { playing, toggle };
}
