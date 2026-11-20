import { Composition } from "remotion";
import { loadVideoFonts } from "./fonts";
import { Intro } from "./Intro";
import { video } from "./theme";

loadVideoFonts();

export const RemotionRoot = () => (
  <Composition
    id="Intro"
    component={Intro}
    durationInFrames={video.durationInFrames}
    fps={video.fps}
    width={video.width}
    height={video.height}
  />
);
