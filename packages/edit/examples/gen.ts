// Adapted from edit_script/examples/hello/edit.ts: generated media on a timeline.
import { edit, frames } from "@iv/edit";
import { gen } from "@iv/gen";

export default async () => {
  const shot = await gen.nanobanana_2.INGREDIENTS({
    prompt: "A red lamp on a plain white background, product photograph",
    aspect_ratio: "16:9",
  });
  edit.timeline().placeMedia(shot, { at: frames(0), length: frames(72) }).fillFrame();
  return shot.id;
};
