// Adapted from edit_script/examples/bin/edit.ts: place existing notebook media.
import { edit, frames, input } from "@iv/edit";

export default () => {
  const clip = input<string>("clip", "1.1");
  const timeline = edit.timeline();
  timeline.placeMedia(clip, { at: frames(0), length: frames(72) }).fillFrame();
  timeline.addText("A new perspective", { at: frames(0), length: frames(72) });
  return "Three-second cut ready";
};
