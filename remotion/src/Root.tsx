import { Composition } from "remotion";
import { CatWalk } from "./CatWalk";
import { RadialMenuDemo } from "./RadialMenuDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CatWalk"
        component={CatWalk}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RadialMenuDemo"
        component={RadialMenuDemo}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
