import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import { sceneIndexAt, sceneStartFrame, splitSentences, toSpoken } from '../psg/script';
import type { SceneSpec } from '../psg/types';

/** browser: Web Speech API · cloud: 합성된 오디오 파일(장면에 audioSrc) · off: 자막만 */
export type NarrationMode = 'browser' | 'cloud' | 'off';

export interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

/** 브라우저에서 쓸 수 있는 한국어 음성 목록 (voiceschanged 이후 채워진다) */
export function useKoreanVoices(): VoiceOption[] {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const load = () => {
      const all = speechSynthesis.getVoices();
      const ko = all.filter((v) => v.lang.toLowerCase().startsWith('ko'));
      const list = (ko.length ? ko : all).map((v) => ({ name: v.name, lang: v.lang, voice: v }));
      setVoices(list);
    };
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  return voices;
}

export const browserTtsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

interface Options {
  playerRef: React.RefObject<PlayerRef | null>;
  scenes: SceneSpec[];
  mode: NarrationMode;
  voice: SpeechSynthesisVoice | null;
  rate: number;
}

/**
 * Remotion Player 와 브라우저 TTS(Web Speech API)를 장면 단위로 동기화한다.
 *
 * - 장면에 들어서면 그 장면의 나레이션을 문장 단위로 읽는다.
 * - 나레이션이 장면 길이(추정치)보다 길면, 장면 마지막 프레임에서 잠시 멈춰 발화가 끝나기를 기다린 뒤 다음 장면으로 넘어간다.
 * - 사용자가 일시정지/탐색하면 발화도 함께 멈추거나 다시 시작한다.
 */
export function useNarration({ playerRef, scenes, mode, voice, rate }: Options) {
  const spokenScene = useRef(-1);
  const speaking = useRef(false);
  const waitingAtScene = useRef<number | null>(null);
  const programmaticPause = useRef(false);
  const [speakingNow, setSpeakingNow] = useState(false);

  const cancel = useCallback(() => {
    if (!browserTtsSupported) return;
    speechSynthesis.cancel();
    speaking.current = false;
    setSpeakingNow(false);
  }, []);

  const speakScene = useCallback(
    (idx: number) => {
      if (mode !== 'browser' || !browserTtsSupported) return;
      const scene = scenes[idx];
      if (!scene) return;
      speechSynthesis.cancel();
      const sentences = splitSentences(scene.narration).map(toSpoken);
      speaking.current = true;
      setSpeakingNow(true);
      let remaining = sentences.length;
      const finish = () => {
        speaking.current = false;
        setSpeakingNow(false);
        const player = playerRef.current;
        if (waitingAtScene.current === idx && player) {
          waitingAtScene.current = null;
          const next = idx + 1;
          if (next < scenes.length) {
            player.seekTo(sceneStartFrame(scenes, next));
            player.play();
          }
        }
      };
      for (const s of sentences) {
        const u = new SpeechSynthesisUtterance(s);
        u.lang = 'ko-KR';
        u.rate = rate;
        if (voice) u.voice = voice;
        u.onend = () => {
          remaining -= 1;
          if (remaining <= 0) finish();
        };
        u.onerror = (e) => {
          // 'interrupted'/'canceled' 는 우리가 cancel() 한 경우 — 무시
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          remaining -= 1;
          if (remaining <= 0) finish();
        };
        speechSynthesis.speak(u);
      }
    },
    [mode, playerRef, rate, scenes, voice],
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrame = (e: { detail: { frame: number } }) => {
      if (mode !== 'browser') return;
      const frame = e.detail.frame;
      const idx = sceneIndexAt(scenes, frame);
      if (!player.isPlaying()) return;

      if (idx !== spokenScene.current) {
        spokenScene.current = idx;
        speakScene(idx);
        return;
      }
      const end = sceneStartFrame(scenes, idx) + scenes[idx].durationInFrames;
      if (frame >= end - 1 && speaking.current && idx < scenes.length - 1) {
        // 발화가 아직 안 끝났으면 장면 끝에서 기다린다
        waitingAtScene.current = idx;
        programmaticPause.current = true;
        player.pause();
      }
    };
    const onPlay = () => {
      if (mode !== 'browser' || !browserTtsSupported) return;
      if (speechSynthesis.paused) speechSynthesis.resume();
    };
    const onPause = () => {
      if (mode !== 'browser' || !browserTtsSupported) return;
      if (programmaticPause.current) {
        programmaticPause.current = false;
        return;
      }
      if (speaking.current) speechSynthesis.pause();
    };
    const onSeeked = () => {
      if (mode !== 'browser') return;
      // 사용자가 탐색하면 현재 장면 나레이션을 처음부터 다시 읽는다
      if (waitingAtScene.current != null) return;
      cancel();
      spokenScene.current = -1;
    };
    const onEnded = () => {
      cancel();
      spokenScene.current = -1;
      waitingAtScene.current = null;
    };

    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('seeked', onSeeked);
    player.addEventListener('ended', onEnded);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('seeked', onSeeked);
      player.removeEventListener('ended', onEnded);
    };
  }, [cancel, mode, playerRef, scenes, speakScene]);

  // 모드/음성/대본이 바뀌거나 언마운트되면 발화 중단
  useEffect(() => {
    return () => cancel();
  }, [cancel, mode, scenes, voice, rate]);

  return { speakingNow, cancel };
}
