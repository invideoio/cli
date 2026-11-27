// Compile-time assertions: each excluded operation must remain a type error.
import { edit } from "@iv/edit";
import { gen } from "@iv/gen";
import { score } from "@iv/score";
import { media } from "@iv/media";
import { notebook } from "@iv/notebook";

export default () => {
  // @ts-expect-error Public scripts cannot render a timeline.
  edit.timeline().render();
  // @ts-expect-error Public scripts cannot analyze a rendered mix.
  edit.timeline().analyze();
  // @ts-expect-error Workflow execution is unavailable.
  edit.run("cut.ts");
  // @ts-expect-error Export is unavailable.
  edit.export();
  // @ts-expect-error New editors are unavailable.
  edit.newEdit({ title: "Other" });
  // @ts-expect-error A generation agent has unquoted spend.
  gen.agent("Make a film");
  // @ts-expect-error Unknown generators are unavailable.
  gen.unapproved_generator;
  // @ts-expect-error Score rendering is unavailable.
  score.render("", {});
  // @ts-expect-error Separately charged analysis is unavailable.
  media.describe("1.1");
  // @ts-expect-error Transcription is unavailable.
  media.audio.transcript("1.1");
  // @ts-expect-error Notebook writes are unavailable.
  notebook.write("/lib/x.ts", "");
  // @ts-expect-error Thread-scoped reads are unavailable.
  notebook.read("/notebook/page-1/thread-1/x.txt");
  // @ts-expect-error Making threads is unavailable.
  notebook.thread({ title: "Other" });
};
