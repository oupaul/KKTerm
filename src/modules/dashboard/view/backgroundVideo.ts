export interface DashboardBackgroundVideoElement {
  defaultMuted: boolean;
  loop: boolean;
  muted: boolean;
  paused: boolean;
  volume: number;
  pause: () => void;
  play: () => Promise<void>;
}

export function syncBackgroundVideoPlayback(
  video: DashboardBackgroundVideoElement | null,
  shouldPlay: boolean,
) {
  if (!video) return;

  video.defaultMuted = true;
  video.loop = true;
  video.muted = true;
  video.volume = 0;

  if (shouldPlay) {
    if (video.paused) {
      void video.play().catch(() => {
        // Browser/Tauri autoplay policy can reject; the next active sync or user gesture can retry.
      });
    }
    return;
  }

  if (!video.paused) {
    video.pause();
  }
}
