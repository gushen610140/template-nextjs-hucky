import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Fragment } from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import { Backdrop } from "./components/Backdrop";
import { Captions } from "./components/Captions";
import { Chrome } from "./components/Chrome";
import { captions } from "./data/captions";
import { AgentOps } from "./scenes/AgentOps";
import { Ai } from "./scenes/Ai";
import { Auth } from "./scenes/Auth";
import { Delivery } from "./scenes/Delivery";
import { Files } from "./scenes/Files";
import { Foundation } from "./scenes/Foundation";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";

/** 8 段 6084 帧，7 次 12 帧交叉淡入，净时长 6000 帧 = 200 秒。 */
const scenes = [
  { id: "hook", component: Hook, duration: 330, start: 0, chapter: "overview" },
  {
    id: "foundation",
    component: Foundation,
    duration: 720,
    start: 318,
    chapter: "foundation",
  },
  { id: "auth", component: Auth, duration: 960, start: 1026, chapter: "auth" },
  {
    id: "files",
    component: Files,
    duration: 780,
    start: 1974,
    chapter: "files",
  },
  { id: "ai", component: Ai, duration: 1380, start: 2742, chapter: "ai" },
  {
    id: "agent-ops",
    component: AgentOps,
    duration: 1050,
    start: 4110,
    chapter: "agent-ops",
  },
  {
    id: "delivery",
    component: Delivery,
    duration: 564,
    start: 5148,
    chapter: "delivery",
  },
  {
    id: "outro",
    component: Outro,
    duration: 300,
    start: 5700,
    chapter: "outro",
  },
] as const;

const TRANSITION = 12;

const AudioLayer = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Audio
      src={staticFile("music/bgm.mp3")}
      volume={(f) => {
        const fadeIn = Math.min(1, Math.max(0, f / 60));
        const fadeOut = Math.min(1, Math.max(0, (durationInFrames - f) / 110));
        return 0.3 * fadeIn * fadeOut;
      }}
    />
  );
};

export const Intro = () => (
  <AbsoluteFill>
    <Backdrop />

    <TransitionSeries>
      {scenes.map((scene, index) => {
        const Component = scene.component;
        return (
          <Fragment key={scene.id}>
            <TransitionSeries.Sequence durationInFrames={scene.duration}>
              <Component />
            </TransitionSeries.Sequence>
            {index < scenes.length - 1 ? (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION })}
              />
            ) : null}
          </Fragment>
        );
      })}
    </TransitionSeries>

    <Chrome
      chapters={scenes.map((scene) => ({
        label: scene.chapter,
        start: scene.start,
      }))}
    />
    <Captions lines={captions} />
    <AudioLayer />
  </AbsoluteFill>
);
