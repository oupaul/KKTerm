import { syncBackgroundVideoPlayback } from "./backgroundVideo";

function createVideoStub(paused: boolean) {
  return {
    defaultMuted: false,
    loop: false,
    muted: false,
    paused,
    playCalls: 0,
    pauseCalls: 0,
    volume: 1,
    play() {
      this.playCalls += 1;
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    },
  };
}

const pausedVideo = createVideoStub(false);
syncBackgroundVideoPlayback(pausedVideo, false);

if (!pausedVideo.paused || pausedVideo.pauseCalls !== 1 || pausedVideo.playCalls !== 0) {
  throw new Error("Inactive Dashboard video wallpaper should pause without replaying.");
}

if (!pausedVideo.loop || !pausedVideo.defaultMuted || !pausedVideo.muted || pausedVideo.volume !== 0) {
  throw new Error("Dashboard video wallpaper should always stay looped and muted.");
}

const playingVideo = createVideoStub(true);
syncBackgroundVideoPlayback(playingVideo, true);

if (playingVideo.paused || playingVideo.playCalls !== 1 || playingVideo.pauseCalls !== 0) {
  throw new Error("Active Dashboard video wallpaper should resume playing.");
}
