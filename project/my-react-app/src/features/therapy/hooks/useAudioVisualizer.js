import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useAudioVisualizer
 * 
 * Encapsulates Web Audio API microphone capture + real-time FFT analysis.
 * Returns frequency data, normalized amplitude, and mic control functions.
 * Renders a spectral visualizer onto a provided canvas ref.
 */
const useAudioVisualizer = () => {
  const [amplitude, setAmplitude] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isMicDenied, setIsMicDenied] = useState(false);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const frequencyDataRef = useRef(new Uint8Array(128));
  const peakAmplitudeRef = useRef(0);

  // ── Start microphone & Web Audio pipeline ──
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false,
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      analyserRef.current = analyser;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount; // 128
      const dataArray = new Uint8Array(bufferLength);
      frequencyDataRef.current = dataArray;

      setIsActive(true);
      setIsMicDenied(false);

      // 60fps data pump loop
      const pump = () => {
        animFrameRef.current = requestAnimationFrame(pump);
        analyser.getByteFrequencyData(dataArray);

        // Compute Root Mean Square (RMS) amplitude normalized (0-100)
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normVal = dataArray[i] / 255;
          sumSquares += normVal * normVal;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const normalized = Math.min(100, Math.round(rms * 250));
        setAmplitude(normalized);

        if (normalized > peakAmplitudeRef.current) {
          peakAmplitudeRef.current = normalized;
        }
      };

      pump();
    } catch (err) {
      // Gracefully handle microphone busy / unavailable / denied state
      setIsMicDenied(true);
      setIsActive(true);

      // Fallback: generate smooth ambient visualizer wave
      const fakeData = new Uint8Array(128);
      frequencyDataRef.current = fakeData;
      let step = 0;

      const fakePump = () => {
        animFrameRef.current = requestAnimationFrame(fakePump);
        step += 0.06;
        for (let i = 0; i < 128; i++) {
          fakeData[i] = Math.floor(20 + Math.sin(i * 0.15 + step) * 15 + Math.random() * 8);
        }
        setAmplitude(Math.floor(10 + Math.sin(step) * 8));
      };

      fakePump();
    }
  }, []);

  // ── Stop microphone & clean up ──
  const stopMic = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setIsActive(false);
    setAmplitude(0);
  }, []);

  // ── Get peak amplitude since last reset ──
  const getPeakAmplitude = useCallback(() => {
    return peakAmplitudeRef.current;
  }, []);

  const resetPeakAmplitude = useCallback(() => {
    peakAmplitudeRef.current = 0;
  }, []);

  // ── Draw spectral visualizer onto a canvas ──
  const drawVisualizer = useCallback(
    (canvas, { isCharging = false } = {}) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const data = frequencyDataRef.current;
      const bufferLength = data.length;

      ctx.clearRect(0, 0, width, height);

      const time = performance.now() / 1000;
      
      // Check if audio data is basically silent/empty
      let isSilent = true;
      for (let i = 0; i < bufferLength; i++) {
        if (data[i] > 5) {
          isSilent = false;
          break;
        }
      }

      if (isSilent || !isCharging) {
        // ── FALLBACK: Ambient Animated Sine Wave ──
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)'; // soft cyan pulse
        
        for (let i = 0; i < width; i += 5) {
          // Create a gentle rolling wave based on time and x-position
          const y = height / 2 + Math.sin(i * 0.02 + time * 2) * 15 + Math.cos(i * 0.01 + time) * 10;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();

        // Optional: add a subtle glow
        ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        return; // Skip drawing spectral bars
      }

      // ── ACTIVE: Draw frequency bars ──
      const barWidth = (width / bufferLength) * 2.2;
      let x = (width - barWidth * bufferLength) / 2; // center bars

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (data[i] / 255) * height * 0.9;

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);

        if (isCharging && data[i] > 60) {
          // Energetic: blue → green → gold
          gradient.addColorStop(0, '#3b82f6');
          gradient.addColorStop(0.4, '#22d3ee');
          gradient.addColorStop(0.7, '#4ade80');
          gradient.addColorStop(1, '#fbbf24');
        } else {
          // Resting: soft blue hum
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.5)');
          gradient.addColorStop(1, 'rgba(96, 165, 250, 0.7)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(
            x,
            height - barHeight,
            Math.max(1, barWidth - 2),
            barHeight,
            [3, 3, 0, 0]
          );
        } else {
          ctx.rect(x, height - barHeight, Math.max(1, barWidth - 2), barHeight);
        }
        ctx.fill();

        // Glow effect when charging
        if (isCharging && data[i] > 80) {
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        x += barWidth;
      }

      // Overlay wave line when charging
      if (isCharging) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        const sliceWidth = width / bufferLength;
        let waveX = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = data[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(waveX, y);
          else ctx.lineTo(waveX, y);
          waveX += sliceWidth;
        }
        ctx.stroke();
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
    };
  }, [stopMic]);

  return {
    amplitude,
    isActive,
    isMicDenied,
    startMic,
    stopMic,
    drawVisualizer,
    getPeakAmplitude,
    resetPeakAmplitude,
    frequencyDataRef,
  };
};

export default useAudioVisualizer;
