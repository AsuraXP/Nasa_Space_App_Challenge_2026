import { u as useThree, r as React, a as useFrame, j as jsx } from './r3f-BNacQy8Q.js';
import { g as animate } from './motion-Cv7Rbbxj.js';
import { c as Vector3 } from './three-CxkaggD8.js';
import { u as useSettings, a as useScene } from './index-BS4g53at.js';
import { P as Planet } from './Planet-BHsR4hM3.js';
import './Experience-Nj6LORV9.js';
import './fx-B4siyfXL.js';

const moonPosition = [9, 1.1, -6];
const INTRO_SECONDS = 20;
const INTRO_AUDIO = [
  new URL('./intro-1.mp3', import.meta.url).href,
  new URL('./intro-2.mp3', import.meta.url).href,
  new URL('./intro-3.mp3', import.meta.url).href,
];
const INTRO_AUDIO_STARTS = [1500, 9000, 14500];

function IntroAudio({ ready, reduceMotion, muted }) {
  React.useEffect(() => {
    if (!ready || reduceMotion || muted) return undefined;

    const clips = INTRO_AUDIO.map(url => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      return audio;
    });
    const startedAt = performance.now();
    const timers = [];
    let active = true;
    let pendingIndex = -1;

    const playClip = index => {
      if (!active || pendingIndex !== -1 && pendingIndex !== index) return;
      const audio = clips[index];
      const elapsed = Math.max(0, performance.now() - startedAt - INTRO_AUDIO_STARTS[index]) / 1000;
      if (elapsed < audio.duration || !Number.isFinite(audio.duration)) {
        audio.currentTime = Math.max(0, elapsed);
      }
      pendingIndex = -1;
      const result = audio.play();
      if (result?.catch) {
        result.catch(() => {
          if (active) pendingIndex = index;
        });
      }
    };

    const resumeAfterGesture = () => {
      if (pendingIndex !== -1) playClip(pendingIndex);
    };
    window.addEventListener('pointerdown', resumeAfterGesture, { once: false });
    window.addEventListener('keydown', resumeAfterGesture, { once: false });

    INTRO_AUDIO_STARTS.forEach((delay, index) => {
      timers.push(window.setTimeout(() => playClip(index), delay));
    });

    return () => {
      active = false;
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener('pointerdown', resumeAfterGesture);
      window.removeEventListener('keydown', resumeAfterGesture);
      clips.forEach(audio => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });
    };
  }, [ready, reduceMotion, muted]);

  return null;
}

function IntroScene() {
  const camera = useThree(state => state.camera);
  const muted = useSettings(state => state.muted);
  const reduceMotion = useSettings(state => state.reduceMotion);
  const ready = useScene(state => state.ready);
  const finishIntro = useScene(state => state.finishIntro);
  const target = React.useRef(new Vector3(0, 0, 0));

  React.useEffect(() => {
    if (reduceMotion) {
      camera.position.set(-3.2, 1.8, 8.5);
      target.current.set(2.5, 0.3, -1.6);
      return undefined;
    }

    camera.position.set(0.4, 0.5, 2.7);
    target.current.set(0, 0, 0);
    const timeline = animate.timeline({
      onComplete: finishIntro,
    });
    timeline
      .to(camera.position, { x: -3.2, y: 1.8, z: 8.5, duration: 9, ease: 'power1.inOut' }, 0)
      .to(target.current, { x: moonPosition[0], y: moonPosition[1], z: moonPosition[2], duration: 6, ease: 'power2.inOut' }, 7)
      .to(camera.position, { x: 7.6, y: 1.3, z: -4.4, duration: INTRO_SECONDS - 9, ease: 'power2.inOut' }, 9);
    return () => timeline.kill();
  }, [camera, finishIntro, reduceMotion]);

  useFrame(() => camera.lookAt(target.current));

  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx(IntroAudio, {
        ready,
        reduceMotion,
        muted,
      }),
      jsx.jsx(Planet, { kind: 'earth', radius: 1, spin: 0.03 }),
      jsx.jsx(Planet, { kind: 'moon', radius: 0.27, position: moonPosition }),
    ],
  });
}

export { INTRO_SECONDS, IntroScene as default };
