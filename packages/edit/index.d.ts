declare module "@iv/edit" {
  export const edit: Edit;
  export const frames: typeof globalThis.frames;
  export const seconds: typeof globalThis.seconds;
  export const time: typeof globalThis.time;
  export const source: typeof __iv_source;
  export const beatGrid: typeof globalThis.beatGrid;
  export const input: typeof globalThis.input;
  export const stagger: typeof globalThis.stagger;
  export const textShader: typeof globalThis.textShader;
  export const spring: typeof globalThis.spring;
  export default edit;
}

declare module "@iv/types" {
  export type Time = globalThis.Time;
  export type SourceTime = globalThis.SourceTime;
  export type Span<T = globalThis.SourceTime> = globalThis.Span<T>;
  export type Media = globalThis.Media;
  export type Sequence = globalThis.Sequence;
  export type SubagentInput = globalThis.SubagentInput;
  export type Source = globalThis.Source;
  export type MediaRef = globalThis.MediaRef;
  export type AssetMetadata = globalThis.AssetMetadata;
  /**
   * The errors scripts catch by class (`e instanceof ModerationError`). Abstract: hosts throw a subclass.
   * status: "refused" (nothing happened, fix and retry), "failed", "completion_unknown" (may have landed).
   */
  export abstract class IvError extends Error {
    readonly status: "refused" | "failed" | "completion_unknown";
    /** Stable; the public envelope's codes where they exist. */
    readonly code: string;
    readonly message: string;
    readonly at?: { file: string; line: number; col: number };
    readonly charged: boolean;
  }
  /** A bad argument, or an input past a service or input limit (reason "too_long", "too_many", "not_applicable", ...). */
  export class InputError extends IvError {
    field: string;
    reason: string;
    max?: number;
    /** A score with errors (`@iv/score`): its check report; every error is in `report.diagnostics`, with its `line:col` in the score. */
    report?: import("@iv/score").ScoreReport;
  }
  export class NotAvailableError extends IvError { module: string; context: string }
  export class PermissionError extends IvError { path?: string }
  /** Every spend limit: the wallet, the project's budget or the user's. */
  export class CreditsError extends IvError { scope: "wallet" | "project" | "user"; needed?: number; available?: number }
  export class ConsentError extends IvError { items: string[] }
  export class ModerationError extends IvError { subagent?: string }
  export class ConflictError extends IvError {}
  export class CancelledError extends IvError {}
  export class ServiceError extends IvError { service: "st" | "media-router" | "gen" | "agent"; retried: number }
  /** For fan-outs where some items may fail. */
  export function attempt<T>(p: Promise<T> | T): Promise<{ ok: true; value: T } | { ok: false; error: unknown }>;
}

declare module "@iv/score" {
  /** A score.track/0.1 object in camelCase (cyclesPerBar, firstDownbeatS, ...): what phase 3's score.track() returns. */
  export type ScoreTrack = Record<string, unknown>;
  export interface ScoreCheckOptions {
    track?: ScoreTrack | ScoreTrackResult; // default: one 4/4 bar at 120 bpm (W_CHECK_ONE_BAR)
    span?: [string, string]; // cycles as rational strings, e.g. ["0", "16"]
    catalogue?: string[] | false; // sound names; default: the renderer catalogue built in; false skips that stage
    hitSeverity?: "error" | "warn"; // off/missing hits; default "error"
    /** Tokens standing for template holes (e.g. ["ph0x", "ph1x"]): 3-64 of [A-Za-z0-9_], a letter first, a letter or
     * digit last, no language/sound/note name, none inside another, at most 256. Where a token appears, the check
     * reads it by position (a word in a mini string, silence as a pattern, identity as a transform or function, 1 as
     * a number) and reports W_PLACEHOLDERS first; the hits stage is skipped. Recheck once the holes are filled. */
    placeholders?: string[];
    file?: string; // the .score path; adds `at` to each located diagnostic
  }
  export interface ScoreSpan {
    line: number;
    col: number;
    start: number;
    end: number;
    start16: number;
    end16: number;
  }
  export interface ScoreDiagnostic {
    /** "render" only in a render report (the renderer's exit-1 report); `check` never emits it. */
    /** The catalogue stage also carries the 0.2 bank warnings: `W_BANK_ALIAS`, `W_BANK_FALLBACK`, `W_UNKNOWN_BANK`. */
    stage: "parse" | "events" | "catalogue" | "hits" | "render";
    code: string;
    severity: "error" | "warning";
    message: string;
    hint?: string;
    span: ScoreSpan | null;
    /** The span's line and column in the score text (absent with no span). */
    line?: number;
    col?: number;
    at?: string;
    count?: number;
    firstAt?: string;
    related: unknown[];
    hit?: string;
  }
  export type ScoreStage = "ok" | "warning" | "error" | "skipped";
  export interface ScoreReport {
    ok: boolean;
    engine: string;
    window: [string, string] | null;
    /** Null identity fields: a caller-given catalogue carries no schema, renderer or bank. */
    catalogue: {
      schema: string | null;
      renderer: string | null;
      bank: string | null;
      bankMapSha256: string | null;
      source: "embedded" | "given";
    } | null;
    /** `render` is present only in a render report. */
    stages: { parse: ScoreStage; events: ScoreStage; catalogue: ScoreStage; hits: ScoreStage; render?: ScoreStage };
    skipped: Record<string, string>;
    events: number;
    parts: { name: string; events: number; sounds: string[]; hits: string[] }[];
    hits: { id: string; status: "ok" | "off" | "missing" | "not_checked"; errorMs: number | null; atS: number }[];
    diagnostics: ScoreDiagnostic[];
    counts: { errors: number; warnings: number };
  }
  /**
   * Cycles. `span` and `whole` are rational cycle strings ("0", "3/2"). One cycle is one bar by default
   * (`cyclesPerBar: "1"`). A constant track has cps = bpm / 60 / beatsPerBar: 120 bpm in 4/4 is 0.5 cycles a
   * second, a bar every 2 s. Music time in seconds is `onsetS`, `durS`, `atS`, and `at` as a SourceTime
   * (seconds from the music's start, which is the rendered clip's source time: `clip.toTimeline(at)` places it).
   */
  export interface ScoreQueryOptions {
    /** A track (camelCase) or the result of `score.track()`. Default: one 4/4 bar at 120 bpm. */
    track?: ScoreTrack | ScoreTrackResult;
    /** The .score path; adds `at` to each located diagnostic and locates a thrown error. */
    file?: string;
  }
  export interface ScoreEventFilter extends ScoreQueryOptions {
    /** Cycles; default the track's window. At most 4096 cycles. */
    span?: [string, string];
    parts?: string[];
    where?: Record<string, unknown>;
    hit?: string;
    section?: string;
    /** Rows returned; default 1000, at most 10000. `count` and `truncated` describe the full result. */
    limit?: number;
  }
  /** A diagnostic of a query: the check's, without a stage. */
  export interface ScoreQueryDiagnostic {
    code: string;
    severity: "error" | "warning";
    message: string;
    hint?: string;
    span: ScoreSpan | null;
    /** The span's line and column in the score text (absent with no span). */
    line?: number;
    col?: number;
    at?: string;
    count?: number;
    firstAt?: string;
    related?: unknown[];
  }
  export interface ScoreEventRow {
    part: string;
    /** Music time: the rendered clip's source time. */
    at: SourceTime;
    onsetS: number;
    durS: number;
    /** The event's whole, in cycles, as the engine gives them (null for a continuous event). */
    whole: [string, string] | null;
    midi?: number;
    /** The event's controls (`s`, `note`, `gain`, ...), untouched. */
    value: Record<string, unknown>;
    hit?: string;
  }
  export interface ScoreEvents {
    events: ScoreEventRow[];
    count: number;
    truncated: boolean;
    diagnostics: ScoreQueryDiagnostic[];
  }
  export interface ScoreHitRow {
    id: string;
    kind: string;
    weight: number;
    status: "ok" | "off" | "missing";
    at: SourceTime;
    atS: number;
    tS: number | null;
    /** The hit's cycle, a rational string. */
    cycle: string;
    /** The nearest tagged event's error, in ms; null with no tagged event. */
    errorMs: number | null;
    /** Tagged events. */
    events: number;
    /** Untagged events that start on the hit. */
    coincident: number;
  }
  export interface ScoreHits {
    hits: ScoreHitRow[];
    diagnostics: ScoreQueryDiagnostic[];
  }
  export interface ScorePartRow {
    name: string;
    kind: string;
    muted: boolean;
    description: string | null;
    span: ScoreSpan;
    eventCount: number;
    sounds: string[];
    noteRange: [number, number] | null;
    hits: string[];
  }
  export interface ScoreParts {
    parts: ScorePartRow[];
    diagnostics: ScoreQueryDiagnostic[];
  }
  export interface ScoreEdit {
    /** A part name, or { part } / { binding }. */
    target: string | { part: string } | { binding: string };
    op: "replace" | "chain" | "wrap" | "add" | "remove" | "mute" | "unmute" | "rename";
    /** The score-lang to insert. */
    code?: string;
  }
  /** `ok: false` keeps the old text: the input was fine, the edit is a request to rephrase. */
  export interface ScoreWithResult {
    ok: boolean;
    text: string;
    changes: unknown[];
    diagnostics: ScoreQueryDiagnostic[];
  }

  export interface ScoreHitInput {
    id: string;
    t: number;
    kind: "downbeat" | "beat" | "accent" | "stinger" | "cut";
    weight: number;
  }
  export interface ScoreTrackOptions {
    hits: ScoreHitInput[];
    duration: number;
    fps: number;
    bpmRange: [number, number];
    bpmPrior?: number;
    sections?: string;
    bpm?: number;
    firstDownbeat?: number;
    id?: string;
  }
  export interface ScoreTrackResult {
    /** camelCase; passes back into every member. */
    track: ScoreTrack;
    bpm: number;
    firstDownbeatS: number;
    /** The heard music length at 48 kHz: with `splices`, the length after the inserts and cuts, which is what `score.render` renders. */
    samples: number;
    residuals: { id: string; residualMs: number; place: "grid" | "offgrid" }[];
  }

  export interface ScoreRenderOptions {
    /** Required. */
    track: ScoreTrack | ScoreTrackResult;
    /** Default 7. */
    seed?: number;
    /** Default "error": a missed hit blocks the render. Goes to the renderer as hit_severity. */
    hitSeverity?: "error" | "warn";
    /** The master limiter's ceiling in dB true peak, -24 to 0 (e.g. -1 for delivery). Default: absent, no master limiter.
     * Goes to the renderer as limit_dbtp and is part of the render's key, so a different ceiling is a different render. */
    limitDbtp?: number;
    /** A short human name for the cue (the notebook item and file names); defaults to the script's name. Trimmed, at most 80 characters. */
    name?: string;
    /** The .score path; locates the gate's diagnostics. */
    file?: string;
  }
  export interface ScoreMediaFacts {
    key: string;
    mediaType: "audio";
    duration: number;
    sampleRate: number;
    channels: number;
    estimated?: string[];
  }
  export interface ScoreRender {
    /** score.render.key/3, from the renderer. */
    key: string;
    media: ScoreMediaFacts;
    /** score.receipt/3, verbatim (snake_case). */
    receipt: unknown;
    /** The renderer's run facts, verbatim; this host adds `sequence`, the notebook Sequence the render landed as ("3.1"), and `source`, the kept score ("/lib/scores/switzerland.score", its options beside it in switzerland.track.json). Null in a plan. */
    facts: ({ sequence?: string; source?: string } & Record<string, unknown>) | null;
    warnings: ScoreQueryDiagnostic[];
  }
  /** The rendered cue: placeable while pending (`edit.bin.add(audio, { name: "Theme" })`, then `tl.placeMedia(item, { audioTrack })`; without `name` the Media panel shows the key's `<sha>.wav`). */
  /** `duration`, `length`, `samples`, `sampleRate` and `channels` are the host's plan until `ready()` resolves, then the rendered file's. */
  export interface ScoreAudio extends HostHandle {
    readonly id: string;
    /** Seconds, as the host declared them. */
    readonly duration: number;
    readonly length: SourceTime;
    readonly samples: number;
    readonly sampleRate: number;
    readonly channels: number;
    /** Resolves when the host has rendered it; rejects with the render's error. */
    ready(): Promise<ScoreRender>;
  }

  export interface ScoreApi {
    /** Check a score without rendering it. Never refuses for a problem in the score: read `ok`. */
    check(text: string, opts?: ScoreCheckOptions): ScoreReport;
    /** The onset events of the window (or `span`). Throws InputError (`e.report`) on a score that does not parse. */
    events(text: string, opts?: ScoreEventFilter): ScoreEvents;
    /** One row per track hit. Throws InputError on a score that does not parse. */
    hits(text: string, opts?: ScoreQueryOptions): ScoreHits;
    /** The parts of the score. Throws InputError on a score that does not parse. A header comment directly above the first part is reported as its description (engine behaviour). */
    parts(text: string, opts?: ScoreQueryOptions): ScoreParts;
    /** A minimal text edit. Throws InputError on a score that does not parse; an edit it cannot make is `ok: false`. */
    with(text: string, edit: ScoreEdit, opts?: ScoreQueryOptions): ScoreWithResult;
    /** Solve a track from the picture's hits. Throws InputError `invalid_brief` (with `field` and `reason`) on a brief it refuses or finds no grid for. */
    track(opts: ScoreTrackOptions): ScoreTrackResult;
  }
  export const score: ScoreApi;
  export const check: ScoreApi["check"];
  /** There is no named `with` (a reserved word): call `score.with`. */
  export const events: ScoreApi["events"];
  export const hits: ScoreApi["hits"];
  export const parts: ScoreApi["parts"];
  export const track: ScoreApi["track"];
  export default score;
}

declare module "@iv/gen" {
  
  export const gen: Gen;
  
}

declare module "@iv/media" {
  export const media: typeof __iv_media;
}

declare module "@iv/notebook" {
  export const notebook: typeof __iv_notebook;
}

// timeline.d.ts — ambient types for iv-pro-engine scripts.
// Generated by `timeline build --types`; do not edit.
//
// Start here:
//   // build (`timeline build edit.ts`): the edit starts empty; make a timeline first
//   const tl = edit.newTimeline({ fps: 30, size: [1920, 1080] });
//   tl.placeMedia("clips/intro.mp4", { at: frames(0) });
//   // scripting an existing edit (`timeline run x.ts --on edit.iv`):
//   const tl = edit.timeline();
//
// A script runs ONCE and edits an iv-pro-engine EDIT (the document: one or
// more timelines and a bin). It does not draw pixels: every call adds or
// changes clips, keyframes, effects, transitions.
//
// `edit` is pre-bound in both ways in:
// - Building a new edit (`timeline build edit.ts`): `edit` starts empty;
//     const tl = edit.newTimeline({ fps: 24, size: [1080, 1080] });
// - Scripting an existing edit (`timeline run restyle.ts --on edit.iv`):
//   edit.timeline() is the active timeline, edit.timeline("Name" | "T2")
//   another one; edit.selection / playhead / range come from the caller
//   (--context). Every call names its receiver.
//
// A run is one transaction: if any call is refused, NOTHING is written.
// Refused calls do not throw; each is recorded at its line (with the legal
// values and a fix) and the script keeps going, so one run reports every
// error. A value returned by a refused call is poisoned: using it is
// reported as "shoe.addEffect: not checked: depends on line 5". The last
// write wins: a run applies to the edit as it is when the run starts.
// `timeline run --plan` checks a script without writing; `--json` prints
// the receipt (ScriptReceipt below).
//
// Time
// - Every time carries its unit: frames(36), seconds(1.5), a beat of a
//   BeatGrid (grid.beat(4)), or arithmetic on those (t.plus(frames(2))).
//   Bare numbers and strings are refused ("time needs a unit").
// - Rounding: a time written in seconds (seconds(1.51), "1.51s",
//   source.seconds(0.22), or arithmetic with a seconds part) rounds to the
//   nearest frame of the timeline it is used on, a half frame to the later
//   one: seconds(1.51) at 24 fps is frames(36), seconds(0.15) at 30 fps is
//   frames(5). A time written only in frames is exact: frames(1.5) or
//   frames(7).times(0.5) is refused with the two nearest frames.
// - Source-media time (a position inside a clip's media) is a different type:
//   source.seconds(2.4) / source.frames(58). The two are never mixed.
// - Reads return Time (clip.start, clip.end, clip.length, tl.duration);
//   receipts, describe() and inspect() print times as { frames, seconds }.
// - Points and lengths: a grid beat (grid.beat(4), snap, marker, all,
//   each), clip.start / clip.end, a marker's `at`, edit.playhead and
//   edit.range are POINTS on the timeline; frames(n), seconds(n),
//   grid.beats(n) and clip.length are LENGTHS. point ± length = point;
//   point - point = length. Where a clip-local time is expected (keyframe
//   `at`, animate's `at`, bounds' `at`), a point counts from the clip's
//   start, so `card.popIn({ at: grid.beat(4) })` pops on beat 4.
//
// Layout (say where, not the pixels)
// - place: one of 9 anchors ("center", "top", "bottom", "left", "right",
//   "top-left", "top-right", "bottom-left", "bottom-right") with `margin`
//   (px or "5%"), inside the frame or `within: "safe"` (tl.safeArea).
//     tl.addText("KICKS", { font, fontSize: 160, place: "bottom", margin: "4%", within: "safe" })
// - Sizes and positions also take "%" of the frame: width: "80%", x: "-25%".
//   Media: fit: "contain" (fits the frame; how media is placed) | "cover".
// - tl.grid / tl.stack / tl.align / tl.distribute set positions (and grid
//   zooms) from the clips' real bounds and return the clips. Lay out first,
//   then animate (an animated position or zoom is not moved silently).
// - Bounds are real: text by its own font file (the letters), media by its
//   size, shapes by their box; clip.bounds({ at }) at any time.
// - A placement that runs off the frame is a lint (off_canvas), not an error.
//
// Animation (bakes to normal keyframes; clip.keyframes(prop) reads them)
// - clip.animate({ zoom: [1.4, 1], opacity: [0, 1] }, { over: frames(6), ease: "ease_out" })
// - Eases: Ease below; spring({ stiffness, damping, mass }) is baked at the
//   timeline's rate to the fewest keys within 0.25% of the curve.
// - Merging: new keys join the property's animation. Over existing motion
//   (keys inside the new span, or a change between two keys it overlaps)
//   they are refused unless { replaceAnimation: true }, which replaces the
//   motion they overlap (keys inside, and both ends of a change cut into).
// - Presets are plain calls on the same rule: punchIn, slideIn, popIn,
//   fadeIn, fadeOut, kenBurns; wiggle(prop, ...) is seeded.
// - stagger(clips, props | fn, { offset }) and grid.each(fn) for beats.
//
// Units
// - Position: canvas pixels from the canvas center, +x right, +y DOWN;
//   [0, 0] centers a clip.
// - Zoom: 1 = the clip fits the frame (how media is first placed).
// - Rotation: degrees. Opacity: 0..1. Colors (see `Color`): "#rrggbb",
//   "#rrggbbaa", CSS "rgba(0, 0, 0, 0.5)" / "hsl(210, 50%, 40%)", a CSS
//   color name ("white"), or [r, g, b, a] in 0..1.
// - Keyframe `at` is CLIP-LOCAL (frames(0) = the clip's first frame). A
//   point's `ease` shapes the stretch from it to the NEXT point.
// - Sound: gain in dB (-60..12; -60 is silence), pan -1 (left)..1 (right). A video's sound
//   is clip.audio; audio effects go on sounds, audio tracks, buses and
//   edit.mainOutput().
// - Shape paths: px from the shape clip's box center, +y down; trim in
//   percent of the outline; path scale 1 = unchanged.
//
// Collisions (the editor's own rules):
// - New media on a named `track` overwrites what is under it (the editor's
//   plain drop: clips there are cut or removed); `mode: "insert"` pushes
//   later clips instead (the editor's insert drop).
// - New text, shapes and adjustment clips never cover anything: on a named
//   track that is busy there, they go on a new track above the stack (the
//   editor's "Add"; a note in the receipt says so).
// - Without `track`, a new clip goes on the top track this script created
//   when that is free there, else on a new track on top: later calls draw ON
//   TOP of earlier ones.
// - moveTo overwrites by default (the editor's Selection tool: the clip
//   leaves a gap; clips it lands on are cut or removed); `mode: "insert"` is
//   the Ripple tool (later clips move right; the drop snaps to the nearest
//   cut, noted in the receipt).
// - trim overwrites by default: growing stops at the neighbouring clip
//   (clamp noted in the receipt), shrinking leaves a gap; `ripple: true`
//   moves everything after the edge instead.
// - A video's linked sound follows every structural edit unless
//   `linked: false`. Setting one value on an animated property is refused
//   unless you pass { replaceAnimation: true }.
//
// Text
// - Titles (tl.addText) style part of their text by content:
//   t.style("KICKS", { color: "#fed700" }); never by character offsets.
// - Captions (tl.captions) are cues and words in timeline time; see
//   "Captions" below.
// - Text in Arabic, Hebrew or Thai needs a font that has those letters (there
//   is no fallback font for them); other scripts fall back automatically.
//
// Shapes and fills
// - tl.addShape("rectangle" | "ellipse" | "polygon" | "star" | "path", { fill, stroke }).
//   A fill (Paint) is a color, { linear: { from, to, stops } } or
//   { radial: { center, radius, stops } }; stops are [[offset 0..1, color], ...].
// - A glow, halo or flare: a radial gradient from a color to transparent
//     fill: { radial: { radius: 300, stops: [[0, "#fff4d6"], [1, "#ff8a0000"]] } }
//   with blendMode "screen" or "add"; a blurred solid looks flat.
//
// Custom shaders: clip.addCustomEffect(glsl, params) takes GLSL ES 300 with
// `uniform sampler2D src;`, `in vec2 v_texcoord;`, `out vec4 outColor;`
// (premultiplied), params as members of ONE uniform block, built-ins
// iv_time / iv_progress / iv_resolution. Its doc has a complete template;
// so does catalog().custom_effect.
// Custom transitions: tl.addCustomTransition(a, b, glsl, { params, easing })
// reads `uniform sampler2D from;` (outgoing) and `uniform sampler2D to;`
// (incoming) and the eased iv_progress; template in its doc and in
// catalog().custom_transition.
// Uniform blocks (both): ONE anonymous block, its header
// `layout(std140) uniform CustomParams {` a line of its own, closed with
// `};` (no instance name, so members are read as `amount`, not `p.amount`).
// One-line blocks, a brace on the next line and `uniform float x;` lines are
// rewritten to that form; a named instance or a second block is refused.
// Caption text shaders: caps.animate("shader", { shader: textShader("fx/x.glsl"), by })
// run your GLSL per glyph, word, line or cue: `vec4 iv_fragment(vec2 uv)`
// (iv_glyph(uv) is the glyph at rest) and optional `void iv_vertex(inout vec2
// pos, inout vec2 uv)`; every unit gets its own time (iv_progress from its
// word's start, iv_word = its start/end), so words timed on beats animate on
// beats. 21 presets (TextShaderPreset). Contract: textShader's doc and
// catalog().text_shader. Titles take animateText, not shaders.
//
// Sandbox: no fs/net. Assets are paths relative to the script's directory
// (or an --asset-root, looked up first), or absolute under a VFS root
// (/notebook/, /uploads/, /downloads/, /albums/, /editors/, /scripts/,
// /lib/, /library/), read from the sandbox's top folder (the --root, or
// the embedder's whole folder). Any other absolute path and `..` in an
// absolute one are refused. Math.random is seeded
// (newTimeline({ seed })); Date is frozen at the epoch.
//
// Modules: a script may import local files, ONLY from its own folder and
// the folders given with --root:
//     import { tear } from "./lib/tear.ts";
//     import * as looks from "../lib/looks.ts";   // with --root ../lib
// Each module runs once (cached) and is type-stripped like the script.
// This API stays global inside modules (no import needed for `edit`,
// `frames`, `Clip`, ...); `export` what other files use. No packages, URLs,
// absolute paths, or import cycles. Errors name the module: lib/tear.ts:14:3.

declare const timeBrand: unique symbol;
declare const sourceBrand: unique symbol;

/** A timeline time (made by frames(), seconds(), a BeatGrid, or arithmetic on those). */
interface Time {
  readonly [timeBrand]: true;
  /** Frames at the timeline's rate (may have a fraction until used). */
  readonly frames: number;
  readonly seconds: number;
  plus(t: Time | TimeString): Time;
  minus(t: Time | TimeString): Time;
  /** Scale (e.g. half a beat: grid.beats(1).times(0.5)). */
  times(k: number): Time;
  lt(t: Time | TimeString): boolean;
  le(t: Time | TimeString): boolean;
  gt(t: Time | TimeString): boolean;
  ge(t: Time | TimeString): boolean;
  eq(t: Time | TimeString): boolean;
  /** -1, 0 or 1 (for sorting). */
  compare(t: Time | TimeString): number;
  /** "36f (1.5s)" */
  toString(): string;
}

/** A position inside a clip's media (source.frames() / source.seconds()). Never a timeline time. */
interface SourceTime {
  readonly [sourceBrand]: true;
  /** Frames at the media's own fps when it is known (video), else the timeline rate. Audio has no frames: throws InputError (use .seconds). */
  readonly frames: number;
  readonly seconds: number;
  plus(t: SourceTime): SourceTime;
  minus(t: SourceTime): SourceTime;
  times(k: number): SourceTime;
  toString(): string;
}

/** Frames at the timeline's rate: frames(36). Exact: must be a whole number. */
declare function frames(n: number): Time;
/** Seconds: seconds(1.5). Rounds to the nearest frame where it is used (a half frame to the later one). */
declare function seconds(n: number): Time;
/**
 * A time string, accepted wherever a Time is, and by time(): "3.2s", "50%" (of
 * the timeline), "Intro@1.2s" / "Intro@50%" / "Intro@end" (in a scene: a named
 * nested timeline, a named span marker, or the "<SCENE> · <what>" name its
 * clips share), "marker:drop" (a timeline marker, else the beats file's),
 * "beat:18" / "beat:18.5" (the timeline's beat grid, counted from 0). A bare
 * number needs a unit: frames(120). An unknown name lists the ones there are.
 */
type TimeString = `${number}s` | `${number}%` | `${string}@${string}` | `marker:${string}` | `beat:${number}`;
/** A time string as a Time on the active timeline (the edit's first; tl.time() for another): time("Intro@1.2s").plus(frames(2)). */
declare function time(expr: TimeString): Time;
/**
 * Source-media time: a position inside a clip's media, in frames at the timeline rate or in seconds. Where a
 * SourceTime is taken, a string works too: "12.5s", "50%" (of the media), "1:02.5", "01:02:03.5" (not frame
 * timecode, not bare numbers). On the wire it is `{ s, fps? }`.
 */
declare const __iv_source: {
  frames(n: number): SourceTime;
  seconds(n: number): SourceTime;
  span(start: SourceTime, end: SourceTime): Span;
};
/** A stretch of media (words, shots and chapters are spans plus their fields). */
interface Span<T = SourceTime> {
  start: T;
  end: T;
  readonly length: T;
}
/** A SourceTime as a string: "12.5s", "50%", "1:02.5", "01:02:03.5". */
type SourceTimeString = `${number}s` | `${number}%` | `${number}:${string}`;

/**
 * Beats as times. From a clip's media (`clip.beats()`, read from
 * `<media>.beats.json` next to the file) or a steady tempo
 * (`beatGrid({ bpm, start })`). The grid is snapped to frames: a beat's
 * time is its nearest whole frame (120 BPM at 30 fps puts a half beat at
 * frame 7.5, so it lands on frame 8). The first point of a grid that is
 * rounded adds a `grid_rounded` receipt note with how far it moved (at
 * most half a frame).
 */
interface BeatGrid {
  readonly bpm: number;
  /** Beats the grid holds (a steady grid: up to the timeline's end). */
  readonly count: number;
  /** Named markers from the beats file (e.g. "drop"). */
  readonly markers: string[];
  /** Beat position i (0 = first beat). Fractions are subdivisions: beat(18.5) is half past beat 18. */
  beat(i: number): Time;
  /** The length of n beats (at the grid's average beat). */
  beats(n: number): Time;
  /** The nearest grid point at 1/sub of a beat (sub 1, 2, 4, ...). Default 1. Before the first and past the last beat of a beats file the grid goes on by its average beat, as beat(i) does. */
  snap(t: Time, sub?: number): Time;
  /** The beat position of the nearest grid point at 1/sub of a beat (past the music's end too, as snap). */
  position(t: Time, sub?: number): number;
  /** A named marker from the beats file, as a time. */
  marker(name: string): Time;
  /** Every beat (optionally only downbeats) from `from` up to, not including, `to` (`inclusive: true` keeps a beat on `to`); `every` beats apart (default 1; 0.5 = every half beat). Points on the timeline. */
  all(opts?: { from?: Time; to?: Time; downbeats?: boolean; every?: number; inclusive?: boolean }): Time[];
  /** fn(t, i) for every point all(opts) lists, in order (i from 0). Returns the grid. */
  each(fn: (t: Time, i: number) => void, opts?: { from?: Time; to?: Time; downbeats?: boolean; every?: number; inclusive?: boolean }): BeatGrid;
}

/**
 * A small JSON Schema subset for `input()`, checked by the host (the same
 * for TypeScript and Lua). `type` may be a name or a list of names.
 * `properties` and `required` apply to objects, `items` to array elements;
 * all nest.
 */
interface InputSchema {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object" | ("string" | "number" | "integer" | "boolean" | "array" | "object")[];
  enum?: unknown[];
  /** Numbers: smallest allowed value. */
  minimum?: number;
  /** Numbers: largest allowed value. */
  maximum?: number;
  /** Strings: fewest characters. */
  minLength?: number;
  /** Strings: most characters. */
  maxLength?: number;
  /** Arrays: fewest elements. */
  minItems?: number;
  /** Arrays: most elements. */
  maxItems?: number;
  /** Arrays: the schema of every element. */
  items?: InputSchema;
  /** Objects: the schema of each named property (extra properties are allowed). */
  properties?: { [name: string]: InputSchema };
  /** Objects: property names that must be present. */
  required?: string[];
  description?: string;
  title?: string;
  /** Authoring hint (for example "color" or a media kind); does not change validation. */
  format?: string;
  /** Display hint: the increment of a number's control; does not change validation. */
  step?: number;
  /** Display hint: the unit shown beside a number (for example "px"); does not change validation. */
  unit?: string;
  /** Display hint: a string is edited as several lines; does not change validation. */
  multiline?: boolean;
}

/**
 * A typed input of the script. Returns the value the host supplied for
 * `name` (`timeline build --vars '{"name": ...}'`) when it fits `schema`,
 * else `defaultValue`. A supplied value that does not fit, or a default
 * that does not fit its own schema, is an error at this call. Without a
 * `schema` the type of `defaultValue` is the schema (a number default
 * accepts any number). Values are fixed for the whole run. Supplied names no
 * `input()` asks for are reported as an `unknown_input` lint.
 * @example const count = input("count", 3, { type: "integer", minimum: 1, maximum: 10 });
 */
declare function input<T>(name: string, defaultValue: T, schema?: InputSchema): T;

/** A steady grid: `bpm` beats per minute with beat 0 at `start` (default frames(0)), on the active timeline. */
declare function beatGrid(opts: { bpm: number; start?: Time }): BeatGrid;

/**
 * One animation over many clips, each starting `offset` after the one
 * before, in `order`: "forward" (default), "reverse", "center" (middle
 * first) or "random" (seeded). `animate` is either the props of
 * clip.animate (with `at`, `over`, `ease`, `step` from opts):
 *     stagger(cards, { zoom: [0, 1] }, { over: frames(8), ease: spring(), offset: grid.beats(1) })
 * or a function that animates one clip as if it were first (its keyframes
 * are then delayed). `offset` is a length (each delay rounds to the nearest
 * frame) or { grid, beats }: exactly `beats` grid beats apart from the
 * grid point nearest the first clip's start + `at`.
 */
declare function stagger(clips: Clip[], animate: AnimProps | ((clip: Clip, i: number) => void), opts: AnimateOptions & { offset: Time | { grid: BeatGrid; beats: number }; order?: "forward" | "reverse" | "center" | "random" }): Clip[];

/**
 * A spring ease (defaults stiffness 170, damping 26, mass 1), baked into keys at the timeline's rate.
 * On a bounded property (opacity 0..1, an effect param's range, pan) an overshoot is clamped to the
 * range; the receipt notes it (`baked_overshoot_clamped`).
 */
declare function spring(opts?: { stiffness?: number; damping?: number; mass?: number }): Spring;

/**
 * A color. Strings: "#rgb", "#rgba", "#rrggbb", "#rrggbbaa"; CSS
 * "rgb(255, 0, 0)", "rgba(255, 0, 0, 0.5)", "hsl(210, 50%, 40%)",
 * "hsla(210, 50%, 40%, 0.5)" (or space separated: "rgb(255 0 0 / 50%)");
 * a CSS color name ("white", "tomato", "transparent"). r, g, b are 0..255
 * or 0%..100%, alpha 0..1 or 0%..100%; a value past its range is refused.
 * Arrays: [r, g, b] or [r, g, b, a] in 0..1.
 */
type Color = string | [number, number, number] | [number, number, number, number];
type Vec2 = [number, number];
/**
 * A caption text shader for caps.animate("shader", { shader }): a .glsl path
 * next to the script, GLSL source, { vertex, fragment } (each a path or
 * source), or a preset name. One file holds `vec4 iv_fragment(vec2 uv)`
 * (required) and optionally `void iv_vertex(inout vec2 pos, inout vec2 uv)`;
 * the build splits it by function and compiles both stages the way the
 * renderer does, refusing with the file's line:col and a fix.
 *
 * The contract (GLSL 450; no main, no #version, no iv_ names of your own):
 * - iv_fragment(uv) returns premultiplied rgba; iv_glyph(uv) is the glyph
 *   (or the finished word/line/cue by "word"/"line"/"cue") at rest, zero
 *   outside it. The identity is `return iv_glyph(uv);`.
 * - iv_vertex moves one corner of the quad: pos in px (Y down), uv 0..1.
 *   Anything shared by the 4 corners must come from the inputs below.
 * - Per glyph (or unit): iv_cluster_pos / iv_cluster_size (rest centre and
 *   size, px), iv_cluster (index, -, kind 0 glyph 1 emoji 3 quad, layer 0
 *   fill 1 stroke), iv_color, iv_unit (place in word, word length, place on
 *   line, line length), iv_word_box / iv_line_box (cx, cy, w, h px),
 *   iv_word / iv_line (start, end s), iv_next_start, iv_user (vec4 the
 *   vertex stage writes and the fragment reads).
 * - Per draw: iv_time (s into the cue), iv_duration (the `duration` option),
 *   iv_slide_duration (the cue's length), iv_viewport, iv_padding,
 *   iv_atlas_size, iv_accent.
 * - In and out: iv_progress rises 0→1 over iv_duration from the unit's start
 *   (the word for "character"/"word", the line, or the cue); nothing draws
 *   before it. iv_progress_out rises over the last iv_duration of the cue;
 *   the engine never hides a word, the shader does: iv_t_out(iv_next_start,
 *   iv_duration) exits as the next word starts.
 * - Helpers: iv_t_in, iv_t_out, iv_stagger, stagger_t(spread), exit_t,
 *   hide_k, ease_out3, ease_in2, hash1, rot2, unit_secs.
 * - Params: floats in ONE `uniform CustomParams { float heat; };` in the
 *   fragment, each 0..1: one value, or keyframes over the clip
 *   (`params: { heat: [{ at: frames(0), value: 0 }, { at: frames(12), value: 1, ease: "ease_out" }] }`).
 * - Loops need constant bounds; the instance count and order are fixed.
 *
 *     uniform CustomParams { float lift; };
 *     void iv_vertex(inout vec2 pos, inout vec2 uv) {
 *       pos.y += (1.0 - ease_out3(stagger_t(0.4))) * iv_cluster_size.y * lift;
 *     }
 *     vec4 iv_fragment(vec2 uv) { return iv_glyph(uv) * stagger_t(0.4); }
 */
declare function textShader(shader: string | { vertex?: string; fragment: string }): TextShader;

/** A caption text shader, made by textShader(). */
interface TextShader {
  readonly text_shader: string | { vertex?: string; fragment: string };
}

/** Named caption text shaders (catalog().text_shaders lists each with the `by` it was written for). */
type TextShaderPreset = "scale_in" | "rise" | "typewriter" | "spin_in" | "flip" | "drop_bounce" | "shake_settle" | "blur_in" | "glitch_split" | "rainbow" | "wave" | "implode" | "card_flip" | "elastic" | "gravity" | "neon_pulse" | "noise_dissolve" | "pixelate" | "ripple" | "extrusion" | "blinds";

/** caps.animate("shader", opts). by, padding and oversample default to the preset's. */
interface CaptionShaderOptions {
  shader: TextShader | TextShaderPreset | string;
  /** One instance per "character" (default), or the finished "word", "line" or "cue" as one picture. */
  by?: "character" | "word" | "line" | "cue";
  /** iv_duration: each unit's entrance (and exit) length, 0..seconds(5). */
  duration?: Time;
  /** The shader's CustomParams floats, each 0..1: a number, or keyframes with `at` clip-local (read back as `{ keyframes }`). */
  params?: Record<string, number | ParamKeys>;
  /** iv_accent. Default "#ffd933". */
  accent?: Color;
  /** Px each quad grows by so the shader can paint past the glyph (glow, trails), 0..256. */
  padding?: number;
  /** 1..4, "character" only: raster glyphs this much sharper for zooms. */
  oversample?: number;
}

/** The editor's text animation presets: fade, slide_up (rise 24 px and fade), scale (from 0, back_out), blur (from 24 px and transparent); pop, radial_blur and shake are the caption animations run per letter or line (they play alone). */
type TextAnimationPreset = "fade" | "slide_up" | "scale" | "blur" | "pop" | "radial_blur" | "shake";

/** The state each unit moves from (play "in"), to ("out"), or through ("through"); the text at rest is the other end. */
interface TextMotion {
  /** 0..1. */
  opacity?: number;
  /** Gaussian blur, px, 0..200. */
  blur?: number;
  /** [x, y] px, +y down. */
  offset?: Vec2;
  /** About each unit's centre: a number or [x, y]. */
  scale?: number | Vec2;
  /** Degrees, about each unit's centre. */
  rotation?: number;
  /** Outline drawn so far, 0..1 (needs Stroke on). */
  stroke_trim?: number;
  /** Alpha of the fill only, 0..1; the stroke keeps opacity. With stroke_trim: 0, a write-on. */
  fill_opacity?: number;
}

interface TextAnimationOptions {
  /** One unit: "character" (default), "line" (as laid out, soft wraps too) or "all" (the whole text). */
  by?: "character" | "line" | "all";
  /** Which unit starts first: "forward" (default), "reverse", "center" (middle out), "edges" (ends in), "random" (seeded). */
  order?: "forward" | "reverse" | "center" | "edges" | "random";
  /** order "random": the seed (default 1). */
  seed?: number;
  /** One unit's motion. Default seconds(0.4). */
  each?: Time;
  /** The whole sequence, first unit's start to last unit's landing (the gap shrinks as the text grows). Default seconds(1). Not with gap. */
  total?: Time;
  /** Between two units' starts (the sequence grows with the text). Not with total. */
  gap?: Time;
  /** The sequence starts this much later: after the clip head for "in" / "through", after its usual tail anchor for "out" (the end is cut by the clip). Default 0. */
  delay?: Time;
  /** "in" (default) from the clip's start, "out" over its tail, "through" (static at both ends, the motion at the midpoint). */
  play?: "in" | "out" | "through";
  /** Default "cubic_out" ("back_out" for scale; the caption default for pop, radial_blur, shake). */
  ease?: CaptionEasing;
  /** pop, radial_blur, shake: strength 0..4. Default 1. */
  amount?: number;
  /** shake: which way. Default "up". */
  direction?: "up" | "down" | "left" | "right";
  /** Keyed sequence progress, 0..1 at clip-local times: hold mid-reveal, scrub, reverse. Overrides the clock. */
  progress?: { at: Time; value: number; ease?: Ease }[];
}

/** One layer: a preset or a from state, with its own clock. */
type TextAnimationLayer = ({ preset: TextAnimationPreset; from?: never } | { from: TextMotion; preset?: never }) & TextAnimationOptions;

/** A spring ease, made by spring(). */
interface Spring {
  readonly spring: { stiffness?: number; damping?: number; mass?: number };
}
/**
 * How a stretch between two keys moves. "linear" (default), "hold" (no
 * motion, then a jump), "ease_in" / "ease_out" / "ease_in_out", the named
 * curves (quadratic, cubic, quartic, quintic, sine, circular, exponential,
 * back: drawn as one bezier each), a bezier [x1, y1, x2, y2], or one that
 * is baked into linear keys at every frame where it bends: elastic,
 * bounce, spring().
 */
type Ease =
  | "linear" | "hold" | "ease_in" | "ease_out" | "ease_in_out"
  | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out"
  | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out"
  | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out"
  | "exponential_in" | "exponential_out" | "exponential_in_out" | "back_in" | "back_out" | "back_in_out"
  | "elastic_in" | "elastic_out" | "elastic_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out"
  | [number, number, number, number]
  | Spring;

/** px, or a percent of the frame ("80%": of its width for x/width, its height for y/height). */
type Length = number | `${number}%`;
/** Where a clip goes in an area. */
type Anchor = "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
/** A rect in canvas px from the canvas center (+y down): x, y = its top-left. */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** An area to lay out in: the frame (default), the safe area (tl.safeArea), or a rect (px or %). */
type Area = "frame" | "safe" | { x: Length; y: Length; width: Length; height: Length };

/** Place a new clip by intent (instead of x/y). */
interface PlaceOptions {
  /** Anchor in the frame, or in the safe area with within: "safe". */
  place?: Anchor;
  /** Space from the area's edges: px or "%", one value or [x, y]. Default 0. */
  margin?: Length | [Length, Length];
  within?: "frame" | "safe";
}
/** "overwrite" (the editor's default) or "insert" (pushes later clips). */
type EditMode = "overwrite" | "insert";
/** clip.pasteAttributes categories. */
type PasteCategory = "transform" | "composite" | "crop" | "playback" | "effects" | "audio";

type BlendMode = 
  | "normal"
  | "add"
  | "average"
  | "color"
  | "color_burn"
  | "color_dodge"
  | "darken"
  | "difference"
  | "exclusion"
  | "glow"
  | "hard_light"
  | "hard_mix"
  | "hue"
  | "lighten"
  | "linear_burn"
  | "linear_dodge"
  | "linear_light"
  | "luminosity"
  | "multiply"
  | "negation"
  | "overlay"
  | "phoenix"
  | "pin_light"
  | "reflect"
  | "saturation"
  | "screen"
  | "soft_light"
  | "subtract"
  | "vivid_light";

/**
 * Built-in effects and their parameters (all optional; unset ones keep the
 * default shown). Number ranges are inclusive. For your own GLSL use
 * clip.addCustomEffect.
 */
interface EffectParams {
  /** Adds moving bands of rainbow aurora light over the picture. */
  aurora: {
    /** How bright the aurora is; 0 shows none. Range 0..1. Default 1. */
    strength?: number;
    /** Size of the aurora pattern; lower is smaller. Range 0..1. Default 1. */
    scale?: number;
  };
  /** Splits the color channels apart in short, regular bursts, like a beat hitting. */
  chroma_pulse: {
    /** How far the colors split; at 1 the split reaches a tenth of the frame. Range 0..1. Default 1. */
    strength?: number;
    /** Seconds from one burst to the next. Range 0..10. Default 2. */
    interval?: number;
    /** Seconds each burst lasts. Range 0..2. Default 0.5. */
    duration?: number;
  };
  /** Puts a soft shadow of the clip's shape behind it. */
  drop_shadow: {
    /** Shadow color. Default "#000000". */
    color?: Color;
    /** Shadow opacity. Range 0..1. Default 0.75. */
    opacity?: number;
    /** How soft the shadow is, as a blur radius in pixels. Range 0..100. Default 40. */
    blur?: number;
    /** Where the shadow sits from the clip, as [x, y] in pixels; positive x moves it right, positive y up. Range [-300, -300]..[300, 300]. Default [0, -10]. */
    offset?: Vec2;
    /** Pixels to grow the shadow's shape before it is softened. Range 0..100. Default 0. */
    spread?: number;
  };
  /** Recolors the picture with two colors: one for the darks and one for the lights. */
  tint: {
    /** Color for the dark areas. Default "#0000ff". */
    shadows?: Color;
    /** Color for the light areas. Default "#ff0000". */
    highlights?: Color;
    /** Swap the two colors. Default false. */
    swap?: boolean;
  };
  /** Zooms and pans smoothly over the clip's length, from a start framing to an end framing (Ken Burns). Added with no move (both framings centered at zoom 1): set to_zoom or to_center for one. */
  pan_zoom: {
    /** Point to center on at the start, as [x, y] from 0 to 1 across the frame; [0.5, 0.5] is the center and y runs down. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    from_center?: Vec2;
    /** Point to center on at the end, as [x, y] from 0 to 1 across the frame. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    to_center?: Vec2;
    /** Zoom at the start; 1 is no zoom, 2 twice as close. Range 0..10. Default 1. */
    from_zoom?: number;
    /** Zoom at the end; 1 is no zoom, 2 twice as close. Range 0..10. Default 1. */
    to_zoom?: number;
    /** How the move speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Zooms smoothly around the clip's anchor point over its length, from a start framing to an end framing. */
  anchor_zoom: {
    /** Shift at the start, as [x, y] fractions of the frame from -1 to 1; positive x moves the picture left, positive y down. Range [-1, -1]..[1, 1]. Default [0, 0]. */
    from_offset?: Vec2;
    /** Shift at the end, as [x, y] fractions of the frame. Range [-1, -1]..[1, 1]. Default [0, 0]. */
    to_offset?: Vec2;
    /** Zoom at the start; 1 is no zoom. Range 0..10. Default 1. */
    from_zoom?: number;
    /** Zoom at the end; 1 is no zoom. Range 0..10. Default 2. */
    to_zoom?: number;
    /** How the move speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Rounds the clip's corners. */
  round_corners: {
    /** How round the corners are; 0.5 makes a pill shape and 1 a circle. Range 0..1. Default 0.15. */
    radius?: number;
  };
  /** Turns the picture into blocky pixel art with a small retro game palette. */
  "8bit": {
    /** Size of each block, in pixels. Range 0..100. Default 10. */
    pixel_size?: number;
  };
  /** Turns the picture into blocky pixel art with fewer color levels, keeping its own colors. */
  "16bit": {
    /** Size of each block, in pixels. Range 0..100. Default 8. */
    pixel_size?: number;
  };
  /** Removes a solid background color, like a green screen, so what is below shows through. */
  chroma_key: {
    /** The background color to remove. Default "#00ff00". */
    key_color?: Color;
    /** How close a color must be to the key color to be removed. Range 0..1. Default 0.4. */
    threshold?: number;
    /** Width of the soft edge around what is removed. Range 0..1. Default 0.03. */
    smoothness?: number;
    /** How much of the key color's tint to take out of the edges that stay. Range 0..1. Default 0.1. */
    despill?: number;
  };
  /** Fits the whole clip in the frame and fills the empty bars with a blurred, enlarged copy of it. */
  fit_with_blur: {
    /** Background blur radius, in pixels. Range 0..100. Default 20. */
    blur?: number;
    /** Background opacity. Range 0..1. Default 1. */
    background_opacity?: number;
    /** How much larger the background copy is. Range 1..2. Default 1.2. */
    background_scale?: number;
    /** Where the fitted clip sits, as [x, y] from -1 to 1; positive x is right, positive y down. Range [-1, -1]..[1, 1]. Default [0, 0]. */
    align?: Vec2;
  };
  /** Flickers the picture with bright, tinted overexposure in bursts, like a memory. */
  flashback: {
    /** How fast it flickers during a burst. Range 0..3. Default 1. */
    speed?: number;
    /** Seconds from one burst to the next. Range 0..10. Default 3. */
    interval?: number;
    /** Seconds each burst lasts. Range 0..2. Default 1. */
    duration?: number;
    /** Tint of the overexposure. Default "#ffffff". */
    color?: Color;
  };
  /** Keeps the center sharp and blurs toward the edges, with slight color fringing. */
  focus_blur: {
    /** How strong the blur is. Range 0..10. Default 1. */
    intensity?: number;
    /** How far the blur reaches in from the edges; higher leaves a smaller sharp center. Range 0..1. Default 0.1. */
    size?: number;
  };
  /** Blurs the picture evenly. */
  gaussian_blur: {
    /** Blur radius, in pixels. Range 0..100. Default 10. */
    radius?: number;
    /** Shift of the blurred picture, as [x, y] in pixels; positive y moves it up. Range [-100, -100]..[100, 100]. Default [0, 0]. */
    offset?: Vec2;
  };
  /** Inverts the colors, like a film negative. */
  invert: {
    /** How much to invert. Range 0..1. Default 1. */
    strength?: number;
  };
  /** Folds the picture into a moving kaleidoscope pattern. */
  kaleidoscope: {
    /** How fast the pattern moves and turns. Range 0..1. Default 0.3. */
    speed?: number;
    /** How much the folds drift. Range 0..1. Default 0.1. */
    scroll?: number;
    /** Turn of the pattern, in degrees. Range -180..180. Default 0. */
    rotation?: number;
  };
  /** Adds a lens flare glow over the picture. */
  lens_flare: {
    /** Brightness of the flare. Range 0..2. Default 1. */
    intensity?: number;
    /** Direction the light comes from, in degrees around the center. Range 0..360. Default 1. */
    angle?: number;
    /** How far the light source is from the center, as a fraction of the frame. Range 0..1. Default 0.5. */
    distance?: number;
  };
  /** Mirrors one part of the picture onto the rest. */
  multi_mirror: {
    /** Which part is mirrored; automatic cycles through the patterns. Default "left". */
    mode?: "left" | "right" | "bottom" | "cross" | "quad" | "automatic";
    /** Seconds between pattern changes, in automatic mode. Range 0.1..10. Default 1. */
    interval?: number;
  };
  /** Flashes shifted blocks of the picture with noisy grain, like a digital glitch. */
  pixel_glitch: {
    /** How far the blocks shift. Range 0..1. Default 1. */
    intensity?: number;
    /** How fast the glitch changes. Range 0.1..2. Default 1. */
    speed?: number;
    /** Amount of grain. Range 0.1..1. Default 1. */
    noise?: number;
  };
  /** Recolors the picture with three colors: one each for the darks, midtones and lights. */
  tritone: {
    /** Color for the dark areas. Default "#0000ff". */
    shadows?: Color;
    /** Color for the midtones. Default "#00ff00". */
    midtones?: Color;
    /** Color for the light areas. Default "#ff0000". */
    highlights?: Color;
  };
  /** Shakes the picture randomly, zoomed in slightly so the edges stay hidden. */
  wiggle: {
    /** Largest shake, as [x, y] in pixels. Range [0, 0]..[300, 300]. Default [15, 15]. */
    amount?: Vec2;
    /** How fast it shakes. Range 0.1..5. Default 1. */
    speed?: number;
    /** How far to zoom in so the edges stay hidden. Range 1..2. Default 1.1. */
    zoom?: number;
    /** Pick a number for a different shake pattern. Range 0..1000. Default 0. */
    seed?: number;
  };
  /** Shrinks the picture and repeats it in tiles to fill the frame. */
  tile: {
    /** How much it shrinks; 0.5 shows about two tiles across and 1 about ten. Range 0..1. Default 0.5. */
    strength?: number;
  };
  /** Cuts the clip down to a rectangle, with optional soft edges and rounded corners. */
  crop: {
    /** How much to cut from the left, as a fraction of the width. Range 0..1. Default 0. */
    left?: number;
    /** How much to cut from the top, as a fraction of the height. Range 0..1. Default 0. */
    top?: number;
    /** How much to cut from the right, as a fraction of the width. Range 0..1. Default 0. */
    right?: number;
    /** How much to cut from the bottom, as a fraction of the height. Range 0..1. Default 0. */
    bottom?: number;
    /** Soft edge width; positive softens outward from the edge, negative inward. Range -1..1. Default 0. */
    softness?: number;
    /** How round the corners are. Range 0..1. Default 0. */
    roundness?: number;
  };
  /** Steadies a shaky camera; the motion is measured from the clip's media when it renders. */
  stabilize: {
    /** smooth keeps the camera's own movement and removes the shake; locked holds the picture still. Default "smooth". */
    style?: "smooth" | "locked";
    /** How smooth (smooth style only). Range 0..100. Default 30. */
    strength?: number;
    /** crop zooms in just enough to hide the moved edges; fill paints them from frames already shown. Default "crop". */
    edges?: "crop" | "fill";
  };
  /** Legacy: a soft out-of-focus blur with round highlights. */
  bokeh: {
    /** How much of the blur shows; 0 shows none. Range 0..1. Default 1. */
    strength?: number;
    /** Blur radius in pixels. Range 0..100. Default 30. */
    radius?: number;
    /** Turn of the highlight shape, in degrees. Range 0..360. Default 0. */
    angle?: number;
    /** Size of the highlights. Range 0..1. Default 0.2. */
    size?: number;
  };
  /** Legacy: basic color correction; clip.grade is the editor's color tool. */
  color_correction: {
    /** Brightness; 0.5 is unchanged. Range 0..1. Default 0.5. */
    brightness?: number;
    /** Contrast; 0.5 is unchanged. Range 0..1. Default 0.5. */
    contrast?: number;
    /** Exposure; 0.5 is unchanged. Range 0..1. Default 0.5. */
    exposure?: number;
    /** Highlights; 0.5 is unchanged. Range 0..1. Default 0.5. */
    highlight?: number;
    /** Shadows; 0.5 is unchanged. Range 0..1. Default 0.5. */
    shadow?: number;
    /** Hue shift; 0 is unchanged. Range -1..1. Default 0. */
    hue?: number;
    /** Lifts or lowers every level; 0 is unchanged. Range -1..1. Default 0. */
    offset?: number;
    /** Saturation; 0.5 is unchanged. Range 0..1. Default 0.5. */
    saturation?: number;
    /** The color that becomes white. Default "#ffffff". */
    white_color?: Color;
    /** Warmer (positive) or cooler; 0 is unchanged. Range -1..1. Default 0. */
    temperature?: number;
    /** Magenta (positive) or green; 0 is unchanged. Range -1..1. Default 0. */
    tint?: number;
    /** Saturation of the duller colors; 0 is unchanged. Range -1..1. Default 0. */
    vibrance?: number;
    /** Darkening toward the edges. Range 0..1. Default 0.5. */
    vignette?: number;
    /** How far the vignette reaches in. Range 0..1. Default 0.5. */
    vignette_radius?: number;
  };
  /** Legacy: a four-color gradient blended over the picture. */
  gradient_overlay: {
    /** How the gradient mixes with the picture. Default "overlay". */
    blend_mode?: "normal" | "add" | "average" | "color" | "color_burn" | "color_dodge" | "darken" | "difference" | "exclusion" | "glow" | "hard_light" | "hard_mix" | "hue" | "lighten" | "linear_burn" | "linear_dodge" | "linear_light" | "luminosity" | "multiply" | "negation" | "overlay" | "phoenix" | "pin_light" | "reflect" | "saturation" | "screen" | "soft_light" | "subtract" | "vivid_light" | "blend_white" | "blend_black";
    /** Strength of the gradient. Range 0..1. Default 1. */
    opacity?: number;
    /** How sharply the colors change between their points. Range 0..10. Default 1. */
    gradient_factor?: number;
    /** Color at point_1. Default "#ffff00". */
    color_1?: Color;
    /** Color at point_2. Default "#ff00ff". */
    color_2?: Color;
    /** Color at point_3. Default "#00ffff". */
    color_3?: Color;
    /** Color at point_4. Default "#0000ff". */
    color_4?: Color;
    /** Where color_1 sits, as [x, y] from 0 to 1 across the frame. Range [0, 0]..[1, 1]. Default [0, 0]. */
    point_1?: Vec2;
    /** Where color_2 sits, as [x, y] from 0 to 1. Range [0, 0]..[1, 1]. Default [1, 0]. */
    point_2?: Vec2;
    /** Where color_3 sits, as [x, y] from 0 to 1. Range [0, 0]..[1, 1]. Default [0, 1]. */
    point_3?: Vec2;
    /** Where color_4 sits, as [x, y] from 0 to 1. Range [0, 0]..[1, 1]. Default [1, 1]. */
    point_4?: Vec2;
  };
  /** Legacy: turns the picture grey. */
  greyscale: {
    /** How grey; 0 keeps the color. Range 0..1. Default 1. */
    strength?: number;
    /** Contrast of the grey picture; 1 is unchanged. Range 0..2. Default 1. */
    contrast?: number;
  };
  /** Legacy: lowers the picture's resolution, so it looks blocky. */
  low_res: {
    /** How blocky. Range 0..1. Default 0.1. */
    strength?: number;
  };
  /** Legacy: ripples the picture in moving waves. */
  wave: {
    /** How far the waves bend the picture. Range 0..1. Default 0.2. */
    strength?: number;
  };
  /** Makes the bright parts of the picture glow: each color channel above the threshold spreads into a soft halo of its own color. The glow stays on the clip's visible pixels; it does not spill onto transparent areas. */
  glow: {
    /** How bright a color must be to glow, in percent of full brightness; lower makes more of the picture glow. Range 0..100. Default 70. */
    threshold?: number;
    /** How far the glow spreads, in pixels of the clip's picture. Range 0.5..60. Default 26. */
    radius?: number;
    /** Strength of the glow in percent; 100 adds the bright areas once, 300 three times. Range 0..300. Default 60. */
    intensity?: number;
    /** Color the glow is multiplied by; white keeps the picture's own colors. Default "#ffffff". */
    color?: Color;
    /** How the glow combines with the picture: add brightens most (bright areas can turn white), screen is softer, overlay adds contrast. Default "add". */
    blend?: "add" | "screen" | "overlay";
  };
  /** Adds moving film grain that changes 24 times a second (even on a still image), strongest in the darks the way film stock is. */
  film_grain: {
    /** How much of the grained picture shows over the original; 0 shows none. Range 0..1. Default 1. */
    opacity?: number;
    /** How strong the grain is. Range 0..1. Default 0.6689583. */
    strength?: number;
    /** How fine the grain is: about 800 × fineness specks across the clip, so higher is smaller grain and lower is coarser. Range 0..10. Default 3.3604167. */
    fineness?: number;
    /** How colored the grain is: 0 is the same speck in every channel (mono), 1 is separate red, green and blue grain. Range 0..1. Default 0. */
    saturation?: number;
    /** Grain strength in the red channel, as a multiplier; 1 is neutral. Range 0..2. Default 1. */
    red_strength?: number;
    /** Grain strength in the green channel, as a multiplier; 1 is neutral. Range 0..2. Default 1. */
    green_strength?: number;
    /** Grain strength in the blue channel, as a multiplier; 1 is neutral. Range 0..2. Default 1. */
    blue_strength?: number;
    /** How much grain shows in the dark areas, as a multiplier. Range 0..2. Default 1. */
    shadows?: number;
    /** How much grain shows in the middle tones, as a multiplier. Range 0..2. Default 0.8. */
    midtones?: number;
    /** How much grain shows in the bright areas, as a multiplier. Range 0..2. Default 0.4. */
    highlights?: number;
  };
  /** Smears the picture along one direction, like motion blur from a fast move. */
  directional_blur: {
    /** Direction of the smear in degrees: 0 is vertical, 90 horizontal. The smear runs both ways, so 180 looks the same as 0. Range 0..360. Default 45. */
    angle?: number;
    /** Length of the smear in pixels of the clip's picture, spread evenly both ways; 0 is no blur. At most 64: the shader takes 64 samples a pixel apart (a longer smear would break into dots); for more, blur a scaled-down copy or stack two. Range 0..64. Default 28. */
    length?: number;
    /** Past the clip's edge, blur in its edge pixels (true) or transparency (false, which softens the edges). Default true. */
    repeat_edges?: boolean;
  };
  /** Lays a smooth four-corner color gradient over the picture. Each color is anchored at its own point and fades into the others with distance; the gradient follows the clip's visible pixels and keeps its transparency. */
  "4_color_gradient": {
    /** First gradient color, anchored at point 1. Its alpha lowers how strongly the gradient shows near that point. Default "#ffc000". */
    color_1?: Color;
    /** Second gradient color, anchored at point 2. Its alpha lowers how strongly the gradient shows near that point. Default "#f21a73". */
    color_2?: Color;
    /** Third gradient color, anchored at point 3. Its alpha lowers how strongly the gradient shows near that point. Default "#1a80f2". */
    color_3?: Color;
    /** Fourth gradient color, anchored at point 4. Its alpha lowers how strongly the gradient shows near that point. Default "#66d933". */
    color_4?: Color;
    /** Where color 1 is anchored, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.1, 0.1]. */
    point_1?: Vec2;
    /** Where color 2 is anchored, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.9, 0.1]. */
    point_2?: Vec2;
    /** Where color 3 is anchored, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.1, 0.9]. */
    point_3?: Vec2;
    /** Where color 4 is anchored, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.9, 0.9]. */
    point_4?: Vec2;
    /** How much of the gradient shows over the picture, from 0 (none) to 1 (full). Range 0..1. Default 1. */
    opacity?: number;
    /** How the gradient combines with the picture: normal replaces the picture's colors, the others mix them the usual way (multiply darkens, screen lightens, and so on). Default "normal". */
    blend?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color_dodge" | "color_burn" | "soft_light" | "hard_light" | "difference";
  };
  /** Blurs the picture evenly by averaging each pixel with its neighbours, either in both directions or just along one axis. */
  box_blur: {
    /** How far the blur reaches, in pixels of the clip's picture. Rounded to a whole number and capped at 8; 0 is no blur. Range 0..8. Default 6. */
    radius?: number;
    /** Blur both ways, only left-right (horizontal), or only up-down (vertical). Default "both". */
    direction?: "both" | "horizontal" | "vertical";
    /** Past the clip's edge, blur in its edge pixels (true) or transparency (false, which softens the edges). Default true. */
    repeat_edges?: boolean;
  };
  /** Shifts the hue of one family of colors in the picture (for example turns the greens teal or the blues purple) and leaves other colors alone. Grays and very pale colors are barely affected. */
  change_color: {
    /** How far to rotate the chosen colors around the color wheel, as a fraction of a full turn; negative turns the other way, and 1 or -1 is a full turn (no change). Range -1..1. Default 0.113333344. */
    hue_shift?: number;
    /** Which colors to change, as a position on the color wheel from 0 to 1 (0 is red, about 0.33 green, about 0.67 blue, 1 is red again). Range 0..1. Default 0.45666668. */
    target_hue?: number;
    /** How far around the color wheel from the target hue colors are still changed, as a fraction of a full turn; the change fades out smoothly toward this distance. Higher catches more colors. Range 0.01..0.5. Default 0.20763335. */
    hue_range?: number;
  };
  /** Repaints the picture with a rainbow keyed to brightness: dark and light areas get different hues, and the colors cycle over time. */
  colorama: {
    /** How fast the colors rotate through the rainbow, in full rainbow cycles per second; 0 holds them still. Range 0..5. Default 1.8166667. */
    cycle_speed?: number;
    /** How many times the rainbow repeats from the darkest to the brightest areas; higher gives more, narrower bands of color. Range 1..10. Default 2. */
    cycles?: number;
  };
  /** Removes small specks and noise by replacing pixels with the median of their neighbours, which also gives a slightly smoothed, painterly look at larger radii. */
  dust_scratches: {
    /** How far apart the neighbouring pixels used for the median are, in pixels of the clip's picture; higher removes bigger specks but softens detail. Range 1..5. Default 1. */
    radius?: number;
    /** How different a pixel must be from its neighbours' median (a 0 to 1 difference in color) before it is replaced. 0 replaces every pixel; higher leaves more of the picture untouched. Range 0..1. Default 0. */
    threshold?: number;
    /** 0 is off, 1 is on. When on, the cleanup is applied to the clip's transparency instead of its colors, removing stray opaque or transparent specks. Range 0..1. Default 0. */
    operate_on_alpha?: number;
  };
  /** Makes the picture look like worn film: a soft, color-shifted look, flickering dust specks, thin vertical scratches and a slightly uneven dark vignette. Dust changes 24 times a second and scratches 12 times a second. Each layer can be switched off on its own. */
  film_damage: {
    /** How much of the damaged picture shows over the original; 0 shows none. Range 0..1. Default 1. */
    opacity?: number;
    /** 0 is off, 1 is on. Turns on the soft blur and the warmth and tint shifts; with it off, those settings have no effect. Range 0..1. Default 1. */
    blur_on?: number;
    /** How soft the picture gets (the blur reaches up to about 3 pixels of the clip's picture at 1); higher is softer. Range 0..1. Default 0.39270833. */
    blur_amount?: number;
    /** Color temperature shift: positive adds red and removes blue (warmer), negative does the opposite (cooler). Only applies when the blur is on. Range -1..1. Default 1. */
    warmth?: number;
    /** Green and red versus blue shift: positive adds a little green and red and removes blue, negative does the opposite. Only applies when the blur is on. Range -1..1. Default 0.69208336. */
    tint?: number;
    /** 0 is off, 1 is on. Turns the dust specks on. Range 0..1. Default 1. */
    dirt_on?: number;
    /** How many dust sites fit across the height of the picture; higher gives more and smaller specks. Range 5..100. Default 35. */
    dirt_density?: number;
    /** How big the specks are within their site; higher is bigger. Range 0.05..1. Default 0.2330729. */
    dirt_size?: number;
    /** How visible the specks are, from 0 (invisible) to 1 (strongest). Most specks are dark, a few are light. Range 0..1. Default 0.7. */
    dirt_opacity?: number;
    /** 0 is off, 1 is on. Turns the vertical scratches on. Range 0..1. Default 1. */
    scratches_on?: number;
    /** How often scratches appear: up to four thin vertical lines can show at a time, and higher makes each more likely to appear on every update. 0 shows none. Range 0..1. Default 0.6. */
    scratch_frequency?: number;
    /** How visible the scratches are, from 0 (invisible) to 1 (strongest). Most are dark, some are light. Range 0..1. Default 0.75. */
    scratch_intensity?: number;
    /** 0 is off, 1 is on. Turns the dark edge vignette on. Range 0..1. Default 1. */
    vignette_on?: number;
    /** How much the edges darken; 0 is no darkening and 1 fades them to black. Range 0..1. Default 0.7. */
    vignette_amount?: number;
    /** How gradual the vignette is; higher gives a wider, softer fade. Range 0.1..1. Default 0.6. */
    vignette_softness?: number;
    /** Moves the center of the vignette sideways, as a fraction of the clip's width; 0 is centered, and negative and positive move it opposite ways. Range -0.5..0.5. Default 0.04. */
    vignette_offset_x?: number;
    /** Moves the center of the vignette up or down, as a fraction of the clip's height; 0 is centered, and negative and positive move it opposite ways. Range -0.5..0.5. Default -0.03. */
    vignette_offset_y?: number;
  };
  /** Adds the warm red-orange glow that film shows around bright highlights, as if light scattered back through the film. Red spreads furthest, then green, then blue. */
  halation: {
    /** How bright an area must be to produce a glow, in percent of full brightness; lower makes more of the picture glow. Range 0..100. Default 62. */
    threshold?: number;
    /** How far the glow spreads, in pixels of the clip's picture (the red glow reaches this far). Range 1..60. Default 26. */
    radius?: number;
    /** How much the colors spread different distances, in percent. At 0 every color spreads equally far; at 100 green reaches 70% and blue 45% of the radius, so the glow edge turns red. Range 0..100. Default 70. */
    chroma_bleed?: number;
    /** Strength of the glow in percent; 100 adds it once, 300 three times. Range 0..300. Default 120. */
    intensity?: number;
    /** Color of the glow; it is taken from this color, not from the highlights themselves. Default "#ff612e". */
    color?: Color;
  };
  /** Streaks the picture outward from a center point like a burst of light, favoring bright areas, and adds a general brightening glow over the whole picture. */
  light_burst: {
    /** How strongly bright areas dominate the streaks and how much the whole picture is brightened; higher is brighter and more washed out. Range 0.1..3. Default 1.2. */
    strength?: number;
    /** How long the streaks are, as a fraction of the distance from each point to the center; 1 reaches all the way to the center. Range 0.05..1. Default 0.5. */
    streak_length?: number;
    /** Horizontal position of the burst's center, from 0 to 1 across the clip; 0.5 is the middle. Range 0..1. Default 0.5. */
    center_x?: number;
    /** Vertical position of the burst's center, from 0 to 1 across the clip; 0.5 is the middle. Range 0..1. Default 0.5. */
    center_y?: number;
  };
  /** Cleans up the edge of the clip's transparency: it can soften, shrink or grow the opaque shape and harden or feather its edge. Transparent pixels next to the shape borrow color from it so grown edges are not black. */
  matte_choker: {
    /** First stage: how far the edge is blurred before choking, in pixels of the clip's picture; 0 skips the blur. Range 0..32. Default 8. */
    softness_1?: number;
    /** First stage: positive values shrink the opaque shape and negative values grow it; 0 is neutral and the extremes are -127 and 127. Range -127..127. Default -38.1. */
    choke_1?: number;
    /** First stage: how gradual the edge between opaque and transparent is, in percent; 0 is a hard edge and higher is a softer fade. Range 0..100. Default 35.666664. */
    edge_softness_1?: number;
    /** Second stage: how far the edge is blurred before choking, in pixels of the clip's picture; 0 skips the blur. When above 0, this stage reads the original edge again, so the first stage then has no effect on the result. Range 0..32. Default 14.4. */
    softness_2?: number;
    /** Second stage: positive values shrink the opaque shape and negative values grow it; 0 is neutral and the extremes are -127 and 127. Range -127..127. Default -38.1. */
    choke_2?: number;
    /** Second stage: how gradual the edge between opaque and transparent is, in percent; 0 is a hard edge and higher is a softer fade. Range 0..100. Default 30. */
    edge_softness_2?: number;
    /** How many times the two stages are repeated, rounded to a whole number from 1 to 10. Repeating only builds up when a stage's softness is 0; otherwise each pass starts from the original edge and gives the same result. Range 1..10. Default 3. */
    iterations?: number;
  };
  /** Wraps the picture around its center: the horizontal axis becomes the angle around the center and the vertical axis becomes the distance from it, turning the picture into a circular, kaleidoscope-like warp. Areas that map outside the picture become transparent. */
  polar_coordinates: {
    /** How far to go from the normal picture to the full polar warp; 0 leaves the picture unchanged and 1 is fully warped. Range 0..1. Default 0.51. */
    amount?: number;
  };
  /** Makes circular waves that push the picture in and out from a center point, like a drop in water. The waves fade out toward the edge of their area. */
  ripple: {
    /** Where the ripples start, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.34, 0.5]. */
    center?: Vec2;
    /** Asymmetric waves travel outward (or inward) over time; symmetric waves stay in place and pulse in and out. Default "asymmetric". */
    type?: "asymmetric" | "symmetric";
    /** How far the ripples reach from the center, in percent of half the clip's diagonal; they fade out over the outer part. Range 0..100. Default 43.833332. */
    radius?: number;
    /** How fast the waves move, in wave cycles per second. For asymmetric waves, positive travels outward and negative inward; for symmetric waves it sets how fast they pulse. Range -10..10. Default 1.5. */
    wave_speed?: number;
    /** Distance between wave crests, in pixels of the clip's picture; higher gives wider, gentler waves. Range 1..200. Default 200. */
    wave_width?: number;
    /** How far the waves push the picture, in pixels of the clip's picture; 0 is no distortion. Range 0..100. Default 15. */
    wave_height?: number;
    /** Starting offset of the waves, in degrees from 0 to 360. Range 0..360. Default 354.6. */
    phase?: number;
  };
  /** Makes fine detail and edges crisper by boosting the difference between each pixel and its surroundings, with a cutoff that leaves faint noise alone. */
  sharpen: {
    /** How strongly detail is boosted, as a multiplier; 0 is no sharpening and higher is crisper (and can look harsh). Range 0..10. Default 2. */
    amount?: number;
    /** How far from each pixel the surroundings are sampled, in pixels of the clip's picture; higher sharpens larger details. Range 0.1..5. Default 2.5336666. */
    radius?: number;
    /** Detail weaker than this (a 0 to 1 difference in color) is not sharpened, which keeps noise from being boosted; 0 sharpens everything. Range 0..0.5. Default 0.03. */
    threshold?: number;
    /** How gradual the cutoff around the threshold is, from 0 (hard cutoff) to 1 (widest fade). Range 0..1. Default 0.92333335. */
    threshold_softness?: number;
    /** Which direction is sharpened: 0.5 sharpens both equally, 1 only sharpens across horizontal detail (left-right), 0 only across vertical detail (up-down). Range 0..1. Default 0.5. */
    horizontal_bias?: number;
  };
  /** Draws black outlines along the edges it finds in the picture, like an ink line drawing laid over it. */
  stroke: {
    /** How thick the outlines are, in pixels of the clip's picture. Range 1..8. Default 2. */
    width?: number;
    /** How strong an edge must be to get an outline; higher draws only the strongest edges. Range 0.01..0.8. Default 0.15. */
    threshold?: number;
    /** How dark the outlines are, as a multiplier; 0 draws none, 1 is fully black on strong edges, and above 1 lets weaker edges reach full black too. Range 0..2. Default 1. */
    intensity?: number;
  };
  /** Darkens or tints the edges of the picture with a soft oval fade, leaving the area around the anchor clear. */
  vignette: {
    /** Center of the clear area, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    anchor?: Vec2;
    /** Size of the clear area before the fade starts; higher leaves more of the picture untouched. Range 0..2. Default 0.94. */
    size?: number;
    /** How wide the fade is; higher gives a longer, gentler transition and 0 is nearly a hard edge. Range 0..1. Default 0.6433333. */
    softness?: number;
    /** Shape of the clear area: 1 is measured evenly across the clip's width and height, higher makes it narrower sideways (taller than wide), lower makes it wider. Range 0.5..3. Default 1.325. */
    shape_aspect?: number;
    /** Strength of the vignette from 0 (none) to 1 (full). Range 0..1. Default 1. */
    amount?: number;
    /** Color of the vignette; its alpha is ignored. Default "#000000". */
    color?: Color;
    /** 0 is normal: the edges fade toward the vignette color. 1 is multiply: the picture is multiplied by the vignette color, so only darker colors darken it and white does nothing. Range 0..1. Default 0. */
    blend_mode?: number;
  };
  /** Redraws the picture as a grid of text-style characters: each cell of the picture becomes a symbol, block or bar whose size or count follows how bright that cell is. Brighter cells get fuller characters. */
  ascii_art: {
    /** Color scheme: black_and_white draws the character color over the background color; terminal is green characters on near-black; color draws characters in the picture's own colors over the background color; high_contrast draws black, gray and white characters on black; edge draws characters only along strong edges, using the character and background colors. The background color only shows as far as background_opacity allows. Default "edge". */
    mode?: "black_and_white" | "terminal" | "color" | "high_contrast" | "edge";
    /** How many character cells fit across the clip's width before character_size is applied; higher is a finer grid with smaller characters. Cells are 1.8 times taller than wide. Range 16..240. Default 122.96. */
    columns?: number;
    /** Multiplier for the size of each character cell; 1 is neutral, higher is bigger characters and fewer of them. Range 0.4..2.5. Default 0.47875. */
    character_size?: number;
    /** How heavy the characters are: a multiplier on the thickness and size of the drawn dots, bars and rings; 1 is neutral. It does not change the blocks set. Range 0.5..1.5. Default 1.1308334. */
    density?: number;
    /** Which characters are used: standard has ten steps from dots to rings, blocks draws squares that grow with brightness, minimal uses a few dots and a bar, binary uses an outlined box and a vertical bar. Default "blocks". */
    character_set?: "standard" | "blocks" | "minimal" | "binary";
    /** Shifts how bright the picture reads when choosing characters; 0.5 is neutral, higher gives fuller characters everywhere. Range 0..1. Default 0.7975. */
    brightness?: number;
    /** How strongly dark and bright cells are pushed apart when choosing characters; higher is more contrast. Range 0..1. Default 0.5108333. */
    contrast?: number;
    /** Cells darker than about this level (as a 0 to 1 brightness) get no character at all; 0 draws a character everywhere, higher leaves more cells empty. Range 0..1. Default 0. */
    threshold?: number;
    /** Hue of the character color as a position around the color wheel from 0 to 1. Used by black_and_white and edge modes, and not when use_source_color is on. Range 0..1. Default 0. */
    character_hue?: number;
    /** Saturation of the character color, 0 to 1; 0 is gray or white, 1 is the most vivid. Range 0..1. Default 0. */
    character_saturation?: number;
    /** Brightness of the character color, 0 to 1; 0 is black. Range 0..1. Default 1. */
    character_brightness?: number;
    /** Hue of the background color as a position around the color wheel from 0 to 1. Not used by terminal or high_contrast modes. Range 0..1. Default 0. */
    background_hue?: number;
    /** Saturation of the background color, 0 to 1; 0 is gray or white, 1 is the most vivid. Range 0..1. Default 0. */
    background_saturation?: number;
    /** Brightness of the background color, 0 to 1; 0 is black. Range 0..1. Default 0. */
    background_brightness?: number;
    /** 0 is off, 1 is on. When on, every character takes the average color of its cell in the picture instead of the mode's color. Range 0..1. Default 0. */
    use_source_color?: number;
    /** 0 is off, 1 is on. When on, character colors are turned to shades of gray. Range 0..1. Default 0. */
    monochrome?: number;
    /** 0 is off, 1 is on. When on, dark cells get the fuller characters instead of bright ones. Range 0..1. Default 0. */
    invert?: number;
    /** How much cells along strong edges are made brighter so outlines get fuller characters; 0 is off, higher is stronger. Range 0..1. Default 0. */
    edge_enhance?: number;
    /** Adds a soft halo around each character; 0 is off, 1 is the strongest. Range 0..1. Default 1. */
    glow?: number;
    /** How solid the characters are, 0 to 1; 0 hides them. Range 0..1. Default 1. */
    character_opacity?: number;
    /** How strongly the background color covers the picture between characters, 0 to 1; 0 leaves the original picture showing. Range 0..1. Default 0. */
    background_opacity?: number;
  };
  /** Blurs the picture the way an out-of-focus camera lens does, spreading each point into a polygon-shaped disc. Bright spots can be boosted so they bloom into visible discs. */
  camera_lens_blur: {
    /** Size of the blur in pixels of the clip's picture; 0 is no blur. Range 0..100. Default 5.3333335. */
    radius?: number;
    /** Number of sides of the lens opening, from triangle to decagon. Default "hexagon". */
    shape?: "triangle" | "square" | "pentagon" | "hexagon" | "heptagon" | "octagon" | "nonagon" | "decagon";
    /** Rounds off the corners of the lens shape, in percent; 0 keeps the sharp polygon, 100 makes it a circle. Range 0..100. Default 11.333334. */
    roundness?: number;
    /** Stretches the blur sideways; 1 is neutral, above 1 is wider and below 1 is narrower. Range 0.1..10. Default 4.39. */
    aspect_ratio?: number;
    /** Turns the lens shape, in degrees. Range 0..360. Default 141.6. */
    rotation?: number;
    /** How much the outer edge of the blur shape counts, in percent: 100 weights it like the rest, higher gives bright discs a stronger rim, and 0 leaves the outer edge out (which also shrinks the blur a little). Range 0..500. Default 466.66666. */
    fringe?: number;
    /** How much the bright spots are boosted before blurring, in percent; 0 is off. The boost grows with how far a pixel is above highlight_threshold. Range 0..100. Default 50. */
    highlight_gain?: number;
    /** Brightness on a 0 to 255 scale above which a pixel counts as a bright spot for the gain. Range 0..255. Default 204. */
    highlight_threshold?: number;
    /** Changes the color strength of the boosted bright spots, in percent; 0 leaves it as is, higher is more vivid. Only applies when highlight_gain is above 0. Range 0..100. Default 38.666664. */
    highlight_saturation?: number;
  };
  /** Swaps one color in the picture for another. Pixels near the chosen color are recolored while keeping their own light and dark variation, so shading and texture survive. */
  change_to_color: {
    /** The color to look for and replace. Default "#ffca00". */
    from_color?: Color;
    /** The color to replace it with. Default "#1acc4d". */
    to_color?: Color;
    /** How far a color may differ from from_color and still be replaced, as a distance between colors; higher catches more colors, and the effect fades out gradually toward the limit. Range 0.01..1. Default 0.35. */
    tolerance?: number;
  };
  /** Warps the picture into any four-cornered shape by moving each of its corners, for example to fit it onto a tilted screen or give it a perspective. Everything outside the new shape is transparent. */
  corner_pin: {
    /** Where the picture's upper-left corner goes, as [x, y] from 0 to 1 across the clip; [0, 0] is the clip's upper-left corner. Range [0, 0]..[1, 1]. Default [0, 0]. */
    upper_left?: Vec2;
    /** Where the picture's upper-right corner goes, as [x, y] from 0 to 1 across the clip; [1, 0] is the clip's upper-right corner. Range [0, 0]..[1, 1]. Default [1, 0]. */
    upper_right?: Vec2;
    /** Where the picture's lower-left corner goes, as [x, y] from 0 to 1 across the clip; [0, 1] is the clip's lower-left corner. Range [0, 0]..[1, 1]. Default [0, 1]. */
    lower_left?: Vec2;
    /** Where the picture's lower-right corner goes, as [x, y] from 0 to 1 across the clip; [1, 1] is the clip's lower-right corner. Range [0, 0]..[1, 1]. Default [1, 1]. */
    lower_right?: Vec2;
  };
  /** Turns the picture into a gray relief, as if stamped into metal: edges facing the light look raised and edges facing away look sunken. The original colors are lost unless blended back in. */
  emboss: {
    /** Angle of the lighting axis in degrees: 0 compares pixels to the left and right, 90 compares pixels above and below; adding 180 flips which sides look raised and which sunken. Range 0..360. Default 135. */
    direction?: number;
    /** How far from each pixel the two compared points are, in pixels of the clip's picture; higher gives thicker, wider relief. Range 0..50. Default 2. */
    relief?: number;
    /** How strongly light and dark sides are pushed apart, as a multiplier; higher is a deeper relief, 0 is flat gray. Range 0..20. Default 2. */
    contrast?: number;
    /** How much of the original picture is blended back over the relief, in percent; 0 is only the gray relief, 100 is the original. Range 0..100. Default 0. */
    mix?: number;
  };
  /** Draws only the outlines of the picture: edges show as bright lines in the picture's colors on black, and flat areas go black. Invert gives dark lines on white. */
  find_edge: {
    /** How bright the lines are, as a multiplier; higher makes even faint edges strong. Range 0..10. Default 10. */
    intensity?: number;
    /** How far apart the points compared to find an edge are, in pixels of the clip's picture; higher gives thicker lines. Range 0.5..5. Default 1.8125. */
    edge_width?: number;
    /** Edge strength (0 to 1) that is subtracted from every line; higher removes faint edges and noise, leaving only strong ones. Range 0..1. Default 0.05. */
    threshold?: number;
    /** Flips the result to dark lines on white (true) instead of bright lines on black (false). Default false. */
    invert?: boolean;
  };
  /** Redraws the picture as a printed halftone pattern: a grid of dots (or other shapes) whose size follows how dark each spot is, on a paper-colored background. */
  halftone: {
    /** Width of each cell of the dot grid, in pixels of the clip's picture; lower is a finer pattern. Range 1..100. Default 16.675. */
    grid_size?: number;
    /** Shape drawn in each cell: circle, square, line (stripes), diamond or cross. Default "circle". */
    shape?: "circle" | "square" | "line" | "diamond" | "cross";
    /** What decides the dot size: all uses the overall brightness, red, green or blue use that color only, alpha uses opacity. Default "all". */
    channel?: "all" | "red" | "green" | "blue" | "alpha";
    /** How dots are colored: monochrome uses ink_color on paper_color, source_colors colors each dot with the picture's color at that spot, duotone currently looks the same as monochrome. Default "monochrome". */
    color_mode?: "monochrome" | "source_colors" | "duotone";
    /** How the picture is read for each dot: smooth blends neighboring pixels, nearest takes the single closest pixel. Default "smooth". */
    sampling?: "smooth" | "nearest";
    /** Rotation of the dot grid, in degrees, around the grid's anchor point. Range -180..180. Default -79.799995. */
    angle?: number;
    /** Size of the dots as a multiplier; around 8 lets the darkest areas just fill their cells, higher makes dots grow into each other and lower makes them smaller. Range 0.1..50. Default 7.3355. */
    dot_size?: number;
    /** Stretches the cells along the grid's second direction (vertical when angle is 0); 1 is square cells, above 1 is taller cells and below 1 is flatter ones. Range 0.1..10. Default 1.0074999. */
    aspect?: number;
    /** Has no visible effect. Range 0..100. Default 0. */
    random_seed?: number;
    /** Horizontal position where the grid is anchored and rotates around, as a fraction from 0 to 1 across the clip; 0.5 is the middle. Range 0..1. Default 0.5. */
    center_x?: number;
    /** Vertical position where the grid is anchored and rotates around, as a fraction from 0 to 1 down the clip; 0.5 is the middle. Range 0..1. Default 0.5. */
    center_y?: number;
    /** Moves the grid's anchor sideways, in pixels of the clip's picture, counted from 960: 960 adds no shift, higher moves it right and lower moves it left. Range -2000..4000. Default 960. */
    shift_x?: number;
    /** Moves the grid's anchor vertically, in pixels of the clip's picture, counted from 540: 540 adds no shift, higher moves it down and lower moves it up. Range -2000..4000. Default 540. */
    shift_y?: number;
    /** Contrast applied to the picture before dots are sized, as a multiplier; 1 is neutral. Range 0..5. Default 1. */
    contrast?: number;
    /** Midtone adjustment before dots are sized; 1 is neutral, higher lightens the picture so dots shrink, lower darkens it. Range 0.1..5. Default 1.1. */
    gamma?: number;
    /** Brightness added before dots are sized; 0 is neutral, positive makes dots smaller and negative makes them bigger. Range -1..1. Default 0. */
    brightness?: number;
    /** Color of the dots in monochrome and duotone modes. Default "#000000". */
    ink_color?: Color;
    /** Color of the background between the dots. Default "#f4efe6". */
    paper_color?: Color;
    /** Makes the background between the dots transparent (true) instead of paper-colored (false). Default false. */
    transparent_paper?: boolean;
    /** Swaps light and dark so bright areas get the big dots (true). Default false. */
    invert?: boolean;
    /** How much of the halftone shows over the original picture, 0 to 1; 0 is the original, 1 is fully halftone. Range 0..1. Default 1. */
    mix?: number;
  };
  /** Streaks the bright parts of the picture into warm light rays that radiate away from a point above the middle of the picture, added on top of the image. The point is fixed and cannot be moved. */
  light_rays: {
    /** Strength of the rays, as a multiplier; 0 is no rays. Range 0..2. Default 1.94. */
    intensity?: number;
    /** How long the rays are, as a fraction of the distance from each pixel to the fixed point; higher is longer rays. Range 0.1..1. Default 1. */
    ray_length?: number;
    /** Brightness (0 to 1) a color must exceed to cast rays; higher means only the brightest spots do. Range 0..1. Default 0.5. */
    threshold?: number;
  };
  /** Smooths away speckle and fine detail while keeping edges fairly sharp, giving a slightly painted, flattened look. */
  median: {
    /** Size of the area compared around each pixel, in whole pixels of the clip's picture: 1 looks at a 3 by 3 area and 2 at a 5 by 5 area; values are rounded. Range 1..2. Default 2. */
    radius?: number;
    /** 0 is off, 1 is on. When on, transparency is smoothed too, so ragged edges and small holes in the clip's outline are cleaned up. Range 0..1. Default 0. */
    include_transparency?: number;
  };
  /** Reduces the picture to a small number of tones per color, giving flat bands of color instead of smooth gradients. */
  posterize: {
    /** Number of tones allowed in each color channel; lower is a harsher, flatter look and 2 is the minimum. Range 2..32. Default 5. */
    levels?: number;
    /** How much of the posterized picture shows over the original, 0 to 1; 0 is the original, 1 is fully posterized. Range 0..1. Default 1. */
    mix?: number;
  };
  /** Makes the outline of the visible (non-transparent) part of the picture ragged, like torn or eroded paper, and the roughness can animate over time. Some styles also color the roughened edge. */
  roughen_edges: {
    /** Look of the edge: roughen is a plain ragged edge, spiky is a ragged edge with a band of edge color along it, ridged is a ragged edge with a band of rust-like color derived from the edge color. Default "roughen". */
    style?: "roughen" | "spiky" | "ridged";
    /** How wide the roughened band along the outline is, in pixels of the clip's picture; higher eats further into the picture. Range 0..64. Default 18. */
    border?: number;
    /** How crisp the roughened edge is; higher is hard-edged, lower is soft and feathered. Range 0.01..10. Default 2. */
    sharpness?: number;
    /** Size of the roughness pattern; higher gives smaller, busier wobbles and lower gives larger, smoother ones. Range 0.1..50. Default 12. */
    scale?: number;
    /** How many layers of finer detail are added to the roughness; values are rounded to whole numbers, higher is more detailed. Range 1..8. Default 4. */
    complexity?: number;
    /** Picks the roughness pattern: changing it morphs the edge into a different shape. Range 0..100. Default 0. */
    evolution?: number;
    /** Makes the roughness keep changing over time (true) instead of staying still (false). Default true. */
    animate?: boolean;
    /** Red part of the edge color, 0 to 1. Only used by the spiky and ridged styles. Range 0..1. Default 0.55. */
    edge_red?: number;
    /** Green part of the edge color, 0 to 1. Only used by the spiky and ridged styles. Range 0..1. Default 1. */
    edge_green?: number;
    /** Blue part of the edge color, 0 to 1. Only used by the spiky and ridged styles. Range 0..1. Default 1. */
    edge_blue?: number;
  };
  /** Removes a color cast left on a subject by a colored backdrop (for example green-screen spill) by pulling that color down in the pixels where it is too strong. Transparency is not changed. */
  spill_suppressor: {
    /** The color of the spill to remove, usually the backdrop color. Default "#00ff00". */
    color?: Color;
    /** How much of the spill is removed, in percent; 0 does nothing, 100 removes it all. Range 0..100. Default 100. */
    suppression?: number;
    /** Limits the correction to the subject's edges and partly transparent pixels (true), leaving solid interiors untouched, or applies it everywhere (false). Default false. */
    edge_only?: boolean;
    /** How far in from the transparent edge the correction reaches, in pixels of the clip's picture. Only matters when edge_only is true. Range 0.5..20. Default 2. */
    edge_width?: number;
    /** Keeps the corrected pixels as bright as before (true) so edges do not turn dark; false lets them darken. Default true. */
    preserve_luminance?: boolean;
  };
  /** Adds a glowing burst of light rays radiating from a point, brightest in the middle and fading outward, on top of the picture. */
  sunburst: {
    /** Number of rays around the center; whole numbers give an even burst, other values leave a visible seam. Range 4..64. Default 5.5. */
    ray_count?: number;
    /** Brightness of the burst, as a multiplier; 0 adds nothing. Range 0..2. Default 0.7. */
    intensity?: number;
    /** Size of the bright glow around the center; higher spreads the glow and rays farther out. Range 0.05..0.8. Default 0.29375. */
    core_size?: number;
    /** Where the rays start, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.35]. */
    center?: Vec2;
    /** Color of the light. Default "#ffd980". */
    color?: Color;
    /** Turns the rays around the center, in degrees. Range 0..360. Default 0. */
    rotation?: number;
  };
  /** Ripples the picture with a moving wave that pushes pixels sideways, like looking through water or a flag in the wind. The waves travel over time. */
  wave_warp: {
    /** Shape of the wave: sine is smooth, square and sawtooth are abrupt, triangle is zig-zag, circle, semicircle and uncircle are arc-shaped, noise is random steps and smooth_noise is random but smoothly varying. Default "sine". */
    wave_type?: "sine" | "square" | "triangle" | "sawtooth" | "circle" | "semicircle" | "uncircle" | "noise" | "smooth_noise";
    /** How far the wave pushes the picture at its peaks, in pixels of the clip's picture; 0 is no distortion. Range 0..500. Default 5. */
    height?: number;
    /** Length of one full wave, in pixels of the clip's picture; higher is longer, gentler waves. Range 1..1000. Default 200. */
    width?: number;
    /** Direction the waves travel, in degrees: 0 sends them along the width of the picture (pushing it up and down), 90 along the height (pushing it sideways). Range 0..360. Default 90. */
    direction?: number;
    /** How fast the waves move, in wave lengths per second; negative reverses them and 0 holds them still. Range -20..20. Default 1. */
    speed?: number;
    /** Holds the picture still near its edges so they do not wobble: none lets everything move, all_edges pins all four sides, the others pin only that side. Pinning fades in over about 15 percent of the clip. Default "none". */
    pinning?: "none" | "all_edges" | "left_edge" | "right_edge" | "top_edge" | "bottom_edge";
    /** Slides the wave along its direction, in degrees; 360 is one full wave length. Range 0..360. Default 0. */
    phase?: number;
    /** Quality of the edges: low is fastest and can look jagged, high is smoothest. Default "high". */
    smoothing?: "low" | "medium" | "high";
  };
  /** Gives the clip's outer border a raised, beveled look: a band along each side of the picture is lit or darkened as if light hit it from one direction. */
  bevel_edges: {
    /** Width of the beveled band along each side, as a fraction of the clip's shorter side (at least 1 pixel). Range 0..0.5. Default 0.0925. */
    edge_thickness?: number;
    /** Direction the light comes from, in degrees counterclockwise: 0 is from the right, 90 from the top. Sides facing the light are lightened, sides facing away are darkened. Range -360..360. Default -10.799988. */
    angle?: number;
    /** Color the lit sides are pushed toward. Its transparency is ignored. Default "#ffffff". */
    color?: Color;
    /** How strongly the sides are lit and darkened; 0 leaves the picture unchanged. Range 0..1. Default 0.39166668. */
    intensity?: number;
    /** How softly the bevel fades out toward the inner edge of the band, in percent of the band's width; 0 ends it with a hard step. Range 0..100. Default 0. */
    feather?: number;
  };
  /** Shakes the whole picture like a handheld camera, drifting it sideways, tilting it slightly and zooming in a little so the edges stay covered. The motion runs over time, so it shows when playing. */
  camera_shake: {
    /** How far the picture drifts, in percent; higher shakes harder. Range 0..200. Default 30. */
    amount?: number;
    /** How fast the shake moves, per second; higher is quicker and 0 holds the picture still. Range 0..30. Default 6. */
    frequency?: number;
    /** How far the picture tilts at most, in degrees. Range 0..15. Default 1. */
    rotation?: number;
    /** How much the picture is enlarged to hide the borders exposed by the shake, in percent. Range 0..50. Default 8. */
    zoom?: number;
    /** How smooth the motion is, in percent; 100 is a slow, gentle drift and lower adds finer, faster jitter. Range 0..100. Default 50. */
    smoothness?: number;
    /** Picks the shake pattern; a different value gives a different movement. Range 0..100. Default 1. */
    seed?: number;
  };
  /** Splits the red, green and blue channels apart so colored fringes appear around edges, like a cheap lens. The split either grows outward from a center point or shifts along one direction. */
  chromatic_aberration: {
    /** How much of the fringed picture shows over the original; 0 shows none. Range 0..1. Default 1. */
    mix?: number;
    /** How far the channels are pushed apart; negative values reverse which way each channel moves and 0 does nothing. Range -2..2. Default 1.4533334. */
    amount?: number;
    /** Point the fringes grow outward from, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Only used when mode is below 0.5. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** How far the red channel moves, as a multiplier of the amount; negative moves it the other way and 0 keeps it in place. Range -2..2. Default 1. */
    red_scale?: number;
    /** How far the blue channel moves, as a multiplier of the amount; negative moves it the other way and 0 keeps it in place. Range -2..2. Default -0.85. */
    blue_scale?: number;
    /** How far the green channel moves, as a multiplier of the amount; negative moves it the other way and 0 keeps it in place. Range -2..2. Default 0.2. */
    green_scale?: number;
    /** How much the split grows with distance from the center: 0 splits the channels evenly everywhere, higher keeps the area near the center cleaner and the outer parts more split. Only used when mode is below 0.5. Range 0..1. Default 0.72. */
    falloff?: number;
    /** Smooths each shifted channel along its movement so the fringes blend instead of stepping; 0 is off, higher is softer. Range 0..1. Default 0.42333335. */
    soften?: number;
    /** Direction of the shift in radians (0 to about 6.28 is a full turn). Only used when mode is 0.5 or above. Range 0..6.2832. Default 0. */
    angle?: number;
    /** Which kind of split: below 0.5 grows the fringes outward from the center point, 0.5 and above shifts the channels in a straight line along the angle. Range 0..1. Default 0. */
    mode?: number;
    /** How much the split depends on how bright each pixel is: 0 splits everything equally, 1 splits bright pixels fully and dark pixels hardly at all. Range 0..1. Default 0.47666666. */
    brightness_weight?: number;
    /** What shows where a shifted channel reaches past the picture's edge: below 0.5 repeats the edge pixels, 0.5 and above mirrors the picture. Range 0..1. Default 1. */
    edge_mode?: number;
    /** 0.5 and above doubles the amount; below 0.5 leaves it as set. Range 0..1. Default 0. */
    stronger?: number;
    /** 0.5 and above shows only the colored fringes (the difference from the original, brightened) instead of the picture; below 0.5 shows the normal result. Range 0..1. Default 0. */
    show_fringes?: number;
  };
  /** Makes the bright parts of the picture glow with a tight hot core and a wide soft halo, giving a filmic bloom. The glow stays on the clip's visible pixels; it does not spill onto transparent areas. */
  deep_glow: {
    /** How bright a color must be to glow, in percent of full brightness; lower makes more of the picture glow. Range 0..100. Default 48. */
    threshold?: number;
    /** How far the tight inner glow spreads, in pixels of the clip's picture. Range 1..25. Default 16. */
    radius?: number;
    /** How much wider the outer halo is than the inner glow, as a multiplier of the radius; higher gives a larger, hazier halo. Range 1.5..4. Default 3. */
    spread?: number;
    /** Brightness of the glow in stops: each +1 doubles it and each -1 halves it; 0 is neutral. Range -2..4. Default 1.2. */
    exposure?: number;
    /** Shapes how the glow fades out: higher keeps only the brightest parts glowing and tightens the falloff, lower gives a broader, flatter glow. Range 0.4..3. Default 1.6. */
    gamma?: number;
    /** Strength of the glow in percent; 100 is neutral. Range 0..300. Default 120. */
    intensity?: number;
    /** Color the glow is multiplied by; white keeps the picture's own colors. Default "#ffffff". */
    color?: Color;
  };
  /** Keeps only the parts of the picture whose brightness (or one color channel) falls between a black level and a white level, and makes everything else transparent. Useful to cut out bright or dark shapes. */
  extract: {
    /** What is measured to decide what is kept: overall brightness or a single color channel. Default "luminance". */
    channel?: "luminance" | "red" | "green" | "blue";
    /** Lower level, on a 0 to 255 scale: pixels darker than this become transparent. Range 0..255. Default 40. */
    black_point?: number;
    /** Upper level, on a 0 to 255 scale: pixels brighter than this become transparent. Range 0..255. Default 215. */
    white_point?: number;
    /** Width of the fade-in above the black level, on the same 0 to 255 scale; 0 is a hard cut. If the fades would overlap they are shortened to fit. Range 0..255. Default 20. */
    black_softness?: number;
    /** Width of the fade-out below the white level, on the same 0 to 255 scale; 0 is a hard cut. If the fades would overlap they are shortened to fit. Range 0..255. Default 0. */
    white_softness?: number;
    /** Swap what is kept and what is removed: true keeps the parts that would otherwise become transparent. Default false. */
    invert?: boolean;
  };
  /** Generates cloudy grayscale noise and blends it over the picture; with the normal blend at full opacity it replaces the picture while keeping its transparency. The pattern also changes slowly over time. */
  fractal_noise: {
    /** Character of the noise: basic is soft clouds, turbulent has sharper creases and ridges. Default "basic". */
    fractal_type?: "basic" | "turbulent";
    /** How the noise is smoothed: soft_linear is smoothest, linear is a bit harder, block is made of hard-edged squares. Default "soft_linear". */
    noise_type?: "soft_linear" | "linear" | "block";
    /** True flips the noise so light becomes dark and dark becomes light. Default false. */
    invert?: boolean;
    /** How strongly the noise is stretched between dark and light, in percent; 100 is unchanged and higher is harsher. Range 0..500. Default 500. */
    contrast?: number;
    /** Lightens (positive) or darkens (negative) the noise, in percent of full brightness; 0 is neutral. Range -100..100. Default 0. */
    brightness?: number;
    /** Overall size of the noise features, in percent; higher is bigger, 100 is neutral. Range 1..1000. Default 100. */
    scale?: number;
    /** Stretches the features horizontally, in percent, on top of scale; 100 is neutral. Range 1..1000. Default 100. */
    scale_width?: number;
    /** Stretches the features vertically, in percent, on top of scale; 100 is neutral. Range 1..1000. Default 100. */
    scale_height?: number;
    /** Turns the whole pattern, in degrees. Range -360..360. Default 0. */
    rotation?: number;
    /** Shifts the pattern sideways, as [x, y]. This is not a position across the clip; larger values slide the pattern farther. Range [0, 0]..[1, 1]. Default [0, 0]. */
    offset?: Vec2;
    /** How many layers of finer detail are stacked, from 1 to 10 (whole numbers); higher is more detailed. Range 1..10. Default 6. */
    complexity?: number;
    /** How strongly each finer layer counts compared to the one before it, in percent; higher gives more fine detail. Range 0..100. Default 70. */
    detail_strength?: number;
    /** Size of each finer layer compared to the one before it, in percent; lower makes the detail finer. Range 10..100. Default 56. */
    detail_scale?: number;
    /** Extra turn applied to each finer layer, in degrees. Range -360..360. Default 0. */
    detail_rotation?: number;
    /** Moves the pattern through its changes, in degrees; 360 is one full step. The pattern also changes by itself over time, one step about every 15 seconds. Range -3600..3600. Default -3600. */
    evolution?: number;
    /** How much of the noise shows over the picture, in percent; 0 shows only the original. Range 0..100. Default 100. */
    opacity?: number;
    /** How the noise combines with the picture: normal replaces it, screen lightens, multiply darkens, overlay adds contrast, add brightens most. Default "normal". */
    blend?: "normal" | "screen" | "multiply" | "overlay" | "add";
  };
  /** Makes the picture shimmer and ripple like air over hot ground, with soft blurry patches drifting through it. The motion runs over time, so it shows when playing. */
  heat_distortion: {
    /** How far the ripples push pixels around; higher is a stronger wobble. Range 0..100. Default 26.499998. */
    amount?: number;
    /** Size of the ripples: higher gives more, smaller ripples and lower gives fewer, larger ones. Range 0.1..10. Default 0.4795. */
    scale?: number;
    /** How fast the ripples move, as a multiplier of time; negative runs them backwards and 0 freezes them. Range -10..10. Default 1.833333. */
    speed?: number;
    /** Direction the ripples drift in, in degrees. Range 0..360. Default 88.200005. */
    drift_direction?: number;
    /** How many layers of fine detail the ripples have, from 1 to 4 (whole numbers); higher is more detailed. Range 1..5. Default 3. */
    complexity?: number;
    /** Fades the effect from the top of the picture to the bottom: 0 applies it evenly everywhere, 1 is full strength at the top and none at the bottom. Range 0..1. Default 1. */
    falloff?: number;
    /** How blurry the drifting soft patches get, roughly in pixels of the clip's picture; 0 turns the blur off. Range 0..10. Default 10. */
    blur_amount?: number;
  };
  /** Lays a band of light across the picture, with extra shine on the edges of shapes inside it. The band can brighten the picture, tint it, or be cut out on its own. */
  light_sweep: {
    /** Point the band passes through, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.68, 0.25]. */
    center?: Vec2;
    /** Direction the band runs along, in degrees: 0 is a horizontal band, 90 a vertical one. Range -360..360. Default -86.399994. */
    direction?: number;
    /** Profile of the band: sharp is brightest at the middle and fades in a straight line, smooth fades gently, sharp_edge is an even band with a steep drop-off at its sides. Default "sharp". */
    shape?: "sharp" | "smooth" | "sharp_edge";
    /** Full width of the band, in pixels of the clip's picture. Range 1..500. Default 50. */
    width?: number;
    /** Strength of the band's light over the whole picture, in percent. Range 0..100. Default 25. */
    sweep_intensity?: number;
    /** Extra strength of the light on edges of shapes and on the clip's transparent edges inside the band, in percent. Range 0..100. Default 50. */
    edge_intensity?: number;
    /** How wide a step the edge detection looks across, in pixels of the clip's picture; higher catches broader edges. Range 0.1..50. Default 4. */
    edge_thickness?: number;
    /** Color of the light. Default "#fffdf0". */
    color?: Color;
    /** How the light combines with the picture: add brightens it (and can burn out to white), composite lays the light color over it so it tints rather than brightens, cutout keeps only the light in its color and makes the rest transparent. Default "add". */
    light_mode?: "add" | "composite" | "cutout";
  };
  /** Turns the picture into a grid of flat-colored blocks, each the average color of the part of the picture it covers. */
  mosaic: {
    /** Number of blocks across the clip (whole numbers); higher is finer. Range 1..500. Default 80. */
    columns?: number;
    /** Number of blocks down the clip (whole numbers); higher is finer. Range 1..500. Default 80. */
    rows?: number;
  };
  /** Blurs the picture around a center point, either as a spin (blur along circles, like a rotating camera) or a zoom (blur along rays, like a fast push-in). The center stays sharp. */
  radial_blur: {
    /** Kind of blur: spin blurs around the center, zoom blurs outward from it. Default "spin". */
    type?: "spin" | "zoom";
    /** Center of the blur, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** Strength of the blur in percent; 0 is no blur. At 100 the spin covers about 12 degrees and the zoom about 12 percent. Range 0..100. Default 45. */
    amount?: number;
  };
  /** Draws fine dark lines across the picture, like an old monitor. Can add a second set of lines at right angles for a grid and can scroll over time. */
  scanlines: {
    /** How many lines there are: about half this number of dark lines across the clip's height; higher is finer. Range 10..600. Default 167.70209. */
    frequency?: number;
    /** How crisp the lines are: 0 is soft, blurry stripes and 1 is hard-edged lines. Range 0..1. Default 0.38333333. */
    sharpness?: number;
    /** How dark the gaps between lines get; 0 leaves the picture unchanged and 1 makes them fully black. Range 0..1. Default 0.7339583. */
    intensity?: number;
    /** Direction of the lines in degrees: 0 gives horizontal lines and 90 vertical ones. Range 0..360. Default 0. */
    angle?: number;
    /** 0.5 and above adds a second set of lines at right angles, making a grid; below 0.5 keeps a single set. Range 0..1. Default 0.360625. */
    crosshatch?: number;
    /** How fast the lines scroll, in percent of the clip's height per second; negative scrolls the other way and 0 holds them still. The crosshatch lines stay in place. Range -100..100. Default 0. */
    scroll_speed?: number;
  };
  /** Cuts the picture in two along a line through its center and pulls the halves apart, leaving a solid black gap between them. */
  split: {
    /** Width of the black gap, as a fraction of the clip; each half moves outward by half of it. Higher pulls the halves farther apart and cuts off more of the picture. Range 0..0.8. Default 0.12. */
    amount?: number;
    /** Direction the halves move apart, in degrees: 0 moves them left and right (a vertical gap), 90 moves them up and down. The gap is cut at right angles to it. Range 0..360. Default 45. */
    angle?: number;
  };
  /** Repeats the picture as a grid of smaller copies so the whole frame is filled with tiles. */
  tiler: {
    /** Size of each tile in percent of the clip: 100 is the original picture, 50 gives two copies across and two down, and above 100 zooms in so only part of the picture shows. Range 1..1000. Default 17.5. */
    scale?: number;
    /** Point the tiling is anchored to, as [x, y] in pixels of the clip's picture (not 0 to 1); moving it slides the grid of tiles. Range [-4000, -4000]..[4000, 4000]. Default [960, 540]. */
    center?: Vec2;
    /** How much of the original, untiled picture is mixed in, in percent; 0 shows only the tiles and 100 shows only the original. Range 0..100. Default 0. */
    mix?: number;
  };
  /** Bends the picture by dragging its four corners and the curved handles along its four edges, so a flat picture can be stretched, skewed or bulged into a curved shape. Anything outside the bent shape becomes transparent. */
  bezier_warp: {
    /** Where the picture's top-left corner lands, as [x, y] from 0 to 1 across the clip; [0, 0] is the clip's top-left. Range [-1, -1]..[2, 2]. Default [0, 0]. */
    top_left_corner?: Vec2;
    /** Curve handle on the top edge next to the top-left corner, as [x, y] from 0 to 1 across the clip. Moving it bends the top edge near that corner. Range [-1, -1]..[2, 2]. Default [0.33333334, 0]. */
    top_left_handle?: Vec2;
    /** Curve handle on the top edge next to the top-right corner, as [x, y] from 0 to 1 across the clip. Moving it bends the top edge near that corner. Range [-1, -1]..[2, 2]. Default [0.6666667, 0]. */
    top_right_handle?: Vec2;
    /** Where the picture's top-right corner lands, as [x, y] from 0 to 1 across the clip; [1, 0] is the clip's top-right. Range [-1, -1]..[2, 2]. Default [1, 0]. */
    top_right_corner?: Vec2;
    /** Curve handle on the right edge next to the top-right corner, as [x, y] from 0 to 1 across the clip. Moving it bends the right edge near that corner. Range [-1, -1]..[2, 2]. Default [1, 0.33333334]. */
    right_top_handle?: Vec2;
    /** Curve handle on the right edge next to the bottom-right corner, as [x, y] from 0 to 1 across the clip. Moving it bends the right edge near that corner. Range [-1, -1]..[2, 2]. Default [1, 0.6666667]. */
    right_bottom_handle?: Vec2;
    /** Where the picture's bottom-right corner lands, as [x, y] from 0 to 1 across the clip; [1, 1] is the clip's bottom-right. Range [-1, -1]..[2, 2]. Default [1, 1]. */
    bottom_right_corner?: Vec2;
    /** Curve handle on the bottom edge next to the bottom-right corner, as [x, y] from 0 to 1 across the clip. Moving it bends the bottom edge near that corner. Range [-1, -1]..[2, 2]. Default [0.6666667, 1]. */
    bottom_right_handle?: Vec2;
    /** Curve handle on the bottom edge next to the bottom-left corner, as [x, y] from 0 to 1 across the clip. Moving it bends the bottom edge near that corner. Range [-1, -1]..[2, 2]. Default [0.33333334, 1]. */
    bottom_left_handle?: Vec2;
    /** Where the picture's bottom-left corner lands, as [x, y] from 0 to 1 across the clip; [0, 1] is the clip's bottom-left. Range [-1, -1]..[2, 2]. Default [0, 1]. */
    bottom_left_corner?: Vec2;
    /** Curve handle on the left edge next to the bottom-left corner, as [x, y] from 0 to 1 across the clip. Moving it bends the left edge near that corner. Range [-1, -1]..[2, 2]. Default [0, 0.6666667]. */
    left_bottom_handle?: Vec2;
    /** Curve handle on the left edge next to the top-left corner, as [x, y] from 0 to 1 across the clip. Moving it bends the left edge near that corner. Range [-1, -1]..[2, 2]. Default [0, 0.33333334]. */
    left_top_handle?: Vec2;
    /** How many refinement passes are used to fit the picture to the bent shape; higher is more accurate on strong bends but slower. Values above 16 make no difference. Range 1..32. Default 8. */
    quality?: number;
  };
  /** Turns the picture into a cartoon: colors are smoothed and flattened into a limited number of brightness steps, and dark ink outlines are drawn along edges. It can show the flat colors, the outlines on white, or both. */
  cartoon: {
    /** How far the color smoothing reaches, about this many pixels of the clip's picture; higher flattens more fine detail. Range 0..30. Default 22.6. */
    smoothing_radius?: number;
    /** How different in brightness two neighboring areas can be and still be smoothed together, in percent; higher flattens more, lower keeps contrasty detail sharp. Range 0..100. Default 81.333336. */
    smoothing_tolerance?: number;
    /** Number of brightness steps the colors are flattened into (at least 2); lower gives a more poster-like look. Range 2..32. Default 23.800001. */
    color_levels?: number;
    /** How much the brightness steps are blended back toward the smooth picture, in percent; 0 gives hard bands, 100 gives the softest bands. Range 0..100. Default 100. */
    level_blending?: number;
    /** How strong an edge must be to get an outline; higher draws fewer lines. Range 0.1..10. Default 1.6839999. */
    edge_threshold?: number;
    /** Width of the outlines in pixels of the clip's picture (at least 0.5). Range 0.5..10. Default 5.3133335. */
    edge_width?: number;
    /** How gradually outlines fade in around the threshold, in percent; higher gives softer, fainter lines. Range 0..100. Default 35. */
    edge_softness?: number;
    /** How dark the outlines are, in percent; 0 hides them. Range 0..100. Default 100. */
    edge_opacity?: number;
    /** Extra color saturation added before flattening, as a fraction; 0 adds none, 0.5 makes colors 50% more saturated. Range 0..1. Default 0.15. */
    saturation_boost?: number;
    /** What to show: lines_only draws black outlines on white, colors_only shows the flattened colors without outlines, both draws the outlines over the flattened colors. Transparent areas of the clip stay transparent. Default "both". */
    style?: "lines_only" | "colors_only" | "both";
  };
  /** Gives the picture a raised, relief look: edges facing the upper left light up and edges facing the lower right darken, added on top of the original colors. */
  color_emboss: {
    /** How strong the relief is, as a multiplier; 0 leaves the picture unchanged. Range 0..10. Default 5.516667. */
    strength?: number;
    /** How far from each pixel, in pixels of the clip's picture, the two compared points sit on either side; higher gives thicker, broader relief edges. Range 0.5..5. Default 3.0725. */
    relief?: number;
  };
  /** Pushes or pulls the picture around a point, like a dent or a bulge: the area around the center is pinched inward or swelled outward and fades back to normal at its edge. */
  dent: {
    /** Center of the dent as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** Radius of the affected area as a fraction of the clip's height (sideways distances are first scaled by aspect); higher affects more of the picture. Range 0..1. Default 0.75. */
    size?: number;
    /** How strongly the picture is warped: positive pinches the picture toward the center, negative bulges it outward; 0 does nothing. Range -1..1. Default -0.5. */
    strength?: number;
    /** Shape of the warp's falloff: below 0.5 uses a power curve, 0.5 and above uses a sine curve; the two respond differently to strength. Range 0..1. Default 0.036666665. */
    curve?: number;
    /** Width of an extra fade at the outer edge of the affected area, in the same units as size; 0 leaves the edge as is. Range 0..0.5. Default 0. */
    edge_softness?: number;
    /** Multiplier applied to sideways distances before measuring the area; use the clip's width divided by its height for a round dent, 1 gives an area wider than tall on a wide clip. Range 0.1..10. Default 1.387. */
    aspect?: number;
    /** How much of the warped picture shows over the original; 0 shows only the original, 1 only the warped picture. Range 0..1. Default 1. */
    mix?: number;
  };
  /** Paints the clip's visible pixels with a flat color, keeping its shape and transparency. At partial opacity the color is mixed with the picture. */
  fill: {
    /** The color to fill with. Default "#00d3ff". */
    color?: Color;
    /** How much of the fill color replaces the picture, from 0 (none) to 1 (flat color only). Range 0..1. Default 1. */
    opacity?: number;
  };
  /** Adds a soft, hazy bloom from the bright parts of the picture while dimming the original underneath, giving a dreamy, washed look rather than extra light. */
  gloom: {
    /** How bright an area must be to bloom, in percent of full brightness; lower makes more of the picture bloom. Range 0..100. Default 60. */
    threshold?: number;
    /** How far the bloom spreads, in pixels of the clip's picture. Range 0.5..100. Default 20. */
    radius?: number;
    /** Strength of the bloom in percent; 100 adds the bloom once, 300 three times. Range 0..300. Default 70. */
    intensity?: number;
    /** How much of the original picture is kept under the bloom, in percent; 100 keeps it fully, lower dims it. Range 0..100. Default 85. */
    original_brightness?: number;
    /** Color the bloom is multiplied by; white keeps the picture's own colors. Default "#ffffff". */
    color?: Color;
    /** When true, the dark areas bloom instead of the bright ones, using inverted colors. Default false. */
    invert?: boolean;
  };
  /** Randomly nudges the hue, lightness and saturation of each part of the picture, giving a colorful speckle that keeps changing as the clip plays. */
  hls_noise: {
    /** Kind of noise: uniform is an even speckle on every pixel, squared is the same speckle but mostly small changes with occasional strong ones, grain is smooth soft blotches whose size is set by grain_size. Default "uniform". */
    noise_type?: "uniform" | "squared" | "grain";
    /** How far the noise can shift each color around the color wheel, as a fraction of the full wheel in either direction; 0 leaves hues alone. Range 0..1. Default 0.35333332. */
    hue_amount?: number;
    /** How much the noise can lighten or darken each pixel, as a fraction of full brightness in either direction; 0 leaves lightness alone. Range 0..1. Default 0.28. */
    lightness_amount?: number;
    /** How much the noise can raise or lower each pixel's color saturation, as a fraction in either direction; 0 leaves saturation alone. Range 0..1. Default 0.28666666. */
    saturation_amount?: number;
    /** Size of the blotches in pixels of the clip's picture. Only used when noise_type is grain; the other types ignore it. Range 0.1..10. Default 2.6079998. */
    grain_size?: number;
    /** Picks which random pattern is shown: each value gives a different pattern. The pattern also keeps changing on its own over the length of the clip. Range 0..3600. Default 1512. */
    seed?: number;
  };
  /** Makes pixels that match a chosen color transparent (or, in keep mode, keeps only those pixels), with a soft edge between matching and non-matching. Useful for removing a green or blue backdrop. */
  linear_color_key: {
    /** The color to match. Default "#00ff00". */
    key_color?: Color;
    /** How closeness to the color is judged: rgb compares the full color, hue compares only the hue so shadows and highlights of the color match too, chroma compares hue and saturation but ignores brightness. Default "rgb". */
    match_by?: "rgb" | "hue" | "chroma";
    /** How far from the color a pixel can be and still fully match, in percent of the largest possible difference; higher matches more. Range 0..100. Default 20. */
    tolerance?: number;
    /** Width of the soft fade between matching and non-matching pixels, in percent; 0 is a hard edge. Range 0..100. Default 10. */
    softness?: number;
    /** remove makes matching pixels transparent; keep does the opposite and makes everything except the matching pixels transparent. Default "remove". */
    operation?: "remove" | "keep";
    /** result shows the keyed picture; matte shows a black and white mask instead, white where the picture is kept and black where it is removed. Default "result". */
    view?: "result" | "matte";
  };
  /** Gives the picture a night-vision goggle look: a brightened single-tone image (green by default) with animated grain and a dark circular edge, optionally as two overlapping circles like binoculars. */
  night_vision: {
    /** How much dark areas are brightened, as a multiplier; 1 is neutral, higher lifts shadows more. Range 0..5. Default 1.7802083. */
    gain?: number;
    /** Contrast of the night-vision image around mid-gray, as a multiplier; 1 is neutral. Range 0..3. Default 1.388125. */
    contrast?: number;
    /** How much red is in the night-vision color, from 0 to 1. Range 0..1. Default 0.1. */
    red_tint?: number;
    /** How much green is in the night-vision color, from 0 to 1. Range 0..1. Default 1. */
    green_tint?: number;
    /** How much blue is in the night-vision color, from 0 to 1. Range 0..1. Default 0.15. */
    blue_tint?: number;
    /** Strength of the animated grain, as a fraction of full brightness; 0 is none. Range 0..1. Default 0.096041664. */
    noise?: number;
    /** Radius of the visible circle measured from the center, as a fraction of the clip's height; 0.5 reaches the top and bottom edges. Outside it the picture goes black. Range 0..1. Default 1. */
    circle_size?: number;
    /** Width of the soft fade inside the circle's edge, in the same units as circle_size; higher is a more gradual dark edge. Range 0.001..0.5. Default 0.42151147. */
    circle_softness?: number;
    /** 0 is off (one circle), 1 is on (two overlapping circles side by side, like binoculars); values of 0.5 or more count as on. Range 0..1. Default 0. */
    binocular?: number;
    /** How much of the night-vision look shows over the original picture; 0 shows only the original, 1 only the night-vision look. Range 0..1. Default 1. */
    mix?: number;
  };
  /** Casts a shadow of the picture that points away from a light position, like a long shadow fanning out from a lamp. The shadow sits behind the picture, so it shows where the clip is transparent. */
  radial_shadow: {
    /** Color of the shadow. In glass_edge style it is mixed with the picture's own colors. Default "#000000". */
    color?: Color;
    /** How strong the shadow is, from 0 (invisible) to 1. Range 0..1. Default 0.6. */
    opacity?: number;
    /** Where the light is as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Shadows point away from this spot. Range [0, 0]..[1, 1]. Default [0, 0.25]. */
    light_position?: Vec2;
    /** How far the shadow is pushed away from the light, in pixels of the clip's picture. Range 0..100. Default 16.666668. */
    distance?: number;
    /** How soft the shadow's edges are, in pixels of the clip's picture; 0 is sharp. Range 0..50. Default 14.333333. */
    blur?: number;
    /** regular is a shadow in the flat shadow color; glass_edge tints the shadow with the picture's own colors by picture_color. Default "regular". */
    style?: "regular" | "glass_edge";
    /** In glass_edge style, how much the shadow takes the picture's colors instead of the shadow color, from 0 (shadow color) to 1 (picture colors). Has no effect in regular style. Range 0..1. Default 0.5. */
    picture_color?: number;
    /** When true, shows only the shadow and hides the picture itself. Default false. */
    shadow_only?: boolean;
  };
  /** Breaks the picture up into a grainy dissolve by replacing each pixel with a randomly chosen nearby one. */
  scatter: {
    /** The farthest a pixel can be picked from, in pixels of the clip's picture; 0 leaves the picture unchanged. Range 0..200. Default 25. */
    distance?: number;
    /** Which way pixels are scattered: both, horizontal only, or vertical only. Default "both". */
    direction?: "both" | "horizontal" | "vertical";
    /** When true, the scatter pattern re-randomizes 24 times a second; when false it holds still. Default false. */
    animate?: boolean;
  };
  /** Lights a round spot on the picture and darkens everything outside it, like a stage spotlight. The spot can be brighter than the original and tinted. */
  spotlight: {
    /** Radius of the fully lit spot as a fraction of the clip's height. Range 0.05..1. Default 0.40150002. */
    radius?: number;
    /** Width of the soft fade from the lit spot to the dark area, in the same units as radius; higher is softer. Range 0.01..0.8. Default 0.18643335. */
    feather?: number;
    /** How dark the area outside the spot gets, from 0 (unchanged) to 1 (black). Range 0..1. Default 0.85. */
    darkness?: number;
    /** Center of the spot as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** Color of the light inside the spot; white keeps the picture's own colors. Default "#ffffff". */
    color?: Color;
    /** Brightness inside the spot, as a multiplier; 1 leaves it as the original, higher is brighter. Range 1..4. Default 1.4. */
    intensity?: number;
  };
  /** Keeps one band (or oval) of the picture sharp and blurs the rest, giving a miniature-model look. */
  tilt_shift: {
    /** linear keeps a straight band sharp; radial keeps a wide oval sharp. Default "linear". */
    mode?: "linear" | "radial";
    /** Center of the sharp area as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** Rotation of the sharp band or oval in degrees; 0 gives a horizontal band. Range 0..360. Default 0. */
    angle?: number;
    /** Size of the sharp area across, in percent of the clip's height; 100 is the full height. Range 0..100. Default 26. */
    focus_width?: number;
    /** Width of the gradual change from sharp to blurred, in percent of the clip's height; higher is a smoother transition. Range 0..100. Default 35. */
    feather?: number;
    /** How strong the blur is in the out-of-focus area, in percent; 100 blurs up to about 20 pixels of the clip's picture. Range 0..100. Default 70. */
    blur?: number;
  };
  /** Turns the picture into black and white, with a separate control for how bright each color comes out as gray, then adds a smooth contrast curve to the result. */
  black_white: {
    /** How bright pure reds look in the gray result: 0 is black, 1 is white; higher is lighter. Range -2..3. Default 0.4. */
    reds?: number;
    /** How bright pure yellows look in the gray result: 0 is black, 1 is white; higher is lighter. Range -2..3. Default 0.6. */
    yellows?: number;
    /** How bright pure greens look in the gray result: 0 is black, 1 is white; higher is lighter. Range -2..3. Default 0.4. */
    greens?: number;
    /** How bright pure cyans look in the gray result: 0 is black, 1 is white; higher is lighter. Range -2..3. Default 0.6. */
    cyans?: number;
    /** How bright pure blues look in the gray result: 0 is black, 1 is white; higher is lighter. Range -2..3. Default 0.2. */
    blues?: number;
    /** How bright pure magentas look in the gray result: 0 is black, 1 is white; higher is lighter. Range -2..3. Default 0.8. */
    magentas?: number;
  };
  /** Gives the picture a security-camera look: slightly blurred, drained of color, crossed by dark scan lines and covered with flickering noise. */
  cctv_camera: {
    /** How much of the original color is kept: 0 is gray, 1 is full color. Range 0..1. Default 0. */
    saturation?: number;
    /** How soft the picture is: the blur reaches this many pixels of the clip's picture; 0 is no blur. Range 0..10. Default 1.4270833. */
    blur_size?: number;
    /** Distance between scan lines as a fraction of the clip's size across the line direction; smaller gives more, thinner lines. Range 0.0001..0.05. Default 0.003937. */
    line_spacing?: number;
    /** Direction of the scan lines in degrees: 90 gives horizontal lines, 0 gives vertical lines. Range 0..360. Default 90. */
    line_angle?: number;
    /** Size of each noise speck in pixels of the clip's picture; higher is coarser noise. Range 0.5..20. Default 2.5. */
    noise_size?: number;
    /** How strongly the noise lightens and darkens the picture, as a 0..1 brightness amount; the noise changes every frame. Range 0..1. Default 0.029375. */
    noise_strength?: number;
    /** How much of the camera look shows over the original picture: 0 is none, 1 is all of it. Range 0..1. Default 1. */
    blend?: number;
  };
  /** Turns the picture into hard black and white (or pure red, green and blue per channel) by cutting each pixel at a brightness level. */
  color_threshold: {
    /** Monochrome cuts overall brightness into black and white; rgb cuts the red, green and blue channels separately. Default "rgb". */
    color_mode?: "monochrome" | "rgb";
    /** Brightness cut-off in monochrome mode, 0..1: pixels brighter than this turn white, darker ones black. Ignored in rgb mode. Range 0..1. Default 0.285. */
    level?: number;
    /** Cut-off for the red channel in rgb mode, 0..1: above it red is fully on, below it off. Ignored in monochrome mode. Range 0..1. Default 0.17166667. */
    red_threshold?: number;
    /** Cut-off for the green channel in rgb mode, 0..1: above it green is fully on, below it off. Ignored in monochrome mode. Range 0..1. Default 0.245. */
    green_threshold?: number;
    /** Cut-off for the blue channel in rgb mode, 0..1: above it blue is fully on, below it off. Ignored in monochrome mode. Range 0..1. Default 0.5. */
    blue_threshold?: number;
    /** In rgb mode, true flips the red channel's result. Ignored in monochrome mode. Default false. */
    invert_red?: boolean;
    /** In rgb mode, true flips the green channel's result. Ignored in monochrome mode. Default false. */
    invert_green?: boolean;
    /** In rgb mode, true flips the blue channel's result. Ignored in monochrome mode. Default false. */
    invert_blue?: boolean;
    /** In monochrome mode, true swaps black and white. Ignored in rgb mode. Default false. */
    invert?: boolean;
    /** How soft the cut is, 0..1 of brightness: 0 is a hard edge, higher fades gradually between off and on around each cut-off. Range 0..1. Default 0. */
    smoothness?: number;
    /** How much of the original picture is mixed back in, in percent: 0 shows only the threshold result, 100 shows only the original. Range 0..100. Default 0. */
    mix?: number;
  };
  /** Shifts each pixel sideways and up or down by an amount taken from a color property of the clip's own picture, which warps the picture by its own brightness, color or transparency. */
  displacement_map: {
    /** Which property of the picture drives the horizontal shift. A value of 0.5 shifts nothing; 0 and 1 shift fully in opposite directions. Default "alpha". */
    horizontal_channel?: "red" | "green" | "blue" | "luminance" | "hue" | "saturation" | "alpha";
    /** Largest horizontal shift, in pixels of the clip's picture, reached when the chosen property is at its minimum or maximum; negative values reverse the direction. Range -500..500. Default 338.3333. */
    horizontal_amount?: number;
    /** Which property of the picture drives the vertical shift. A value of 0.5 shifts nothing; 0 and 1 shift fully in opposite directions. Default "hue". */
    vertical_channel?: "red" | "green" | "blue" | "luminance" | "hue" | "saturation" | "alpha";
    /** Largest vertical shift, in pixels of the clip's picture, reached when the chosen property is at its minimum or maximum; negative values reverse the direction. Range -500..500. Default -101.66666. */
    vertical_amount?: number;
    /** When a shift reaches past the clip's edge, true wraps around to the opposite side, false leaves that spot transparent. Default false. */
    wrap_edges?: boolean;
  };
  /** Burns organic, soft-edged holes into the picture that grow from several spots around a center point until the picture is gone, revealing whatever is behind it. */
  film_burn: {
    /** How far the burn has progressed, in percent: 0 leaves the picture untouched, 100 burns it all away. Range 0..100. Default 23.333334. */
    burn?: number;
    /** Where the burn spots cluster, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** Picks the shape and placement of the burn; each value gives a different pattern, and the pattern does not change over time. Range 0..10000. Default 1600. */
    seed?: number;
  };
  /** Draws a grid of lines over the picture, with adjustable cell size, line thickness, softness and color. */
  grid: {
    /** Width of each grid cell, in pixels of the clip's picture. Range 1..500. Default 50. */
    cell_width?: number;
    /** Height of each grid cell, in pixels of the clip's picture. Range 1..500. Default 50. */
    cell_height?: number;
    /** How far the line reaches on each side of a cell edge, in pixels of the clip's picture, so the full line is about twice this; 0 draws no lines. Range 0..50. Default 2. */
    line_thickness?: number;
    /** Width of the soft fade at the line's edge, in pixels of the clip's picture; 0 is a hard edge. Range 0..50. Default 1. */
    feather?: number;
    /** How solid the lines are: 0 is invisible, 1 is fully opaque. Range 0..1. Default 1. */
    opacity?: number;
    /** Horizontal offset of the grid from the clip's center, in pixels of the clip's picture. Range -1000..1000. Default 0. */
    offset_x?: number;
    /** Vertical offset of the grid from the clip's center, in pixels of the clip's picture. Range -1000..1000. Default 0. */
    offset_y?: number;
    /** Color of the grid lines. Default "#ffffff". */
    color?: Color;
    /** True swaps lines and cells: the color fills the cells and the lines show the picture. Default false. */
    invert?: boolean;
  };
  /** Inverts the picture's colors like a photo negative, with a switch for each color channel. */
  invert_color: {
    /** True inverts the red channel. Default true. */
    invert_red?: boolean;
    /** True inverts the green channel. Default true. */
    invert_green?: boolean;
    /** True inverts the blue channel. Default true. */
    invert_blue?: boolean;
    /** How much of the inverted picture shows over the original: 0 is none (original), 1 is fully inverted. Range 0..1. Default 1. */
    blend?: number;
  };
  /** Puts a circular magnifying lens over the picture that enlarges what is inside it. */
  magnify: {
    /** Center of the lens, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** How much the lens enlarges the picture, as a multiplier; 1 is no enlargement. Range 1..10. Default 2.08. */
    magnification?: number;
    /** Size of the lens, as a fraction of the clip's height (1 reaches one full clip height from the center). Range 0.01..1. Default 0.6634. */
    radius?: number;
    /** Width of the soft fade inside the lens rim, as a fraction of the clip's height; 0 is a hard edge. Range 0..0.5. Default 0. */
    feather?: number;
    /** How strongly the lens shows over the original picture: 0 is invisible, 1 is fully magnified. Range 0..1. Default 1. */
    opacity?: number;
  };
  /** Bends the picture as a wide-angle lens would, bulging it outward from a center point, or with reverse on, flattening a bulged lens look. */
  optics_compensation: {
    /** Lens field of view in degrees; higher bends the picture more and 0 does nothing. Range 0..180. Default 97.8. */
    field_of_view?: number;
    /** False bulges the picture outward; true does the opposite, pulling in a bulged lens look to straighten it. Default false. */
    reverse?: boolean;
    /** Center of the bend, as [x, y] from 0 to 1 across the clip; [0.5, 0.5] is the center. Range [0, 0]..[1, 1]. Default [0, 0.4]. */
    center?: Vec2;
    /** When the bend pulls in area from outside the clip, true fills it with stretched edge pixels and false leaves it transparent. Default false. */
    stretch_edges?: boolean;
  };
  /** Repeats the picture as a grid of tiles, with options to mirror, flip, checker or offset the tiles, and to extend the tiled area past the clip's edges. */
  repetile: {
    /** How the tiles are arranged. Unfold and mirror options flip alternate tiles; checker_* looks the same as the matching unfold_*; brick offsets every other row (or column) by half a tile, and plain brick is the same as brick_horizontal; mirror_* keeps the first tile as is and flips the rest; flip_* flips every tile. Default "repeat". */
    tiling_mode?: "repeat" | "unfold_horizontal" | "unfold_vertical" | "unfold_both" | "checker_horizontal" | "checker_vertical" | "checker_both" | "brick_horizontal" | "brick_vertical" | "mirror_horizontal" | "mirror_vertical" | "mirror_both" | "flip_horizontal" | "flip_vertical" | "flip_both" | "brick";
    /** How far the tiled area reaches past the left edge, in units where the picture at view scale 1 is 1470 wide and 630 tall. Range 0..2000. Default 0. */
    expand_left?: number;
    /** How far the tiled area reaches past the right edge, in units where the picture at view scale 1 is 1470 wide and 630 tall. Range 0..2000. Default 0. */
    expand_right?: number;
    /** How far the tiled area reaches past the top edge, in units where the picture at view scale 1 is 1470 wide and 630 tall. Range 0..2000. Default 0. */
    expand_up?: number;
    /** How far the tiled area reaches past the bottom edge, in units where the picture at view scale 1 is 1470 wide and 630 tall. Range 0..2000. Default 0. */
    expand_down?: number;
    /** How much of the tiled area the clip shows: 1 shows exactly one tile, higher zooms out to show more tiles, lower zooms in. Areas outside the tiled area are transparent. Range 0.1..20. Default 9.175229. */
    view_scale?: number;
  };
  /** Keeps one color range and turns everything else gray. */
  selective_color: {
    /** The color to keep, as a position around the color wheel from 0 to 1: 0 is red, about 0.33 green, about 0.67 blue, and 1 wraps back to red. Range 0..1. Default 0.33. */
    hue?: number;
    /** How wide a range of colors around the chosen hue is kept, as a fraction of the color wheel; higher keeps more colors. Very pale colors turn gray regardless. Range 0.01..0.5. Default 0.5. */
    tolerance?: number;
  };
  /** Flashes the picture on a repeating schedule, tinting it with a color or making it transparent during each flash. */
  strobe_light: {
    /** Color used for the flash, combined with the picture by the chosen operator. Default "#ffffff". */
    color?: Color;
    /** How much of the original picture is kept during a flash, in percent: 0 shows only the flash result, 100 shows the original. Only used when mode is color_only. Range 0..100. Default 0. */
    mix?: number;
    /** How long each flash lasts, in seconds, at the start of every period; a duration at or above the period keeps the flash on all the time. Range 0..60. Default 0.8. */
    duration?: number;
    /** Time between the starts of flashes, in seconds. Range 0.001..60. Default 1.2009801. */
    period?: number;
    /** Chance in percent that each period flashes. 0 turns randomness off, so every period flashes; higher values skip some periods at random. Range 0..100. Default 0. */
    random_chance?: number;
    /** color_only changes the picture's colors during a flash; transparent makes the picture disappear during a flash. Default "color_only". */
    mode?: "color_only" | "transparent";
    /** How the flash color combines with the picture's colors in color_only mode: copy replaces them, the others add, screen, multiply, take the difference of, or keep the lighter or darker of the two. Default "multiply". */
    operator?: "copy" | "add" | "screen" | "multiply" | "difference" | "lighten" | "darken";
    /** Picks which periods flash when random_chance is above 0; different values give different patterns. Has no effect when random_chance is 0. Range 0..10000. Default 0. */
    seed?: number;
  };
  /** Makes the picture ripple and warp like heat haze or water, with the distortion constantly moving. */
  turbulent_displacement: {
    /** How far the picture is pushed around, as a fraction of the clip's size; higher is stronger warping. Range 0..0.5. Default 0.45666668. */
    amount?: number;
    /** Size of the ripples: higher gives more, smaller ripples; lower gives fewer, larger ones. Range 0.5..20. Default 4.1400003. */
    scale?: number;
    /** How fast the ripples move, as a multiplier of time; 0 freezes them. Range 0..10. Default 6. */
    speed?: number;
    /** Which edges are held still so the picture does not pull away from the frame: none pins nothing, pin_all keeps every edge in place, pin_left_right keeps the left and right edges in place, pin_top_bottom keeps the top and bottom edges in place. Default "pin_all". */
    pinning?: "none" | "pin_all" | "pin_left_right" | "pin_top_bottom";
  };
  /** Mirrors the clip left to right inside its own frame, like a mirror image. Position, scale and rotation are not changed. */
  horizontal_flip: {
  };
  /** Mirrors the clip top to bottom inside its own frame, so it is upside down and mirrored. Position, scale and rotation are not changed. */
  vertical_flip: {
  };
}

/**
 * Built-in transitions and their parameters (all optional). `easing`
 * shapes the motion of the transition itself.
 */
interface TransitionParams {
  /** The next clip flips over in 3D from one side and lands on top of the current one. */
  back_flip: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Depth of the 3D look; 0 is flat. Range 0..1. Default 0.3. */
    perspective?: number | ParamKeys;
  };
  /** The picture bulges or pinches like a fisheye lens while it crossfades to the next clip. */
  barrel: {
    /** zoom_in: the current clip bulges and the next starts pinched; zoom_out the reverse; mix_in_out and mix_out_in bulge or pinch both. Default "zoom_in". */
    mode?: "zoom_in" | "zoom_out" | "mix_in_out" | "mix_out_in";
    /** Strength of the bulge or pinch. Range 1..10. Default 4. */
    amount?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip shrinks and slides away while the next one slides in, zooming down from close up. */
  big_reveal: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The picture flickers between the two clips and settles on the next one. */
  blink: {
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The picture breaks into rectangular blocks that slide away to show the next clip. */
  block_displacement: {
    /** Way the blocks fly off. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How far the blocks travel. Range 0..2. Default 0.5. */
    displacement?: number | ParamKeys;
    /** How many blocks; higher makes more, smaller blocks. Range 0..2. Default 1. */
    scale?: number | ParamKeys;
    /** Color trail behind the moving blocks. Range 0..1. Default 0.1. */
    rgb_delay?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Both clips blur to a peak in the middle while they crossfade. */
  blur: {
    /** Blur across and down, as [x, y]; unequal values blur more one way. Range [0, 0]..[10, 10]. Default [2, 2]. */
    stretch?: Vec2;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The next clip slides in enlarged over the current one, then settles back to its normal size. */
  slide_settle: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** Extra size the next clip starts at; 1 is twice its size. Range 0.1..5. Default 1. */
    zoom?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The next clip slides in with a springy bounce. */
  bounce_back: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
  };
  /** A zoom blur sweeps across the frame while the clips crossfade. */
  cross_zoom: {
    /** Length of the zoom blur at the peak. Range 0..1. Default 0.5. */
    strength?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip zooms in and blurs as the next one zooms down into place. */
  cross_zoom_blur: {
    /** Blur across and down, as [x, y]. Range [0, 0]..[10, 10]. Default [2, 2]. */
    stretch?: Vec2;
    /** Extra zoom at the peak; 1 is twice the size. Range 0..3. Default 1. */
    zoom?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The two clips turn like neighboring faces of a cube. */
  cube_3d_rotation: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Depth of the 3D look; 0 is flat. Range 0..1. Default 0.3. */
    perspective?: number | ParamKeys;
  };
  /** The next clip pushes the current one out in stop-start steps. */
  step_push: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How many stop-start steps the motion takes. Range 2..10. Default 5. */
    steps?: number;
    /** How stepped the motion is; 0 is smooth and 1 fully stop-start. Range 0..1. Default 0.9. */
    stickiness?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip shrinks as it is pushed out and the next one grows into place. */
  curtain_call: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The frame splits in half and the halves slide apart to show the next clip. */
  split: {
    /** vertical slides the left and right halves up and down; horizontal slides the top and bottom halves sideways; both does both. Default "vertical". */
    mode?: "vertical" | "horizontal" | "both";
    /** How much the picture shrinks as it splits. Range 0..2. Default 0.2. */
    scale?: number | ParamKeys;
    /** How sharply the picture shrinks. Range 0..1. Default 0.5. */
    scale_speed?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Reverse the way the halves slide. Default false. */
    reverse?: boolean;
  };
  /** A digital glitch of noise blocks and dots that switches to the next clip at its peak. */
  dot_glitch: {
    /** Size of the noise blocks, as [x, y]. Range [0.1, 0.1]..[10, 10]. Default [1, 1]. */
    scale?: Vec2;
    /** Spacing of the dots, in pixels. Range 1..32. Default 8. */
    dot_grid?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip dissolves into a grid of halftone dots that resolves into the next one. */
  dots: {
    /** Size of each dot cell at the peak, in pixels. Range 0..50. Default 17. */
    size?: number | ParamKeys;
    /** Dot size within its cell; 0.5 makes touching circles, higher looks square. Range 0..1. Default 0.45. */
    shape?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A plain crossfade; at the start or end of a clip, a fade from or to nothing. */
  fade: {
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The frame scrolls quickly through a strip of frames, like a film reel, and lands on the next clip. */
  film_roll_in: {
    /** Direction the frames scroll. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "quadratic_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A flash of color hides the change to the next clip. */
  flash: {
    /** Color of the flash. Default "#ffffff". */
    color?: Color;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The whole frame flips over like a card, with the next clip on the back. */
  flip: {
    /** Way the frame flips: left or right turns it around an upright axis, up or down around a level one. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Depth of the 3D look; 0 is flat. Range 0..1. Default 0.3. */
    perspective?: number | ParamKeys;
  };
  /** A glow of colored light with dust and soft light spots washes over a crossfade. */
  light_leak: {
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Colors of the light. Default "warm". */
    palette?: "warm" | "red_blue" | "pink_green";
    /** Strength of the light. Range 0..1. Default 1. */
    opacity?: number | ParamKeys;
    /** How fast the light moves. Range 0..3. Default 1. */
    speed?: number | ParamKeys;
    /** Size of the light pattern, as [x, y]. Range [0.1, 0.1]..[10, 10]. Default [1, 1]. */
    scale?: Vec2;
    /** Strength of the dust specks. Range 0..1. Default 0.3. */
    dust_opacity?: number | ParamKeys;
    /** Strength of the soft light spots. Range 0..1. Default 0.2. */
    bokeh_opacity?: number | ParamKeys;
    /** Number of soft light spots. Range 1..64. Default 12. */
    bokeh_count?: number;
    /** Size of the soft light spots. Range 0..1. Default 0.1. */
    bokeh_size?: number | ParamKeys;
    /** Number of sides on each light spot. Range 4..11. Default 9. */
    bokeh_blades?: number;
    /** Turn of the light spots, in degrees. Range 0..360. Default 10. */
    bokeh_angle?: number | ParamKeys;
  };
  /** Drifting, out-of-focus spots of light pass over a crossfade. */
  light_leak_bokeh: {
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Colors of the light. Default "warm". */
    palette?: "warm" | "red_blue" | "pink_green";
    /** Strength of the light. Range 0..1. Default 0.7. */
    opacity?: number | ParamKeys;
    /** How fast the light moves. Range 0..3. Default 1. */
    speed?: number | ParamKeys;
    /** Number of soft light spots. Range 1..64. Default 16. */
    bokeh_count?: number;
    /** Size of the soft light spots. Range 0..2. Default 0.7. */
    bokeh_size?: number | ParamKeys;
    /** Number of sides on each light spot. Range 4..11. Default 9. */
    bokeh_blades?: number;
    /** Turn of the light spots, in degrees. Range 0..360. Default 20. */
    bokeh_angle?: number | ParamKeys;
  };
  /** A flickering burst of colored light covers the middle of a crossfade. */
  light_leak_flicker: {
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Colors of the light. Default "warm". */
    palette?: "warm" | "red_blue" | "pink_green";
    /** Strength of the light. Range 0..1. Default 0.7. */
    opacity?: number | ParamKeys;
    /** How fast the light moves. Range 0..3. Default 1. */
    speed?: number | ParamKeys;
    /** Size of the light pattern, as [x, y]. Range [0.1, 0.1]..[10, 10]. Default [1, 1]. */
    scale?: Vec2;
    /** How fast the light flickers. Range 0..2. Default 1. */
    flicker_speed?: number | ParamKeys;
    /** Seconds the flicker lasts, centered in the transition. Range 0..3. Default 0.5. */
    flicker_duration?: number | ParamKeys;
  };
  /** Both clips smear along one direction as a band of light flows across. */
  light_leak_flow: {
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Colors of the light. Default "warm". */
    palette?: "warm" | "red_blue" | "pink_green";
    /** Direction the light flows, in degrees. Range 0..360. Default 30. */
    angle?: number | ParamKeys;
    /** Strength of the light. Range 0..1. Default 0.8. */
    opacity?: number | ParamKeys;
    /** How fast the light moves. Range 0..3. Default 1. */
    speed?: number | ParamKeys;
    /** Size of the light pattern, as [x, y]. Range [0.1, 0.1]..[10, 10]. Default [1, 1]. */
    scale?: Vec2;
    /** Pick a number for a different light pattern. Range 0..100. Default 0. */
    seed?: number | ParamKeys;
  };
  /** The color channels wave apart while the clips crossfade. */
  glitch: {
    /** How far the colors wave apart. Range 0..1. Default 0.5. */
    intensity?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The picture breaks into noisy, washed-out fragments that resolve into the next clip. */
  glitch_displace: {
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Strips of the picture slide out of place with a color split while the clips crossfade. */
  glitch_slide: {
    /** up or down shifts columns up and down; left or right shifts rows sideways. Default "up". */
    direction?: "right" | "up" | "left" | "down";
    /** How many strips; higher makes more, thinner strips. Range 0..2. Default 1. */
    scale?: number | ParamKeys;
    /** Color split on the strips. Range 0..10. Default 1. */
    rgb_shift?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Both clips break into large pixel blocks at the middle while they crossfade. */
  granularity: {
    /** Size of the pixel blocks at the peak, in pixels. Range 0..300. Default 50. */
    size?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The next clip swings into place around a corner, like a door on a hinge. */
  hinge: {
    /** Corner the next clip swings in around. Default "right_down". */
    direction?: "right_down" | "left_down" | "right_up" | "left_up";
    /** Share of the end over which the current clip fades away. Range 0..1. Default 0.03. */
    fade_out?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "bounce_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A round opening grows from the center as one clip zooms through it into the other. */
  hole: {
    /** zoom_in: the current clip zooms away through the opening; zoom_out: the next clip shrinks into place as it closes. Default "zoom_in". */
    zoom?: "zoom_in" | "zoom_out";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The next clip snaps in close up, then punches back out to its normal size in steps. */
  impact: {
    /** Extra size the next clip starts at; 1 is twice its size. Range 0..5. Default 1. */
    zoom?: number | ParamKeys;
    /** How many stop-start steps the motion takes. Range 1..10. Default 5. */
    steps?: number;
    /** How stepped the motion is; 0 is smooth and 1 fully stop-start. Range 0..1. Default 0.9. */
    stickiness?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The picture bulges like a lens with color fringing, then settles into the next clip. */
  lens_distortion: {
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A lens flare sweeps over a soft crossfade. */
  lens_flare: {
    /** Brightness of the flare. Range 0..10. Default 5. */
    intensity?: number | ParamKeys;
    /** Where the flare sits, as [x, y] from 0 to 1 across the frame. Range [0, 0]..[1, 1]. Default [0.9, 0.4]. */
    position?: Vec2;
    /** How far the flare sweeps around the center during the transition. Range -1..1. Default 0.1. */
    orbit?: number | ParamKeys;
    /** Blur across and down, as [x, y]. Range [0, 0]..[3, 3]. Default [1, 1]. */
    stretch?: Vec2;
    /** How the motion speeds up and slows down. Default "linear". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip shrinks into mirrored tiles while the next one grows out of them. */
  mirror_zoom: {
    /** How far out the mirror edge is pushed. Range 0..1. Default 0.5. */
    amount?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip zooms in while it pixelates, and the next one sharpens into place. */
  pixelate_zoom: {
    /** Largest pixel block at the peak, as a fraction of the frame height. Range 0..1. Default 0.1. */
    amount?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A zoom blur toward the center while the clips crossfade. */
  radial_blur: {
    /** Length of the zoom blur. Range 0..10. Default 1. */
    amount?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Frames scroll past quickly, snap back and land on the next clip, like a rewind. */
  rewind: {
    /** Direction the frames scroll. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The frame rolls past repeated copies of itself and lands on the next clip. */
  roll: {
    /** Direction the frames scroll. Default "up". */
    direction?: "right" | "up" | "left" | "down";
    /** repeat tiles the picture as it scrolls; mirror flips every other copy. Default "mirror". */
    wrap?: "repeat" | "mirror";
    /** How many extra frames it scrolls past; 1 is sixteen. Range 0..1. Default 0.5. */
    amount?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Like roll, with the frame bulging like a cylinder and, if set, turning as it rolls. */
  roll_3d: {
    /** Direction the frames scroll. Default "up". */
    direction?: "right" | "up" | "left" | "down";
    /** repeat tiles the picture as it scrolls; mirror flips every other copy. Default "repeat". */
    wrap?: "repeat" | "mirror";
    /** How many extra frames it scrolls past; 1 is sixteen. Range 0..1. Default 0.5. */
    amount?: number | ParamKeys;
    /** How much the frame bulges as it rolls. Range 0..2. Default 1. */
    curve?: number | ParamKeys;
    /** Turn while rolling; 1 is a quarter turn. Range -1..1. Default 0. */
    roll?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip spins away with motion blur as the next one spins in. */
  rotation: {
    /** Which way it turns. Default "clockwise". */
    direction?: "clockwise" | "counter_clockwise";
    /** How far each clip turns, in degrees. Range 0..360. Default 180. */
    rotation?: number | ParamKeys;
    /** Spin blur. Range 0..1. Default 0.5. */
    blur?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip spins and zooms away while the next one spins in from small. */
  rotation_zoom: {
    /** Which way it turns. Default "clockwise". */
    direction?: "clockwise" | "counter_clockwise";
    /** How far it turns; 1 is a full turn. Range 0..1. Default 0.5. */
    amount?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A hard-edged wipe shows the next clip in stop-start steps. */
  step_wipe: {
    /** Side the wipe starts from; center_horizontal and center_vertical grow a band from the middle. Default "right". */
    direction?: "right" | "up" | "left" | "down" | "center_horizontal" | "center_vertical";
    /** How many stop-start steps the motion takes. Range 2..10. Default 5. */
    steps?: number;
    /** How stepped the motion is; 0 is smooth and 1 fully stop-start. Range 0..1. Default 0.9. */
    stickiness?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A camera shake around the change, hidden by a flash of color. */
  shake_flash: {
    /** Color of the flash. Default "#ffffff". */
    flash_color?: Color;
    /** How short and sharp the flash is. Range 0.5..5. Default 1. */
    flash_speed?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Largest shake, as [x, y] in pixels. Range [0, 0]..[1000, 1000]. Default [200, 200]. */
    shake_position?: Vec2;
    /** Largest tilt while it shakes, in degrees. Range 0..180. Default 20. */
    shake_angle?: number | ParamKeys;
    /** How fast it shakes. Range 0.1..10. Default 1. */
    shake_speed?: number | ParamKeys;
    /** Pick a number for a different shake pattern. Range 0..100. Default 0. */
    shake_seed?: number | ParamKeys;
    /** Color split while it shakes; negative reverses it. Range -1..1. Default 0.5. */
    rgb_shift?: number | ParamKeys;
  };
  /** The next clip pushes in with a camera shake and a color split. */
  shake_slide: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Largest shake, as [x, y] in pixels. Range [0, 0]..[1000, 1000]. Default [100, 100]. */
    shake_position?: Vec2;
    /** Largest tilt while it shakes, in degrees. Range 0..180. Default 10. */
    shake_angle?: number | ParamKeys;
    /** How fast it shakes. Range 0..30. Default 1. */
    shake_speed?: number | ParamKeys;
    /** Pick a number for a different shake pattern. Range 0..100. Default 0. */
    shake_seed?: number | ParamKeys;
    /** Color split while it shakes; negative reverses it. Range -1..1. Default 0.5. */
    rgb_shift?: number | ParamKeys;
  };
  /** A zoom between the clips with a camera shake and a color split. */
  shake_zoom: {
    /** How each clip zooms, outgoing first: in grows it, out shrinks it, none keeps it still. Default "zoom_in". */
    direction?: "zoom_in" | "zoom_out" | "in_out" | "out_in" | "none_in" | "none_out" | "in_none" | "out_none";
    /** What shows past the edge of the frame. Default "none". */
    wrap?: "none" | "repeat" | "mirror";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
    /** Largest shake, as [x, y] in pixels. Range [0, 0]..[1000, 1000]. Default [100, 100]. */
    shake_position?: Vec2;
    /** Largest tilt while it shakes, in degrees. Range 0..180. Default 10. */
    shake_angle?: number | ParamKeys;
    /** How fast it shakes. Range 0..30. Default 1. */
    shake_speed?: number | ParamKeys;
    /** Pick a number for a different shake pattern. Range 0..100. Default 0. */
    shake_seed?: number | ParamKeys;
    /** Color split while it shakes; negative reverses it. Range -1..1. Default 0.5. */
    rgb_shift?: number | ParamKeys;
  };
  /** The next clip pushes the current one out of the frame. */
  slide: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The clips slide with motion blur along a straight or curved path. */
  slide_blur: {
    /** Side the next clip comes in from. Default "up". */
    direction?: "up" | "down" | "left" | "right" | "up_left" | "up_right" | "down_left" | "down_right";
    /** Length of the motion blur. Range 0..1. Default 0.5. */
    stretch?: number | ParamKeys;
    /** Sideways arc of the path. Range -1..1. Default 0.2. */
    curve?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip squeezes toward one edge as the next one expands from the other. */
  slide_cube: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The clips slide past each other while they crossfade. */
  slide_fade: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The clips slide with a heavy stretch and blur along the motion. */
  slide_stretch: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The clips slide with motion blur, the leading edge bending as it moves. */
  slide_warp: {
    /** Side the next clip comes in from. Default "up". */
    direction?: "up" | "down" | "left" | "right" | "up_left" | "up_right" | "down_left" | "down_right";
    /** Length of the motion blur. Range 0..1. Default 0.5. */
    stretch?: number | ParamKeys;
    /** How much the leading edge bends. Range 0..1. Default 0.5. */
    warp?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The edge of the picture smears across the frame, then unsmears into the next clip. */
  slit_scan: {
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The next clip slides in over the current one, which stays still. */
  stack: {
    /** Side the next clip comes in from. Default "right". */
    direction?: "right" | "up" | "left" | "down";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The picture gives way by brightness, through a solid color, to the next clip. */
  threshold: {
    /** from_light: dark areas give way first; from_dark: light areas give way first. Default "from_light". */
    mode?: "from_light" | "from_dark";
    /** Color the picture turns as it gives way. Default "#0000ff". */
    color?: Color;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The picture swirls around the center while the clips crossfade. */
  twirl: {
    /** Which way it turns. Default "clockwise". */
    direction?: "clockwise" | "counter_clockwise";
    /** Strength of the swirl. Range 0..1. Default 0.5. */
    amount?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Sideways ripples run through the picture while the clips crossfade. */
  wave: {
    /** How far the ripples push the picture. Range 0..10. Default 1. */
    amount?: number | ParamKeys;
    /** How tight the ripples are. Range 0..2. Default 0.5. */
    wave_size?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** A hard edge wipes across the frame to show the next clip. */
  wipe: {
    /** Side the wipe starts from; x_axis and y_axis open out from the center line. Default "right". */
    direction?: "right" | "up" | "left" | "down" | "x_axis" | "y_axis";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The frame zooms in and spins with blur, changes to the next clip and unwinds. */
  wiper: {
    /** Turn at the peak, in degrees. Range -180..180. Default 60. */
    angle?: number | ParamKeys;
    /** How far it zooms in at the peak. Range 1..3. Default 2. */
    scale?: number | ParamKeys;
    /** Blur at the peak, in pixels. Range 0..100. Default 30. */
    blur?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** Strips of the picture wobble out of place with blur and color blocks while the clips crossfade. */
  wobble_slide: {
    /** up or down shifts columns up and down; left or right shifts rows sideways. Default "up". */
    direction?: "right" | "up" | "left" | "down";
    /** How many strips; higher makes more, thinner strips. Range 0..2. Default 1. */
    scale?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** One clip zooms in or out of the other, with a fade. */
  zoom: {
    /** How each clip zooms, outgoing first: in grows it, out shrinks it, none keeps it still. Default "zoom_in". */
    direction?: "zoom_in" | "zoom_out" | "in_out" | "out_in" | "none_in" | "none_out" | "in_none" | "out_none";
    /** What shows past the edge of the frame. Default "none". */
    wrap?: "none" | "repeat" | "mirror";
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
  /** The current clip zooms away with a twirl and a color split as the next one grows into place. */
  zoom_twirl_rgb: {
    /** Which way it turns. Default "clockwise". */
    direction?: "clockwise" | "counter_clockwise";
    /** Strength of the swirl. Range 0..1. Default 0.5. */
    amount?: number | ParamKeys;
    /** Color split. Range 0..1. Default 0.5. */
    dispersion?: number | ParamKeys;
    /** How the motion speeds up and slows down. Default "exponential_in_out". */
    easing?: "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out" | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out" | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out" | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out" | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";
  };
}

type EffectName = keyof EffectParams;
/**
 * Effects the engine (and the timeline agent's ops) name another way:
 * engine name to public name. addEffect takes either; reads and receipts
 * say the public name.
 */
interface EffectEngineNames {
  beat_rock: "chroma_pulse";
  duotone: "tint";
  dynamic_zoom: "pan_zoom";
  dynamic_anchor_zoom: "anchor_zoom";
  edge_roundness: "round_corners";
  fast_chroma_key: "chroma_key";
  zoom_out: "tile";
}
type EffectEngineName = keyof EffectEngineNames;
type TransitionName = keyof TransitionParams;
/**
 * A transition in the bin by its handle (edit.bin.transitions()): "ef1"
 * when the copilot added it from a library item, else "fx2". Pass it to
 * tl.addTransition where a TransitionName goes.
 */
type BinTransitionHandle = `ef${number}` | `fx${number}`;

/**
 * Audio effects and their parameters (all optional; unset ones keep the
 * default shown). They go on sounds: an audio clip, a video's `clip.audio`,
 * an audio track, a bus or the main output. One value each (not animated).
 */
interface AudioEffectParams {
  /** Eight-band parametric EQ. */
  eq: {
    /** Band 1 filter shape (12 dB/oct unless the name says otherwise). Default "high_pass". */
    band1_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 1 frequency, Hz. Range 20..20000. Default 20. */
    band1_freq?: number;
    /** Band 1 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band1_gain?: number;
    /** Band 1 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band1_q?: number;
    /** Band 1 switched off. Default true. */
    band1_bypass?: boolean;
    /** Band 2 filter shape (12 dB/oct unless the name says otherwise). Default "low_shelf". */
    band2_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 2 frequency, Hz. Range 20..20000. Default 75. */
    band2_freq?: number;
    /** Band 2 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band2_gain?: number;
    /** Band 2 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band2_q?: number;
    /** Band 2 switched off. Default false. */
    band2_bypass?: boolean;
    /** Band 3 filter shape (12 dB/oct unless the name says otherwise). Default "bell". */
    band3_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 3 frequency, Hz. Range 20..20000. Default 100. */
    band3_freq?: number;
    /** Band 3 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band3_gain?: number;
    /** Band 3 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band3_q?: number;
    /** Band 3 switched off. Default false. */
    band3_bypass?: boolean;
    /** Band 4 filter shape (12 dB/oct unless the name says otherwise). Default "bell". */
    band4_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 4 frequency, Hz. Range 20..20000. Default 250. */
    band4_freq?: number;
    /** Band 4 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band4_gain?: number;
    /** Band 4 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band4_q?: number;
    /** Band 4 switched off. Default false. */
    band4_bypass?: boolean;
    /** Band 5 filter shape (12 dB/oct unless the name says otherwise). Default "bell". */
    band5_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 5 frequency, Hz. Range 20..20000. Default 1040. */
    band5_freq?: number;
    /** Band 5 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band5_gain?: number;
    /** Band 5 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band5_q?: number;
    /** Band 5 switched off. Default false. */
    band5_bypass?: boolean;
    /** Band 6 filter shape (12 dB/oct unless the name says otherwise). Default "bell". */
    band6_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 6 frequency, Hz. Range 20..20000. Default 2500. */
    band6_freq?: number;
    /** Band 6 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band6_gain?: number;
    /** Band 6 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band6_q?: number;
    /** Band 6 switched off. Default false. */
    band6_bypass?: boolean;
    /** Band 7 filter shape (12 dB/oct unless the name says otherwise). Default "high_shelf". */
    band7_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 7 frequency, Hz. Range 20..20000. Default 7500. */
    band7_freq?: number;
    /** Band 7 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band7_gain?: number;
    /** Band 7 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band7_q?: number;
    /** Band 7 switched off. Default false. */
    band7_bypass?: boolean;
    /** Band 8 filter shape (12 dB/oct unless the name says otherwise). Default "low_pass". */
    band8_type?: "low_pass" | "low_pass_6" | "low_pass_18" | "low_pass_24" | "high_pass" | "high_pass_6" | "high_pass_18" | "high_pass_24" | "band_pass" | "low_shelf" | "high_shelf" | "bell" | "notch";
    /** Band 8 frequency, Hz. Range 20..20000. Default 20000. */
    band8_freq?: number;
    /** Band 8 boost or cut, dB (bell and shelf shapes). Range -48..48. Default 0. */
    band8_gain?: number;
    /** Band 8 width (Q); higher is narrower. Range 0.1..10. Default 0.707. */
    band8_q?: number;
    /** Band 8 switched off. Default true. */
    band8_bypass?: boolean;
  };
  /** Compressor: evens out loud and quiet passages. */
  compressor: {
    /** Level where compression starts, dB. Range -60..0. Default -18. */
    threshold?: number;
    /** Compression ratio (x:1). Range 1..20. Default 2.5. */
    ratio?: number;
    /** Softness of the threshold, dB. Range 0..24. Default 6. */
    knee?: number;
    /** How fast it clamps down, ms. Range 0.05..200. Default 10. */
    attack?: number;
    /** How fast it lets go, ms. Range 1..2000. Default 80. */
    release?: number;
    /** Most it will reduce, dB. Range 0..40. Default 12. */
    range?: number;
    /** Gain added after compression, dB. Range -12..24. Default 0. */
    makeup?: number;
    /** Wet/dry mix, %. Range 0..100. Default 100. */
    mix?: number;
    /** High-pass on the detector, Hz (ignores bass). Range 0..500. Default 90. */
    sidechain_hpf?: number;
    /** Key from the timeline's sidechain track (track.set({ sidechain: true })) instead of its own input. Default false. */
    external_sidechain?: boolean;
    /** How much the channels share one gain, %. Range 0..100. Default 100. */
    stereo_link?: number;
    /** Detector averaging window, ms. Range 0.1..400. Default 5. */
    rms_window?: number;
    /** Add makeup gain automatically. Default true. */
    auto_makeup?: boolean;
  };
  /** Brickwall limiter: nothing passes the ceiling. */
  limiter: {
    /** Highest output level, dBTP. Range -6..0. Default -1. */
    ceiling?: number;
    /** Gain into the limiter, dB. Range -12..24. Default 0. */
    gain?: number;
    /** Recovery time, ms. Range 10..1000. Default 168. */
    release?: number;
  };
  /** Ducker: lowers this sound while the timeline's sidechain track (track.set({ sidechain: true })) plays, e.g. music under a voice. */
  ducker: {
    /** How far it ducks, dB. Range 0..24. Default 8. */
    reduction?: number;
    /** How fast it ducks, ms. Range 1..2000. Default 100. */
    attack?: number;
    /** How long it stays down after the key stops, ms. Range 0..2000. Default 300. */
    hold?: number;
    /** How fast it comes back, ms. Range 10..5000. Default 1000. */
    release?: number;
  };
  /** De-esser: tames harsh s and sh sounds in voice. */
  de_esser: {
    /** Level where it starts, dB. Range -80..0. Default -30. */
    threshold?: number;
    /** Reduction ratio (x:1). Range 1..20. Default 4. */
    ratio?: number;
    /** Softness of the threshold, dB. Range 0..24. Default 6. */
    knee?: number;
    /** Most it will reduce, dB. Range 0..24. Default 6. */
    max_reduction?: number;
    /** ms. Range 0.1..20. Default 0.5. */
    attack?: number;
    /** ms. Range 0..200. Default 15. */
    hold?: number;
    /** ms. Range 1..500. Default 40. */
    release?: number;
    /** Where the sibilance is, Hz. Range 2000..16000. Default 6000. */
    frequency?: number;
    /** Both channels reduce together. Default true. */
    stereo_link?: boolean;
  };
  /** Reverb: one effect with three modes. On a send bus it opens 100% wet. */
  reverb: {
    /** Room character: modern, warm_hall or plate. Writing it also sets the fallback older clients play. Default "modern". */
    mode?: "modern" | "warm_hall" | "plate";
    /** How much reverb, 0..100: sets the room, tail, tone and mix for the mode. On a send bus it leaves mix at 100%. A read leaves it out when the settings are custom (not made by Amount). Range 0..100. */
    amount?: number;
    /** Room size, 0..1 (ignored by warm_hall and plate). Range 0..1. Default 0.57. */
    size?: number;
    /** How long the tail rings, seconds. Range 0.1..10. Default 1.1585084. */
    decay?: number;
    /** Delay before the reverb starts, ms. Range 0..200. Default 20. */
    predelay?: number;
    /** Tone of the tail: 1 is flat, lower is darker. Range 0..1. Default 0.65. */
    brightness?: number;
    /** Close to far, 0..1 (ignored by plate). Range 0..1. Default 0.7. */
    distance?: number;
    /** Stereo width: 0 is mono. Range 0..1. Default 1. */
    width?: number;
    /** Wet/dry mix, 0..1. Range 0..1. Default 0.15. */
    mix?: number;
  };
  /** Pitch shift without changing speed. */
  pitch_shift: {
    /** Shift in semitones. Range -12..12. Default 0. */
    semitones?: number;
    /** Fine shift in cents. Range -100..100. Default 0. */
    cents?: number;
  };
  /** Voice EQ: rumble cut, clarity and warmth for dialogue. */
  voice_eq: {
    /** Low-frequency rumble cut, %. Range 0..100. Default 64.938324. */
    reduce_rumble?: number;
    /** Presence lift, %. Range 0..100. Default 50. */
    clarity?: number;
    /** Low-mid warmth (negative thins), %. Range -100..100. Default 0. */
    warmth?: number;
  };
  /** Removes clicks and pops. */
  declick: {
    /** How eagerly it detects clicks, %. Range 0..100. Default 50. */
    sensitivity?: number;
  };
  /** Voice leveler: evens out a voice that gets louder or quieter over time. Needs the clip's loudness analysis from the host. */
  voice_leveler: {
    /** How much of the curve is applied, 0 to 1. Range 0..1. Default 1. */
    amount?: number;
  };
}
type AudioEffectName = keyof AudioEffectParams;
/** Audio effects the editor no longer offers: an effect already on the edit reads as one of these, but `addEffect` refuses them. */
type LegacyAudioEffectName = 
  | "verb_one"
  | "plate_reverb";

/**
 * Components of a 3D camera clip (clip.addComponent) and their parameters
 * (all optional; unset ones keep the default shown). Number params also take
 * keyframes (ParamKeys, clip-local `at`). A camera takes one of each; they run
 * in a fixed order by type (fisheye, fog, lens_distortion,
 * chromatic_aberration), whatever order they were added in.
 */
interface CameraComponentParams {
  /** Tints the 3D scene toward a color by its distance from the camera. */
  fog: {
    /** Color the scene fades to. Default "#808080". */
    color?: Color;
    /** How the fog thickens with distance: linear from start to end, or exponential by density. Default "linear". */
    falloff?: "linear" | "exponential" | "exponential_squared";
    /** Distance from the camera where the fog begins, px (the units of a 3D clip's z). Range 0..20000. Default 0. */
    start?: number | ParamKeys;
    /** Distance where linear fog is full, px. Range 0..20000. Default 4000. */
    end?: number | ParamKeys;
    /** Thickness of exponential fog; higher fogs nearer. Range 0..1. Default 0.5. */
    density?: number | ParamKeys;
    /** How much of the fog shows; 0 is none. Range 0..1. Default 1. */
    opacity?: number | ParamKeys;
  };
  /** Bends the camera's picture like a real lens: barrel or pincushion around a center. The scene is rendered wider than the frame, so a barrel pull still fills the corners. */
  lens_distortion: {
    /** Negative is barrel (bulges out), positive is pincushion; 0 is none. Range -1..1. Default 0. */
    amount?: number | ParamKeys;
    /** Center of the distortion as [x, y] in fractions of the frame; [0.5, 0.5] is the middle. Range [0, 0]..[1, 1]. Default [0.5, 0.5]. */
    center?: Vec2;
    /** Zoom after the distortion; above 1 crops the bent edges. Range 0.5..2. Default 1. */
    scale?: number | ParamKeys;
    /** What shows where the picture pulls in past the frame edge. Default "transparent". */
    edges?: "transparent" | "clamp" | "mirror";
  };
  /** Splits colors toward the frame edges like lens dispersion: red and blue fringes that grow away from the center. */
  chromatic_aberration: {
    /** How far red and blue separate; negative swaps their sides. Range -2..2. Default 0.5. */
    amount?: number | ParamKeys;
    /** Extra separation that grows toward the corners. Range -1..1. Default 0. */
    edge?: number | ParamKeys;
    /** Taps across the spectrum; more is a smoother fringe. Range 3..32. Default 8. */
    samples?: number;
  };
  /** Replaces the camera's normal projection with a fisheye lens of a wide field of view. */
  fisheye: {
    /** Field of view across the image circle, degrees. Range 10..180. Default 180. */
    fov?: number | ParamKeys;
    /** How the angle off the lens axis maps to distance from the center. Default "equidistant". */
    mapping?: "equidistant" | "equisolid" | "stereographic" | "orthographic";
    /** full_frame: the image circle covers the frame corners; circular: it fits the frame height. Default "full_frame". */
    frame?: "full_frame" | "circular";
  };
}
type CameraComponentName = keyof CameraComponentParams;

/**
 * The grade (clip.grade / track.grade / applyLut): the editor's Color
 * panel. Unset settings keep their value. Correction sliders are neutral at
 * 0.5 (exposure, contrast, brightness, highlights, shadows, saturation,
 * vignette; range 0..1) or 0 (hue, offset, temperature, tint, vibrance,
 * sharpness; range -1..1). A 0..1 slider is NOT a signed amount: 0 is its
 * extreme (contrast 0 is flat grey, saturation 0 is black and white), so
 * "a bit less" is just under 0.5 (contrast 0.45, saturation 0.4) and "a
 * bit more" just over it (0.55, 0.6).
 * Sliders marked Animated take { keyframes } (clip grades only).
 */
interface GradeSettings {
  /** Exposure; 0.5 is unchanged (not 0): below darkens, above brightens. Range 0..1. Default 0.5. */
  exposure?: Animated<number>;
  /** Contrast; 0.5 is unchanged (not 0). The picture's contrast is scaled by 2 x contrast around mid-grey: 0.25 halves it, 0.1 is a flat milky haze, 0.6 is a mild boost, 1 doubles it. Range 0..1. Default 0.5. */
  contrast?: Animated<number>;
  /** Brightness; 0.5 is unchanged (not 0): adds (brightness - 0.5) to every channel, so 0.45 is slightly darker. Range 0..1. Default 0.5. */
  brightness?: Animated<number>;
  /** Highlights; 0.5 is unchanged (not 0). Range 0..1. Default 0.5. */
  highlights?: Animated<number>;
  /** Shadows; 0.5 is unchanged (not 0). Range 0..1. Default 0.5. */
  shadows?: Animated<number>;
  /** Saturation; 0.5 is unchanged (not 0): color is scaled by 2 x saturation, so 0 is grey, 0.35 is 30% less, 0.6 is 20% more, 1 doubles it. Never negative. Range 0..1. Default 0.5. */
  saturation?: Animated<number>;
  /** Hue rotation; 0 is unchanged. Range -1..1. Default 0. */
  hue?: Animated<number>;
  /** Overall level offset; 0 is unchanged. Range -1..1. Default 0. */
  offset?: Animated<number>;
  /** Cooler (negative) or warmer (positive); 0 is unchanged. Range -1..1. Default 0. */
  temperature?: Animated<number>;
  /** Green (negative) or magenta (positive); 0 is unchanged. Range -1..1. Default 0. */
  tint?: Animated<number>;
  /** Saturation of the less saturated colors; 0 is unchanged. Range -1..1. Default 0. */
  vibrance?: Animated<number>;
  /** Soften (negative) or sharpen (positive); 0 is unchanged. Range -1..1. Default 0. */
  sharpness?: Animated<number>;
  /** Darken (above 0.5) or lighten (below 0.5) the edges; 0.5 is none. Range 0..1. Default 0.5. */
  vignette?: Animated<number>;
  /** Size of the vignette's clear center. Range 0..1. Default 0.5. */
  vignette_radius?: Animated<number>;
  /** Color the vignette fades to. Default "#000000". */
  vignette_color?: Color;
  /** The color that becomes white (white balance pick). Default "#ffffff". */
  white_color?: Color;
  /** Color push as [r, g, b], each -1..1; [0, 0, 0] is neutral. Range -1..1. Default [0, 0, 0]. */
  lift_color?: [number, number, number];
  /** Brightness push; 0 is neutral. Range -1..1. Default 0. */
  lift_master?: Animated<number>;
  /** Saturation; 1 is neutral. Range 0..2. Default 1. */
  lift_saturation?: Animated<number>;
  /** Color push as [r, g, b], each -1..1; [0, 0, 0] is neutral. Range -1..1. Default [0, 0, 0]. */
  gamma_color?: [number, number, number];
  /** Brightness push; 0 is neutral. Range -1..1. Default 0. */
  gamma_master?: Animated<number>;
  /** Saturation; 1 is neutral. Range 0..2. Default 1. */
  gamma_saturation?: Animated<number>;
  /** Color push as [r, g, b], each -1..1; [0, 0, 0] is neutral. Range -1..1. Default [0, 0, 0]. */
  gain_color?: [number, number, number];
  /** Brightness push; 0 is neutral. Range -1..1. Default 0. */
  gain_master?: Animated<number>;
  /** Saturation; 1 is neutral. Range 0..2. Default 1. */
  gain_saturation?: Animated<number>;
  /** Color push as [r, g, b], each -1..1; [0, 0, 0] is neutral. Range -1..1. Default [0, 0, 0]. */
  global_color?: [number, number, number];
  /** Brightness push; 0 is neutral. Range -1..1. Default 0. */
  global_master?: Animated<number>;
  /** Saturation; 1 is neutral. Range 0..2. Default 1. */
  global_saturation?: Animated<number>;
  /** Tone curve as [[x, y], ...] points (x strictly increasing, 0..1; y 0..1); [[0, 0], [1, 1]] is neutral. Setting a curve turns curves on. */
  master_curve?: [number, number][];
  /** Tone curve as [[x, y], ...] points (x strictly increasing, 0..1; y 0..1); [[0, 0], [1, 1]] is neutral. Setting a curve turns curves on. */
  red_curve?: [number, number][];
  /** Tone curve as [[x, y], ...] points (x strictly increasing, 0..1; y 0..1); [[0, 0], [1, 1]] is neutral. Setting a curve turns curves on. */
  green_curve?: [number, number][];
  /** Tone curve as [[x, y], ...] points (x strictly increasing, 0..1; y 0..1); [[0, 0], [1, 1]] is neutral. Setting a curve turns curves on. */
  blue_curve?: [number, number][];
  /** Curve as [[x, y], ...] (x strictly increasing, 0..1; y is a multiplier 0..2, 1 neutral). Setting a curve turns curves on. */
  sat_vs_hue?: [number, number][];
  /** Hue shift by hue as [[x, y], ...] (x 0..1 strictly increasing; y -0.5..0.5 turns, 0 neutral). Setting a curve turns curves on. */
  hue_vs_hue?: [number, number][];
  /** Curve as [[x, y], ...] (x strictly increasing, 0..1; y is a multiplier 0..2, 1 neutral). Setting a curve turns curves on. */
  hue_vs_luma?: [number, number][];
  /** Curve as [[x, y], ...] (x strictly increasing, 0..1; y is a multiplier 0..2, 1 neutral). Setting a curve turns curves on. */
  luma_vs_sat?: [number, number][];
  /** Curve as [[x, y], ...] (x strictly increasing, 0..1; y is a multiplier 0..2, 1 neutral). Setting a curve turns curves on. */
  sat_vs_sat?: [number, number][];
  /** Corrections section on. Default true. */
  corrections?: boolean;
  /** Color wheels section on. Default true. */
  wheels?: boolean;
  /** Tone curves section on. Default true. */
  curves?: boolean;
  /** Hue/saturation curves section on. Default true. */
  hue_curves?: boolean;
  /** A .cube LUT file next to the script (e.g. "luts/teal.cube"), or null for none. */
  lut?: string | null;
  /** How much of the LUT to apply, 0..1. Range 0..1. Default 1. */
  lut_strength?: Animated<number>;
  /** Color space the LUT expects (camera log formats); display_709 for creative looks. Default "display_709". */
  lut_input?: "display_709" | "slog3_sgamut3cine" | "slog3_sgamut3" | "vlog_vgamut" | "hlg_2020" | "pq_2020" | "acescct_ap1" | "linear_2020";
  /** Color space the LUT produces. Default "display_709". */
  lut_output?: "display_709" | "slog3_sgamut3cine" | "slog3_sgamut3" | "vlog_vgamut" | "hlg_2020" | "pq_2020" | "acescct_ap1" | "linear_2020";
  /** Where the grade applies: up to 4 area masks (GradeMask); [] or none grades the whole picture. Default []. */
  masks?: GradeMask[];
}

/**
 * An area of the picture a grade applies to, in fractions of the clip box
 * ([0, 0] top-left, [1, 1] bottom-right). `size` (circle, rectangle) and
 * `feather` ([inside, outside]) are in clip heights; `combine` "subtract"
 * cuts holes in the masks before it. "object" is the outline of an Object
 * Mask effect on the same clip (`effect_id`); center, size and rotation do
 * not apply to it.
 */
interface GradeMask {
  shape?: "circle" | "rectangle" | "gradient" | "object";
  /** "object" only: the Object Mask effect's id on the same clip. */
  effect_id?: string;
  center?: Vec2;
  size?: Vec2;
  rotation?: number;
  feather?: Vec2;
  opacity?: number;
  invert?: boolean;
  combine?: "add" | "subtract";
  name?: string;
}

/** A grade curve (grade.curve): tone curves take y 0..1, hue_vs_hue -0.5..0.5, the other hue/sat curves 0..2. */
type GradeCurve = "master" | "red" | "green" | "blue" | "sat_vs_hue" | "hue_vs_hue" | "hue_vs_luma" | "luma_vs_sat" | "sat_vs_sat";

/** One qualifier channel's key range; `false` turns the channel off. */
interface QualifierRange {
  low?: number;
  high?: number;
  softLow?: number;
  softHigh?: number;
}

/**
 * What a grade keys on (grade.qualify): `hue` in degrees 0..360, `sat` and
 * `lum` 0..1, `blur` 0..20. A range turns its channel on.
 */
interface GradeQualifier {
  hue?: QualifierRange | boolean;
  sat?: QualifierRange | boolean;
  lum?: QualifierRange | boolean;
  blur?: number;
}

/** Fade shapes: "exponential" (the default; slow start), "constant_power" (-3 dB midpoint), "constant_gain" (linear, -6 dB midpoint). */
type FadeCurve = "exponential" | "constant_power" | "constant_gain";
/** How speed eases through a ramp or a retime point. */
type RetimeShape = "linear" | "ease_in" | "ease_out" | "ease_in_out" | "auto";

interface KeyframePoint<V> {
  /** Clip-local time (frames(0) = clip start). */
  at: Time;
  value: V;
  /** Shapes the stretch from this point to the next. Default "linear". */
  ease?: Ease;
}

/**
 * One key to add (addKeyframe). `value` omitted: the curve's value at `at`
 * (the still value on a property that is not animated yet). A key already
 * on that frame is updated in place (one key per frame, as in the editor).
 */
interface NewKeyframe<V> {
  /** Clip-local time (frames(0) = clip start); a timeline point counts from the clip start. */
  at: Time;
  value?: V;
  /** The stretch from this key to the next. Default "linear" (a key updated in place keeps its ease). */
  ease?: Ease;
}

/** A change to one key (moveKeyframe): a new time, a new value, or both. The key keeps its ease. */
interface KeyframeChange<V> {
  /** Clip-local time. Refused on another key's frame; past a neighbour the keys reorder by time. */
  to?: Time;
  value?: V;
}

type ParamValue = number | boolean | string | Vec2 | Color;

/**
 * A number param's keyframes (transition params, caption text-shader
 * params): `[{ at, value, ease }]`, or `{ keyframes: [...] }` as the param
 * reads back. `at` counts from the owner's start: a transition's start (the
 * first frame of its window, where its progress is 0; frames(0)..its
 * length) or a captions clip's start. A transition's keys keep that offset
 * from its start when a script edit moves, ripples or resizes it.
 */
type ParamKeys = KeyframePoint<number>[] | { keyframes: KeyframePoint<number>[] };

interface Placement {
  /** Where the clip starts. Default frames(0). */
  at?: Time;
  /** How long it runs. Default: to the timeline's duration (if set); media defaults to its source length. */
  length?: Time;
  /** Alternative to length: where the clip ends (exclusive). */
  end?: Time;
  /** Put the clip on a named track (created on first use). Omit to stack automatically. */
  track?: string;
  name?: string;
  /** false: leave this clip out of the beat check (off_beat), e.g. a picture timed to a voice rather than the music. Script state only; not saved in the edit. */
  beat?: boolean;
}

interface MediaOptions extends Placement, PlaceOptions {
  /** Pictures: "contain" (the default: the whole picture fits the frame) or "cover" (fills it, cropping). With width and/or height it fits that box instead (a side not given is the frame's). */
  fit?: "contain" | "cover";
  /** Pictures: scale (keeping the shape) to this width / height, px or % of the frame; both: the largest size inside that box (with fit: "cover", the smallest that covers it). This sets the zoom (inspect().placedZoom); zoom keys stay absolute. */
  width?: Length;
  height?: Length;
  /** Pictures: center, px or % of the frame from its center. */
  x?: Length;
  y?: Length;
  /** On a named track: "overwrite" (default; cuts what is under it) or "insert" (pushes later clips). */
  mode?: EditMode;
  /** Video/audio in-point inside the media: source.seconds(2.4) or "2.4s". Default the start. */
  sourceIn?: SourceTime | SourceTimeString;
  /** Video/audio out-point inside the media. Default the end. */
  sourceOut?: SourceTime | SourceTimeString;
  /** Video/audio: read this stretch of the media (in place of sourceIn/sourceOut). */
  source?: Span;
  /**
   * Video/audio: a length (or end) longer than the media left from the in-point
   * (to sourceOut, else the media's end) is refused, with the length that fits;
   * up to 0.5 s over is trimmed anyway and noted. true: trim any overshoot to the
   * media left, noted in the receipt (clamped_to_media, field "length"); read the
   * clip's length for what was placed. Default false. To fill the length instead, loop() it.
   */
  clampLength?: boolean;
  /** A Sequence: which element to place (its index, or its path's file name); default the first. */
  output?: number | string;
  /** Video: also place the linked audio clip (default true when the file has audio). */
  audio?: boolean;
  /**
   * Audio (or a video's audio) on a named audio track (created on first use).
   * Audio files always land on an audio track: with only `track`, a name of an
   * audio track or a new name (e.g. "music", which becomes the audio track's name)
   * is used as the audio track; a video track's name (e.g. "V1") sends the sound to
   * a free audio track (as if no track was given) and the build notes where it went.
   */
  audioTrack?: string;
}

interface TextStyle {
  /**
   * The text's font, one of:
   * - a bin font's handle or name (`"f13"`, `"Anton"`; see `edit.bin.fonts()`),
   * - a family a text of this edit already uses (what `clip.font` reads, so it can be passed back),
   * - any family of the font catalog by name (`"Cormorant Garamond"`; Google Fonts and more, about 2,000): the clip carries it, no bin row needed,
   * - a .ttf/.otf file path ("fonts/Anton-Regular.ttf" next to the script, or "/uploads/brand.ttf").
   * Default: the editor's default font. Measuring (fit, bounds) needs the font's file: a bin font
   * the editor stored, or a catalog family, is drawn but not measured here.
   */
  font?: string;
  /** Pixels. Default 96. */
  fontSize?: number;
  /** 1..1000. A variable font file (one with a wght axis) draws any weight in its range; a static file draws only its own weight. */
  fontWeight?: number;
  color?: Color;
  backgroundColor?: Color;
  align?: "left" | "center" | "right" | "justified";
  /**
   * offset: 0..1, slides a partly drawn outline (a stroke_trim animation) along
   * the glyph. join: how the outline turns a corner (default "round").
   */
  stroke?: { color?: Color; width?: number; offset?: number; join?: "round" | "miter" | "bevel" } | false;
  shadow?: { color?: Color; blur?: number; offset?: Vec2 } | false;
  lineSpacing?: number;
  /** Extra space between letters, in em (a fraction of fontSize): 0.05 = 5%. Not px. -1..10 (the editor slider range). */
  tracking?: number;
  case?: "original" | "upper" | "lower" | "title";
  /** Wrap width in px, or "auto" (default): only explicit newlines break; the box fits the text. */
  boxWidth?: number | "auto";
  /**
   * Pick the largest fontSize at which the text fits this box (px, or a
   * percent of the canvas like "80%"), measured with the text's own font
   * file. Not with fontSize. Needs `font`.
   */
  fit?: { width?: number | string; height?: number | string };
}

/**
 * Which part of a text to style, by content (never by position): the first
 * occurrence of a string (`{ all: true }` for every one), the nth word or
 * line (counted from 0), or a regular expression (`/re/g` styles every
 * match). Words are whitespace-separated. Lines are the text's own lines
 * (split at "\n"; wrapping does not make lines); empty lines are skipped
 * unless `countEmpty: true`. Regular expressions have no look-around
 * ((?=...), (?<=...)); `\b` marks a word edge. A part that is not in the
 * text styles nothing and is a `style_no_match` warning.
 */
type TextTarget = string | { word: number } | { line: number; countEmpty?: boolean } | { match: RegExp | string };

/**
 * A style for part of a text. Only these can differ inside one text clip;
 * tracking, line spacing, alignment, case, stroke and shadow apply to the
 * whole text: clip.set({ style: { stroke: { color: "#000000", width: 4, join: "miter" } } })
 * (or setText, or the addText options). clip.style(target, ...) takes only these.
 */
interface RangeStyle {
  /** Text color of the part. */
  color?: Color;
  /**
   * A box behind the WHOLE text: a color, or { color, padding (px, default 8), radius (px) };
   * false removes it. The engine (and the editor) paint it behind the whole text box even when
   * it is set on a part (a `background_whole_box` note; check() reports text_background_whole);
   * for a box behind one part use `band`.
   */
  background?: Color | { color?: Color; padding?: number; radius?: number } | false;
  /**
   * A band (marker stroke) behind the part, line by line; false removes it. The engine pads a band
   * by 10 px on every side, so on small multi-line text it reaches into the next line:
   * `{ color, fit: "line" }` keeps it to its line's height.
   */
  band?: Color | { color: Color; fit?: "line" } | false;
  /** true, or { color, width (px, default 6) }; false removes it. */
  underline?: boolean | { color?: Color; width?: number };
  strike?: boolean | { color?: Color; width?: number };
  /** Pixels. */
  fontSize?: number;
  fontWeight?: number;
  /** Another font for this part (mixed fonts): a bin font's handle or name, a family a text already uses, a font catalog family, or a .ttf/.otf path. */
  font?: string;
}

/** Built-in text style presets for titles (edit.catalog().text_style_presets). */
type TextStylePreset = "title_clean" | "poster_bold" | "lower_third" | "editorial_quote";

/** Built-in caption presets (edit.catalog().caption_presets). */
type CaptionPresetName = "clean" | "hype" | "mixtape" | "sticker" | "spotlight";

/**
 * A part of a captions clip: a string (whole words, case and punctuation
 * ignored; the first match, `{ all: true }` for every one), `{ match }`: a
 * word whose text matches (`/re/g` or `{ all: true }`: every matching
 * word), or a cue (its words), one of its words, or a run of them
 * (`words: [first, last]`), counted from 0 as cues and words are.
 */
type CaptionTarget = string | { match: RegExp | string } | { cue: number; word?: number; words?: [number, number] };

/**
 * Where a clip's picture is (canvas px from the center, +y down), at its
 * zoom, rotation (the box around it) and position. Text: the laid-out
 * lines' box, its `lines`, and `ink` (the letters themselves: what `place`
 * and the off-canvas check use).
 */
interface Bounds extends Rect {
  /** Position, zoom or rotation is animated (these are the asked time's). */
  animated: boolean;
  lines?: number;
  ink?: Rect;
}

/**
 * Where a new text goes: by intent (`place`, with `margin` / `within`), or
 * by its center (`x` / `y`, px or % of the frame from its center). Not both;
 * margin and within need place.
 */
type TextPosition =
  | (PlaceOptions & { place: Anchor; x?: never; y?: never })
  | { x?: Length; y?: Length; place?: never; margin?: never; within?: never };

/** A text's size: `fontSize`, or `fit` (the largest size that fits the box). Not both. */
type TextSize =
  | { fontSize?: number; fit?: never }
  | { fit: NonNullable<TextStyle["fit"]>; fontSize?: never };

/** A new text's look, size and position (see TextPosition and TextSize for what excludes what). */
type TextLayout = Omit<TextStyle, "fontSize" | "fit"> & TextSize & TextPosition;

type TextOptions = Placement & TextLayout;

/** Path presets: parametric shapes, or "path" (your own vertices). */
type PathPreset = "rectangle" | "ellipse" | "polygon" | "star" | "path";

/**
 * Fill or stroke paint: a solid color, a linear gradient or a radial
 * gradient (an object, never a CSS "linear-gradient(...)" string). Positions are px from the shape's box center (+y down); stops
 * are [offset 0..1, color], at least two, offsets not decreasing; a color
 * with alpha ("#rrggbbaa") fades.
 *   fill: "#ff3366"                                                        // solid
 *   fill: { linear: { from: [0, -100], to: [0, 100], stops: [[0, "#ffd700"], [1, "#ff3366"]] } }  // top to bottom
 *   fill: { radial: { radius: 100, stops: [[0, "#ffffff"], [1, "#3366ff"]] } }  // center out; center?: [x, y]
 * A glow, halo or flare is a radial gradient from a color to transparent,
 * not a blurred solid: the edge is already soft and costs no effect.
 *   const glow = tl.addShape("ellipse", { width: 600, height: 600,
 *     fill: { radial: { radius: 300, stops: [[0, "#fff4d6ff"], [0.3, "#ffb34799"], [1, "#ff8a0000"]] } } });
 *   glow.set({ blendMode: "screen" });  // or "add": brightens what is below
 */
type Paint =
  | Color
  | { linear: { from: Vec2; to: Vec2; stops: [number, Color][] } }
  | { radial: { center?: Vec2; radius: number; stops: [number, Color][] } };

/** A path vertex: [x, y] (a corner), or { at, in, out } with bezier handles as offsets from `at`. px from the shape's box center, +y down. */
type Vertex = Vec2 | { at: Vec2; in?: Vec2; out?: Vec2 };

interface Stroke {
  color?: Paint;
  /** px. Default 4. */
  width?: Animated<number>;
  cap?: "butt" | "round" | "square";
  join?: "miter" | "round" | "bevel";
  /** Dash and gap lengths in px, in pairs: [12, 6]. [] is solid. */
  dash?: number[];
  /** Slides the dash pattern along the path, px. */
  dashOffset?: Animated<number>;
}

/** Draw only part of the outline, in percent of its length (0..100); `offset` slides the window (100 = one loop). Animate `end` from 0 to 100 for a write-on. */
interface Trim {
  start?: Animated<number>;
  end?: Animated<number>;
  offset?: Animated<number>;
}

/** A path's geometry, paint, trim and transform (as path.inspect() prints them). */
interface PathOptions {
  name?: string;
  visible?: boolean;
  /** "path" only: the outline (2+ vertices), or { keyframes: [{ at, value: Vertex[], ease? }] } to morph it. */
  vertices?: Vertex[] | { keyframes: KeyframePoint<Vertex[]>[] };
  /** "path" only. Default true. */
  closed?: boolean;
  /** rectangle/ellipse: box [w, h], px. */
  size?: Animated<Vec2>;
  /** Preset center, px from the box center. */
  center?: Animated<Vec2>;
  /** rectangle: corner radius px. */
  roundness?: Animated<number>;
  /** star/polygon: corner count (3..1000). */
  points?: Animated<number>;
  innerRadius?: Animated<number>;
  outerRadius?: Animated<number>;
  /** star/polygon corner rounding, percent 0..100. */
  innerRoundness?: Animated<number>;
  outerRoundness?: Animated<number>;
  /** star/polygon: degrees; 0 puts the first point straight up. */
  angle?: Animated<number>;
  /** null: no fill. */
  fill?: Paint | null;
  /** null: no stroke. */
  stroke?: Stroke | null;
  /** null: the whole outline. */
  trim?: Trim | null;
  /** Path transform (on top of the clip's): offset px, degrees, scale (1 = unchanged), opacity 0..1, pivot px from the box center. */
  position?: Animated<Vec2>;
  rotation?: Animated<number>;
  scale?: Animated<Vec2 | number>;
  opacity?: Animated<number>;
  anchor?: Vec2;
}

interface ShapeOptions extends Placement, PlaceOptions {
  /** Box size, px or % of the frame. Default 200x200; a "path" defaults to its vertices' extent. */
  width?: Length;
  height?: Length;
  x?: Length;
  y?: Length;
  /** Default white. */
  fill?: Paint | null;
  stroke?: Stroke | null;
  trim?: Trim | null;
  vertices?: Vertex[];
  closed?: boolean;
  roundness?: number;
  points?: number;
  innerRadius?: number;
  outerRadius?: number;
  innerRoundness?: number;
  outerRoundness?: number;
  angle?: number;
}

/** A transition's length: `length` in total (split evenly around the cut), or `in` (before the cut) and `out` (after). Default half a second each side. */
interface TransitionTiming {
  length?: Time;
  in?: Time;
  out?: Time;
}

/** Timing, `easing`, and a bin transition's own params by the names its `params` lists (floats also take ParamKeys, `at` from the transition's start). */
interface BinTransitionOptions extends TransitionTiming {
  /** How iv_progress is eased before the shader runs. Default: the row's own (else "linear"). */
  easing?: Easing;
  [param: string]: unknown;
}

interface Effect {
  /** Opaque handle, stable for the edit (e.g. "ef3"; audio effects "af2"). */
  readonly id: string;
  /** The clip it is on (picture effects and a sound's audio effects), else undefined. */
  readonly clip?: Clip;
  /** The track, bus or main output it is on, else undefined. */
  readonly track?: Track;
  /** Built-in effect name, an audio effect name, "grade", "custom" for a GLSL effect, "matte"/"mask" for those, or "other" for an effect scripts cannot edit. */
  readonly name: EffectName | AudioEffectName | LegacyAudioEffectName | "grade" | "custom" | "matte" | "mask" | "other";
  /** A custom effect's title, else null. */
  readonly title: string | null;
  readonly enabled: boolean;
  /** Current values by parameter name (animated numbers: { keyframes: [{ at, value }] }). */
  readonly params: Record<string, unknown>;
  /** Set a parameter (names as in EffectParams / edit.catalog()). A keyframed parameter needs { replaceAnimation: true }. */
  set(param: string, value: ParamValue, opts?: ReplaceAnimation): Effect;
  /** Animate a number parameter. */
  setKeyframes(param: string, points: KeyframePoint<number>[]): Effect;
  /** A number parameter's keyframes, or null when it is not animated. */
  keyframes(param: string): KeyframePoint<number>[] | null;
  /**
   * Single keys of param (as keyframes(param) reads them; `at` is a
   * key's clip-local time). The curve is rewritten as setKeyframes would.
   */
  addKeyframe(param: string, key: NewKeyframe<number>): Effect;
  /** Move one key in time and/or change its value. */
  moveKeyframe(param: string, at: Time, change: KeyframeChange<number>): Effect;
  /** Delete one key; deleting the last leaves the property still at its value. */
  deleteKeyframe(param: string, at: Time): Effect;
  /** The ease of the stretch leaving the key at `at` (not the last key). Elastic, bounce and springs bake as in setKeyframes. */
  setKeyframeEase(param: string, at: Time, ease: Ease): Effect;
  /** A disabled effect stays in the stack but does nothing. */
  setEnabled(enabled: boolean): Effect;
  /** Move within its stack: 0 = applied first. */
  reorder(position: number): Effect;
  remove(): void;
}

/**
 * A component of a 3D camera clip (clip.addComponent, clip.components()):
 * fog, lens_distortion, chromatic_aberration or fisheye, as the camera
 * Inspector's Components list. Works like an Effect, without reorder: a
 * camera runs its components in a fixed order by type.
 * @example
 * const cam = tl.clips({ kind: "camera" })[0];
 * const fog = cam.addComponent("fog", { color: "#b0c4de", end: 6000 });
 * fog.setKeyframes("opacity", [{ at: frames(0), value: 0 }, { at: seconds(2), value: 1 }]);
 * cam.addComponent("lens_distortion", { amount: -0.3 });
 */
interface CameraComponent {
  /** Opaque handle, stable for the edit (e.g. "cc1"). */
  readonly id: string;
  /** The camera clip it is on. */
  readonly clip: Clip;
  /** The component, or "other" for one this build does not know. */
  readonly name: CameraComponentName | "other";
  readonly enabled: boolean;
  /** Current values by parameter name (animated numbers: { keyframes: [{ at, value }] }). */
  readonly params: Record<string, unknown>;
  /** Set a parameter (names as in CameraComponentParams / edit.catalog().camera_components). A keyframed parameter needs { replaceAnimation: true }. */
  set(param: string, value: ParamValue, opts?: ReplaceAnimation): CameraComponent;
  /** Animate a number parameter (clip-local `at`). */
  setKeyframes(param: string, points: KeyframePoint<number>[]): CameraComponent;
  /** A number parameter's keyframes, or null when it is not animated. */
  keyframes(param: string): KeyframePoint<number>[] | null;
  /** Single keys of param, as on Effect. */
  addKeyframe(param: string, key: NewKeyframe<number>): CameraComponent;
  moveKeyframe(param: string, at: Time, change: KeyframeChange<number>): CameraComponent;
  deleteKeyframe(param: string, at: Time): CameraComponent;
  setKeyframeEase(param: string, at: Time, ease: Ease): CameraComponent;
  /** A disabled component stays on the camera but does nothing. */
  setEnabled(enabled: boolean): CameraComponent;
  remove(): void;
}

/**
 * One of a clip's grades (clip.grades(), clip.addGrade, clip.grade): an
 * Effect named "grade" whose `id` is its stack id. Each call lands the same
 * edit as the timeline agent's op of that name (grade, curve, mask,
 * apply_lut, set fx.grade.<id>.*).
 * @example
 * const look = c.addGrade({ saturation: 0.6 }, { name: "look" });
 * look.curve("master", [[0, 0], [0.5, 0.6], [1, 1]]);
 * look.addWindow({ shape: "circle", center: [0.5, 0.4] });
 */
interface Grade extends Omit<Effect, "id" | "name" | "set" | "remove"> {
  /** The grade's stack id ("g1"), as the ops and the Color panel name it; a grade the editor made without one: its handle ("ef3"). */
  readonly id: string;
  /** The grade's name, else null. */
  readonly name: string | null;
  /** These settings on this grade (clip.grade with { grade }). */
  set(settings: GradeSettings, opts?: ReplaceAnimation): Grade;
  /** One setting (effect.set). */
  set(param: string, value: ParamValue, opts?: ReplaceAnimation): Grade;
  /** Replace one whole curve with [x, y] points (x strictly increasing, 0..1); [] makes it neutral. Turns its section on. Op `curve`. */
  curve(which: GradeCurve, points: Vec2[]): Grade;
  /** Key the grade on hue, saturation or luma; null turns the qualifier off. Op `set fx.grade.<id>.qualifier*`. */
  qualify(q: GradeQualifier | null): Grade;
  /** Add a power window (at most 4; shape default "circle"). Op `mask kind:add`. */
  addWindow(mask: GradeMask): GradeWindow;
  /** The grade's windows, w1 first. */
  windows(): GradeWindow[];
  /** A bin LUT (edit.bin.luts() or its handle) on this grade, at `strength` (default 1); a .cube path as clip.applyLut; null removes it. Op `apply_lut` with `grade`. */
  applyLut(lut: string | BinLut | null, opts?: { strength?: number }): Grade;
  /** Move in the clip's stack, before or after another grade. Op `grade kind:move`. */
  move(to: { before: Grade | string } | { after: Grade | string }): Grade;
  /** Remove the grade. Op `grade kind:remove`. */
  remove(): void;
}

/** A grade's power window, "w1".."w4" by position: removing one renumbers the ones after it. */
interface GradeWindow {
  readonly id: string;
  readonly grade: Grade;
  readonly shape: "circle" | "rectangle" | "gradient";
  readonly center: Vec2;
  readonly size?: Vec2;
  readonly rotation: number;
  readonly feather: Vec2;
  readonly opacity: number;
  readonly invert: boolean;
  readonly combine: "add" | "subtract";
  readonly name?: string;
  /** Change settings; the shape stays (remove the window and add another). Op `set fx.grade.<id>.mask.<w>.*`. */
  set(mask: GradeMask): GradeWindow;
  /** Op `mask kind:remove`. */
  remove(): void;
}

/** "camera": a 3D camera clip (tl.addCamera); it has no picture of its own, and takes components (clip.addComponent), not effects. */
type ClipKind = "image" | "video" | "text" | "shape" | "adjustment" | "nested" | "captions" | "audio" | "camera";
type Property = "position" | "zoom" | "rotation" | "opacity" | "anchor";
/** A sound's animatable properties: gain in dB (-60..12; -60 is silence), pan -1 (left)..1 (right). */
type SoundProperty = "gain_db" | "pan";

/** Pass to replace an animation with a single value (otherwise refused). */
interface ReplaceAnimation {
  replaceAnimation?: boolean;
}

/** What clip.animate (and stagger) animates: per property, [from, to] (or more values), or explicit points. */
interface AnimProps {
  position?: Vec2[] | KeyframePoint<Vec2>[];
  zoom?: (number | Vec2)[] | KeyframePoint<number | Vec2>[];
  rotation?: number[] | KeyframePoint<number>[];
  opacity?: number[] | KeyframePoint<number>[];
  anchor?: Vec2[] | KeyframePoint<Vec2>[];
}

interface AnimateOptions extends ReplaceAnimation {
  /** Clip-local start (a beat or other point counts from the clip's start). Default frames(0). */
  at?: Time;
  /** How long value lists take (a length: frames, seconds, grid.beats). Optional with a spring (it settles). */
  over?: Time;
  /** Default "linear". */
  ease?: Ease;
  /**
   * Stop motion: held samples every `step` (frames(2) = on twos), changing
   * on the timeline's step clock (tl.stepClock; frame 0 by default) unless
   * `stepFrom: "clip"`. The span keeps its ends: the start value holds to the
   * first clock frame after `at` (a shorter first step) and the end value
   * lands on the last clock frame at or before the end.
   */
  step?: Time;
  /** Where `step` counts from: "timeline" (default, the step clock) or "clip" (every `step` from the animation's start). */
  stepFrom?: "timeline" | "clip";
}

/** A property as inspect() prints it: a value, or its keyframes. */
type Animated<V> = V | { keyframes: KeyframePoint<V>[] };

/**
 * A clip's public props. What inspect() returns, set() takes back unchanged
 * (equal values are no-ops). id, kind, timeline, sourceIn, linked, effects
 * and keyframes are read-only.
 */
interface ClipProps {
  /** Set only (never read back): false leaves the clip out of the beat check (off_beat); true puts it back. */
  beat?: boolean;
  readonly id?: string;
  readonly kind?: ClipKind;
  readonly timeline?: string;
  /** Track handle (or name, when setting). */
  track?: string;
  at?: Time;
  length?: Time;
  enabled?: boolean;
  position?: Animated<Vec2>;
  /** Absolute: 1 fits the frame (setZoom). A picture placed with `{ width }` / `{ height }` / `fit` is not zoom 1 (see placedZoom). */
  zoom?: Animated<number | Vec2>;
  /** The zoom its placement (`{ width }`, `{ height }`, `fit` in this run) chose; zoom keys stay absolute, so "10% larger than placed" is placedZoom * 1.1. */
  readonly placedZoom?: number | Vec2;
  rotation?: Animated<number>;
  opacity?: Animated<number>;
  anchor?: Animated<Vec2>;
  blendMode?: BlendMode;
  size?: Vec2;
  name?: string;
  text?: string;
  /**
   * Text: the whole-text style. Captions: CaptionStyle. Also printed, read
   * only (set() takes them back unchanged and refuses a change): the
   * editor's horizontalAnchor and stripPunctuation.
   */
  style?: TextStyle & { readonly horizontalAnchor?: "left" | "center" | "right"; readonly stripPunctuation?: "none" | "all" | "periods_and_commas" };
  /** Text: the styled parts, by their text (style them with clip.style). */
  readonly styled?: { text: string; style: RangeStyle }[];
  /** Text: the letter/line animation as animateText takes it (one layer, or the layers in order); null for none. set() replaces it. */
  textAnimation?: TextAnimationLayer | TextAnimationLayer[] | null;
  /** Captions: the cues (no index), as captions.cues() reads them. set() replaces them all. A cue's animation is its own (caps.animate(type, { cue })); null gives it the clip's. */
  cues?: (CueInput & { animation?: ({ type: CaptionAnimation } & CaptionAnimationOptions) | null })[];
  /** Captions: the animation, as { type, ...options }. */
  animation?: { type: CaptionAnimation } & CaptionAnimationOptions;
  /** Audio clips: volume in dB, pan -1..1, fade lengths and shapes. */
  gainDb?: Animated<number>;
  pan?: Animated<number>;
  fadeIn?: Time;
  fadeOut?: Time;
  fadeCurve?: FadeCurve;
  fadeOutCurve?: FadeCurve;
  /** Audio: the fade-in crossfades with the sound before it (tl.crossfade). */
  readonly crossfade?: boolean;
  /** Audio: keep pitch when the speed changes (false: varispeed). */
  preservePitch?: boolean;
  /** Video/audio: playback speed (negative = reversed) and looping. */
  speed?: number;
  /** Video: speed points (clip.speedRamp), or null. */
  speedRamp?: { at: Time; speed: number }[] | null;
  loop?: boolean;
  readonly sourceIn?: SourceTime;
  /** The linked partner's handle (a video's sound, a sound's video), or null. */
  readonly linked?: string | null;
  readonly effects?: { id: string; name: string; enabled: boolean; params: Record<string, unknown> }[];
  /** Camera clips: the components in the order they run (clip.components()). */
  readonly components?: { id: string; name: CameraComponentName | "other"; enabled: boolean; params: Record<string, unknown> }[];
  /** Every animated property's keyframes, by property. */
  readonly keyframes?: Partial<Record<Property | SoundProperty, KeyframePoint<number | Vec2>[]>>;
}

/** Linked picture and sound move together unless `linked: false`. */
interface Linked {
  linked?: boolean;
}

/** A shape for clip.mask, in fractions of the clip's box: [0, 0] top-left, [1, 1] bottom-right. */
type MaskShape =
  | { rect: [x: number, y: number, w: number, h: number] }
  | { ellipse: [cx: number, cy: number, rx: number, ry: number] }
  | { path: Vec2[] };

/** A clip handle. Fields are a snapshot; ops that move it refresh them (call refresh() after a ripple moved it). */
interface Clip {
  /** Opaque handle, stable for the edit (e.g. "c3", "t1", "a2"). */
  readonly id: string;
  readonly kind: ClipKind;
  /** e.g. `image "img/crew.png"`, for messages. */
  readonly label: string;
  readonly name: string;
  /** The media file as the script that placed it named it (relative to that script's directory); null for media the editor stored. */
  readonly asset: string | null;
  /** Text content of a text clip. */
  readonly text: string | null;
  /** Font family name of a text clip; pass it back as a text's `font` (setText(text, { font })) to reuse that font. */
  readonly font: string | null;
  /** [start, end) on the timeline. */
  readonly start: Time;
  readonly length: Time;
  readonly end: Time;
  /** Video/audio in-point in the source. */
  readonly sourceIn: SourceTime;
  /** Track name. */
  readonly track: string;
  /** Opaque track handle (e.g. "V2"). */
  readonly trackId: string;
  /** Handle of the timeline it is on (e.g. "T1"). */
  readonly timelineId: string;
  readonly enabled: boolean;
  readonly isAudio: boolean;
  /** The clip has sound: an audio clip, or a video whose media has an audio stream (placed with its sound or not). */
  readonly hasAudio: boolean;
  /** Placed size in canvas px (zoom 1). */
  readonly width: number;
  readonly height: number;
  /** The linked audio clip of a video, the clip itself for audio, else null. */
  readonly audio: Clip | null;
  /** A nested clip's timeline (tl.place / tl.group), else null. */
  readonly nested: Timeline | null;

  /** Public props; set(inspect()) changes nothing. */
  inspect(): ClipProps;
  /** Change props as inspect() prints them; unchanged values are skipped. */
  set(props: ClipProps, opts?: ReplaceAnimation): Clip;

  setPosition(x: number, y: number, opts?: ReplaceAnimation): Clip;
  setPosition(xy: Vec2, opts?: ReplaceAnimation): Clip;
  /** 1 = fits the frame. One number scales evenly. */
  setZoom(zoom: number, opts?: ReplaceAnimation): Clip;
  setZoom(x: number, y: number, opts?: ReplaceAnimation): Clip;
  setRotation(degrees: number, opts?: ReplaceAnimation): Clip;
  setOpacity(opacity: number, opts?: ReplaceAnimation): Clip;
  /**
   * The pivot for zoom and rotation, px from the clip's center (+y down); it does not move the
   * clip at zoom 1, unrotated. inspect().anchor reads the same px; a new clip's [0.5, 0.5] is
   * the model's default (half a pixel: its center).
   */
  setAnchor(x: number, y: number, opts?: ReplaceAnimation): Clip;
  setBlendMode(mode: BlendMode): Clip;
  /** Box size in px (images are placed fitted to the canvas). */
  setSize(w: number, h: number): Clip;
  /** Every clip kind but nested clips (they show their timeline's name) and captions. */
  setName(name: string): Clip;
  /** Scale evenly so the whole picture fits the canvas. */
  fitFrame(opts?: ReplaceAnimation): Clip;
  /** Scale evenly so the picture covers the canvas (crops). */
  fillFrame(opts?: ReplaceAnimation): Clip;

  setKeyframes(property: "position" | "anchor", points: KeyframePoint<Vec2>[]): Clip;
  setKeyframes(property: "zoom", points: KeyframePoint<number | Vec2>[]): Clip;
  setKeyframes(property: "rotation" | "opacity", points: KeyframePoint<number>[]): Clip;
  /** Sound automation (a video's sound is its linked audio): gain in dB, pan -1..1. Replaces a still value. */
  setKeyframes(property: SoundProperty, points: KeyframePoint<number>[]): Clip;
  /** A property's keyframes (clip-local `at`), or null when it is not animated. */
  keyframes(property: Property | SoundProperty): KeyframePoint<number | Vec2>[] | null;
  /**
   * Single keys of property (as keyframes(property) reads them; `at` is a
   * key's clip-local time). The curve is rewritten as setKeyframes would.
   */
  addKeyframe(property: Property | SoundProperty, key: NewKeyframe<number | Vec2>): Clip;
  /** Move one key in time and/or change its value. */
  moveKeyframe(property: Property | SoundProperty, at: Time, change: KeyframeChange<number | Vec2>): Clip;
  /** Delete one key; deleting the last leaves the property still at its value. */
  deleteKeyframe(property: Property | SoundProperty, at: Time): Clip;
  /** The ease of the stretch leaving the key at `at` (not the last key). Elastic, bounce and springs bake as in setKeyframes. */
  setKeyframeEase(property: Property | SoundProperty, at: Time, ease: Ease): Clip;
  /**
   * Stop-motion: re-key every animated property (or the ones named) as held
   * samples every `every` frames (default the step clock's, frames(2), "on
   * twos"). `from: "timeline"` (default): a key on the clip's first frame,
   * then the samples change on the timeline's step clock (tl.stepClock), so
   * all stepped clips change together; `from: "clip"`: every `every` frames
   * from the clip's first frame. Baked into normal keyframes.
   */
  onTwos(opts?: { every?: Time; properties?: Property[]; from?: "timeline" | "clip" }): Clip;

  /** Built-in effect; see EffectParams for each effect's parameters. On a sound (an audio clip, clip.audio): an audio effect (AudioEffectParams). */
  addEffect<N extends EffectName>(effect: N, params?: EffectParams[N]): Effect;
  /** By the engine's name (EffectEngineNames): the same effect as its public name. */
  addEffect<N extends EffectEngineName>(effect: N, params?: EffectParams[EffectEngineNames[N]]): Effect;
  addEffect<N extends AudioEffectName>(effect: N, params?: AudioEffectParams[N]): Effect;
  /**
   * An effect from the bin (edit.bin.effects(): a saved effect, or a catalog
   * row the edit carries), applied as the editor's effects panel applies it;
   * params by the effect's own names (as in its `params`). Reads back as
   * "custom" with the bin row's name as title (a catalog row: its name).
   */
  addEffect(effect: BinEffect | string, params?: Record<string, ParamValue>): Effect;
  /**
   * The clip's grade (the editor's Color panel), made when there is none
   * (as addGrade() makes it), with these settings. A clip with several
   * grades needs `grade` (its id, e.g. "g2", or a Grade).
   */
  grade(settings?: GradeSettings, opts?: ReplaceAnimation & { grade?: Grade | string }): Grade;
  /**
   * A LUT on the clip's grade: a .cube file next to the script, or a LUT in
   * the bin (edit.bin.luts(), or its handle "lut2"). null removes it;
   * `strength` 0..1 (default 1). The grade's `lut` reads back as the path or
   * the bin LUT's handle. Without `grade` a bin LUT applies as the
   * editor's Color panel applies it (input/output spaces guessed from its
   * name; set them with grade({ lut_input, lut_output })), on the clip's
   * grade or a new one; the op `apply_lut` leaves the spaces as they are.
   * With `grade` it is the op `apply_lut` on that grade. Several grades
   * need `grade`.
   */
  applyLut(lut: string | BinLut | null, opts?: { strength?: number; grade?: Grade | string }): Grade;
  /** The clip's grades, in the order they apply. */
  grades(): Grade[];
  /**
   * A new grade at the end of the stack (op `grade kind:add`): id the next
   * free "g1", "g2", ... (or `id`), named `name`, then moved `before` or
   * `after` another grade, then these settings.
   */
  addGrade(settings?: GradeSettings, opts?: ReplaceAnimation & { name?: string; id?: string; before?: Grade | string; after?: Grade | string }): Grade;
  /**
   * Your own GLSL fragment shader (GLSL ES 300), validated at build time:
   * - `uniform sampler2D src;` the clip's picture, read with
   *   texture(src, v_texcoord); `in vec2 v_texcoord;` 0..1, (0,0) top-left;
   *   `out vec4 outColor;` the result.
   * - Colors are PREMULTIPLIED: src gives rgb already times alpha, and
   *   outColor must too (keep rgb <= a; fade by scaling the whole vec4,
   *   `c * k`, not only c.a).
   * - Colors are LINEAR light, not sRGB: 0.5 is a lot brighter than a
   *   "#808080" mid gray, and curves (contrast, posterize, thresholds) act
   *   on light, not on display values. To work in sRGB, unpremultiply and
   *   convert: `pow(c.rgb / max(c.a, 1e-5), vec3(1.0 / 2.2))`, then back
   *   with `pow(x, vec3(2.2)) * c.a`.
   * - Params: members of ONE anonymous uniform block (any name), each a
   *   float, vec2, vec3 (a color), vec4 or bool; `params` sets them by
   *   member name. `uniform float amount;` lines work too (gathered into
   *   the block). No params: no block needed. Declare a float's range with
   *   a trailing comment, `float amount; // 0..1`, and values outside it are
   *   refused; undeclared floats beyond ±1000 get a shader_param_far
   *   lint. NaN, Infinity and values beyond ±1e6 are refused.
   * - Built-ins, no declaration: iv_time (seconds into the clip),
   *   iv_progress (0..1 over the clip), iv_resolution (px of the pass).
   *   Not Shadertoy: no iTime / iResolution / fragCoord / mainImage.
   * - Advanced: `glsl` may open with a `//! iv-meta` header (kept as authored,
   *   not stripped). It can declare multipass rendering (`targets`, `output`,
   *   `passes` with a `vec4 iv_pass_<id>(vec2 uv)` function per pass instead of
   *   a single `main`; an `output.persistent` target feeds last frame back as
   *   the injected `iv_prev` sampler) and typed `inputs` (per member: number,
   *   integer, boolean, color, select with `options`, vec2/3/4) that fix each
   *   param's kind, default, range and options. A bad header (missing a
   *   declared `iv_pass_` function, an undeclared target, a type mismatch) is
   *   refused at build time.
   * A minimal effect (a pulse that `amount` mixes in):
   *
   *     #version 300 es
   *     precision highp float;
   *     uniform sampler2D src;      // the clip's picture, premultiplied alpha, in LINEAR light (not sRGB)
   *     in vec2 v_texcoord;         // 0..1 across the clip, (0,0) top-left
   *     out vec4 outColor;          // write premultiplied rgba
   *     layout(std140) uniform CustomParams {
   *       float amount;             // members are the params: float, vec2, vec3 (a color), vec4, bool
   *     };
   *     void main() {
   *       vec4 c = texture(src, v_texcoord);  // to work in sRGB: pow(c.rgb / max(c.a, 1e-5), vec3(1.0 / 2.2)), then pow(x, vec3(2.2)) * c.a back
   *       float pulse = 0.5 + 0.5 * sin(iv_time * 6.2832);  // built-ins: iv_time (s), iv_progress (0..1), iv_resolution (px)
   *       outColor = vec4(c.rgb * mix(1.0, pulse, amount), c.a);  // keep rgb <= a
   *     }
   *
   *   clip.addCustomEffect(edit.readText("pulse.glsl"), { amount: 0.6 }, "Pulse");
   */
  addCustomEffect(glsl: string, params?: Record<string, ParamValue>, name?: string): Effect;
  /**
   * Track matte: show this clip only where `source` is opaque ("alpha",
   * default) or bright ("luma"); `invert` flips it. `source` is a clip (its
   * whole track becomes the matte) or a track name/handle. The source track
   * is hidden, as the editor's matte picker does.
   */
  matte(source: Clip | string, opts?: { mode?: "alpha" | "luma"; invert?: boolean; softness?: number; grow?: number }): Effect;
  /** Mask: show this clip only inside `shape` (fractions of its box). `feather` 0..0.5; `invert` shows only outside. */
  mask(shape: MaskShape, opts?: { feather?: number; invert?: boolean }): Effect;
  /** A transition at the clip's start ("in") or end ("out"), e.g. a fade from/to nothing. */
  addEdgeTransition<N extends TransitionName>(edge: "in" | "out", type: N, opts?: { length?: Time } & TransitionParams[N]): Clip;

  // Media time (video, audio and nested timeline clips; a video's linked sound follows
  // unless linked: false; a nested clip takes speed and loop (its nested sound speeds
  // with it but cannot loop: loop it with linked: false); freeze is for video clips at
  // normal speed)
  /**
   * Play at `x` times speed over the same span (the clip keeps its place
   * and length and reads more or less of its media). Range 0.25..4.
   * Refused when the media runs out (loop() first).
   */
  speed(x: number, opts?: Linked & { preservePitch?: boolean }): Clip;
  /**
   * Speed that changes over the clip: speed eases linearly from point to
   * point (held before the first and after the last; each 0.25..4). The clip
   * keeps its place and length and reads more or less of its media (refused
   * when the media runs out). Made as the editor's speed points; the
   * linked sound goes silent while the clip has them (the editor's rule).
   * Replaces earlier speed points (and a freeze).
   */
  speedRamp(points: { at: Time; speed: number }[]): Clip;
  /** Repeat the media to fill the clip; `length` also extends the clip (overwrite rules). */
  loop(opts?: { length?: Time } & Linked): Clip;
  /**
   * Freeze frame, as the editor makes it: the frame showing at `at` holds
   * for `length`. `at` is TIMELINE time inside the clip (clip.start ..
   * clip.end, e.g. clip.start.plus(seconds(1))), not clip-local and not a
   * source frame; "tail" is its last frame. To freeze a media frame, find
   * where it shows with clip.toTimeline(source.frames(n)). Holds for `length`
   * (default seconds(1)), inserted there — the rest of the clip and later
   * clips on the track move right. The clip's sound goes silent while it has
   * a freeze (the editor's rule for clips with speed points).
   */
  freeze(at: Time | "tail", opts?: { length?: Time }): Clip;
  /** The media time this clip shows at timeline time `t`: speed, a ramp, reverse and trims counted. */
  toSource(t: Time): SourceTime;
  /** Where on the timeline this clip shows media time `s`; throws InputError when that media is trimmed out. The only way between the two clocks. */
  toTimeline(s: SourceTime | string): Time;
  /** Flip the playback direction over the same span (again: forwards). Not on looping clips (the editor's rule). */
  reverse(opts?: Linked): Clip;
  /**
   * Speed ramp over part of a video clip, as the timeline agent's `retime`
   * op (kind ramp): speed goes from `startSpeed` to `endSpeed` between
   * `from` and `to`, eased by `shape` (default "linear"). Times are
   * clip-local (a marker or another point on the timeline counts from the
   * clip's start). Speeds outside 0.25..4 are clamped (noted). The clip
   * plays the same media in more or less time, so its length changes and
   * later clips on the track move. Composes with the clip's speed points;
   * refused when the range crosses one (use retime()). Its linked sound
   * follows the map when it is the clip's only plain sound, else goes silent.
   * @example clip.ramp({ from: seconds(1), to: seconds(2), startSpeed: 1, endSpeed: 0.25, shape: "ease_in" })
   */
  ramp(opts: { from: Time; to: Time; startSpeed: number; endSpeed: number; shape?: RetimeShape }): Clip;
  /**
   * Constant speed over part of a video clip (`retime` op kinds section and
   * reverse): `speed` 0.25..4, or up to 8 with `reverse: true` (default
   * speed 1 when reversed; out of range is clamped, noted). Clip-local
   * times; the length changes and later clips move, as ramp(). A range
   * covering the whole clip is refused without reverse: use speed().
   * @example clip.retimeRange({ from: seconds(1), to: seconds(2) }, { speed: 0.5 })
   */
  retimeRange(range: { from: Time; to: Time }, opts: { speed?: number; reverse?: boolean }): Clip;
  /**
   * Restate a video clip's whole speed map (`retime` op kind points): at
   * least two points, `at` clip-local and strictly increasing, `source` the
   * media time shown there. Every `source` must lie inside the media the
   * clip already uses (clip.sourceIn .. clip.toSource(clip.end)): a source
   * time outside it is refused. To reach other media frames, slip() the clip
   * first so its source range covers them, then retime. `shape` sets a point's style ("hold" holds its
   * frame until the next point); `handleIn` / `handleOut` are bezier
   * handles in seconds, [time, media time]. A forward segment whose handles
   * reach 0x is refused (use ramp()). The length changes and later clips move.
   * @example clip.retime([{ at: frames(0), source: source.frames(0) }, { at: frames(48), source: source.frames(24) }])
   */
  retime(points: { at: Time; source: SourceTime; shape?: RetimeShape | "hold"; handleIn?: Vec2; handleOut?: Vec2 }[]): Clip;
  /**
   * Clear a video clip's speed points: ramps, ranges, freezes and retime()
   * maps (`retime` op kind reset). The way out before speed(), reverse(),
   * freeze() or slip() on a retimed clip. The clip keeps its length and
   * plays the same media at one constant speed (see inspect().speed); a
   * clip that only shows a frozen frame plays 1x from that frame (refused
   * when the media runs out first).
   * @example clip.resetSpeed().speed(2)
   */
  resetSpeed(): Clip;
  /** Beat grid of this clip's media (`<media>.beats.json` next to the file), in timeline time. Clips at normal speed only. */
  beats(): BeatGrid;

  /** Audio volume in dB, -60..12 (-60 is silence) (a video targets its linked audio). */
  setAudioGain(db: number, opts?: ReplaceAnimation): Clip;
  /** Fade lengths (frames(0) for none) and shapes; `curve` shapes the fade in, `outCurve` the fade out (default: as `curve`). */
  setAudioFades(fadeIn: Time, fadeOut: Time, opts?: { curve?: FadeCurve; outCurve?: FadeCurve }): Clip;
  /** Stereo position: -1 left, 0 center, 1 right. */
  setAudioPan(pan: number, opts?: ReplaceAnimation): Clip;
  /** Silence the clip's sound (its audio clip is disabled; the picture stays). */
  mute(on?: boolean): Clip;
  unmute(): Clip;

  /** Effects on the clip, in stack order. */
  effects(): Effect[];
  /**
   * A camera clip's component (the camera Inspector's Components); see
   * CameraComponentParams. One of each type per camera: a second is
   * refused (change the one there is).
   */
  addComponent<N extends CameraComponentName>(component: N, params?: CameraComponentParams[N]): CameraComponent;
  /** A camera clip's components, in the order they run; [] for other clips. */
  components(): CameraComponent[];
  /**
   * Animate a title's letters, lines or whole text in, out or through (the
   * editor's text Animation). A preset, a { from } state each unit moves
   * from (to, for play: "out"; through, for "through"), or a list of layers,
   * each on its own clock; `opts` are every layer's defaults. Replaces the
   * title's animation. Times are lengths (frames, seconds, beats):
   *     title.animateText("slide_up", { by: "character", order: "center", each: frames(9), total: beats(1) });
   *     title.animateText({ from: { opacity: 0, blur: 24, offset: [0, 40], scale: 0.6, rotation: -8 } }, { by: "line", gap: frames(4) });
   *     title.animateText([{ from: { opacity: 0 } }, { from: { blur: 16 }, by: "line", total: beats(2) }]);
   *     title.animateText("blur", { play: "through", progress: [{ at: frames(0), value: 0 }, { at: beats(2), value: 0.5 }, { at: beats(3), value: 0.5 }, { at: beats(4), value: 1 }] });
   * The engine animates the whole text (no part of it: split a part into its
   * own title); by "word" is for captions; pop, radial_blur and shake play
   * alone. A shader on a title is refused: a one-cue caption takes
   * caps.animate("shader"). bounds() stay the text at rest.
   */
  animateText(motion: TextAnimationPreset | TextAnimationLayer | (TextAnimationPreset | TextAnimationLayer)[], opts?: TextAnimationOptions): Clip;
  /** Remove the title's letter/line animation (and its keyed progress). */
  clearTextAnimation(): Clip;
  /** Change a text clip's text and/or style (e.g. swap fonts). Unset keys keep their value; stroke/shadow: false turns them off. */
  setText(text: string, style?: TextStyle): Clip;
  setText(style: TextStyle): Clip;
  /**
   * Style part of a text clip, addressed by its content:
   * t.style("KICKS", { color: "#fed700" }), t.style({ word: 2 }, { underline: true }),
   * t.style({ match: /vol\.\s\d+/ }, { fontWeight: 800 }). The first match;
   * { all: true } (or a /g regex) styles every match. Styles of one kind
   * on the same part replace each other. Kept by setText on unchanged text.
   * On a captions clip (e.g. from tl.clips()) it styles captions like
   * edit.captions.of(clip).style(...), for a string or `{ match }` target;
   * `{ word }` / `{ line }` are refused there (use `{ cue, word }` on Captions).
   */
  style(target: TextTarget, style: RangeStyle, opts?: { all?: boolean }): Clip;
  /**
   * A built-in text style preset (size, weight, color, case, box, alignment,
   * position, stroke, shadow) replaces the title's look; `overrides` go on
   * top. font, lineSpacing and tracking are not part of a preset (setText).
   * Refused on other clips. t.applyStyle("poster_bold", { color: "#00e5ff" })
   */
  applyStyle(preset: TextStylePreset, overrides?: TextStyle): Clip;
  /**
   * Where the picture is at clip-local `at` (default its first frame), keyframes included. Text needs its font file.
   * Zoom and rotation turn about the anchor (setAnchor). A shape drawn with vertices reports the
   * paths' own box (path transforms included), not the clip's box around them.
   * By default the letters / the picture only. `includeEffects: true` also counts what is drawn past them:
   * a text's stroke width and shadow (blur + offset), and enabled "drop_shadow" effects (blur + spread, shifted by the offset).
   * check()'s text_off_canvas uses this, so a shadow that leaves the frame is reported.
   */
  bounds(opts?: { at?: Time; includeEffects?: boolean }): Bounds;
  /**
   * Move the clip so its box sits on whole pixels wherever it rests drawn 1:1
   * (zoom 1, no rotation): a still position moves once, an animated one key by
   * key, only the keys where it is drawn 1:1. Moments that are zoomed or rotated
   * are left as they are (resampled anyway) and named in a `snap_partial` note;
   * never refused for that. Opt-in: nothing is snapped by itself; the
   * text_subpixel lint says when text sits off whole pixels (and looks soft).
   */
  snapToPixels(): Clip;
  /** Move to an anchor of the frame or the safe area (a still position). */
  place(anchor: Anchor, opts?: { margin?: Length | [Length, Length]; within?: "frame" | "safe" } & ReplaceAnimation): Clip;

  // Structural edits (the editor's rules; see "Collisions" above)
  /** Move to `at` (and optionally another track). Overwrites by default; "insert" pushes later clips. */
  moveTo(at: Time, opts?: { track?: string; mode?: EditMode } & Linked): Clip;
  /** New start/end. Overwrite by default (grows up to the neighbour, shrinking leaves a gap); `ripple: true` moves what follows. Media clips shift their source in-point with the start. */
  trim(opts: { start?: Time; end?: Time; ripple?: boolean } & Linked): Clip;
  /** Cut at a time inside the clip; this clip keeps the left part, the right part is returned. */
  split(at: Time, opts?: Linked): Clip;
  /**
   * Delete and leave a gap (nothing else moves). Linked clips go too: deleting
   * a video deletes its linked sound (and the reverse) unless `{ linked: false }`.
   * So in `for (const c of tl.clips()) c.delete()` the sound's handle is already
   * gone when the loop reaches it: that delete does nothing (a
   * `removed_with_link` note), and other calls on it are refused.
   */
  delete(opts?: Linked): void;
  /** Delete and close the gap: later clips on the track move left. Linked clips go too, as delete(). */
  rippleDelete(opts?: Linked): void;
  /** Move the cut at the clip's end ("out") or start ("in") to `to`: one neighbour gets longer, the other shorter, nothing else moves. */
  roll(edge: "in" | "out", to: Time, opts?: Linked): Clip;
  /** Show other material in the same span: `by` is source time, e.g. source.seconds(0.5) (negative = earlier). Clamped to the media (noted in the receipt). */
  slip(by: SourceTime, opts?: Linked): Clip;
  /** A copy at `at` (default: right after this clip) on `track` (default the same); inserts by default. */
  duplicate(opts?: { at?: Time; track?: string; mode?: EditMode } & Linked): Clip;
  /** Disabled clips stay on the timeline but do not play. */
  setEnabled(enabled: boolean, opts?: Linked): Clip;
  enable(opts?: Linked): Clip;
  disable(opts?: Linked): Clip;
  /** Separate a video from its sound so they edit independently. */
  unlink(): Clip;
  /**
   * Link this clip with `others` into one group, so they move, trim and split
   * together (any clips: a picture and its sound, or two pictures). A clip
   * leaves the group it was in; a partner left alone is unlinked. Already
   * one exact group: no change, noted. Clips on locked tracks are refused.
   * @example
   * shot.link(voice);
   */
  link(others: Clip | Clip[]): Clip;
  /**
   * Copy `from`'s attributes onto this clip, as the editor's Paste Attributes:
   * `only` the listed categories (default: every one of the source's kind;
   * "audio" for a sound, the rest for a picture). "effects" includes the
   * grades. `keyframes`: "maintain_timing" (default) keeps the source's
   * key times; "stretch_to_fit" scales them to this clip's length. Pasting a
   * clip onto itself, a sound onto a picture (or the reverse), or onto a
   * locked track changes nothing and is noted in the receipt.
   * @example
   * b.pasteAttributes(a, { only: ["transform", "effects"] });
   */
  pasteAttributes(from: Clip, opts?: { only?: PasteCategory[]; keyframes?: "maintain_timing" | "stretch_to_fit" }): Clip;
  /** Re-read fields from the edit. */
  refresh(): Clip;

  // Motion (bakes to keyframes, merged by the rule in the header)
  /**
   * Animate transform properties. Each takes [from, to] (or more values,
   * spread evenly over `over`) or explicit [{ at, value, ease }] (`at` from
   * the animation's `at`). Zoom values may be numbers; position/anchor are
   * [x, y]. `at` is clip-local (a beat counts from the clip's start).
   */
  animate(props: AnimProps, opts?: AnimateOptions): Clip;
  /**
   * Seeded random motion around the property's value: a key every
   * 1/`frequency` s (default 2 per second), offsets up to `amount` (px,
   * degrees, zoom or opacity units; [x, y] for position), "ease_in_out"
   * between keys, first and last keys on the value itself. Same seed, same
   * keys. Over keys already there (with replaceAnimation) it wiggles on top.
   */
  wiggle(property: Property, opts: { amount: number | Vec2; frequency?: number; seed?: number; at?: Time; over?: Time } & ReplaceAnimation): Clip;
  /** Zoom hit at `at`: zoom x `amount` (default 1.2), easing back over `over` (default 0.25 s, "ease_out"). Writes zoom keys at `at` (and a hold key the frame before when `at` > 0) and at `at` + `over`. */
  punchIn(opts?: { amount?: number; at?: Time; over?: Time; ease?: Ease } & ReplaceAnimation): Clip;
  /** Enter from just outside the frame on side `from` (default "left") to its position, over `over` (default 0.5 s, "ease_out"). Writes 2 position keys. */
  slideIn(opts?: { from?: "left" | "right" | "top" | "bottom"; at?: Time; over?: Time; ease?: Ease } & ReplaceAnimation): Clip;
  /** Scale up from 0 to its zoom over `over` (default 0.4 s, "back_out": a small overshoot) while fading in over the first third. Writes 2 zoom keys and 2 opacity keys. */
  popIn(opts?: { at?: Time; over?: Time; ease?: Ease } & ReplaceAnimation): Clip;
  /** Opacity 0 to its value over `over` (default 0.5 s, "linear") from `at` (default 0). Writes 2 opacity keys. Picture only (sound: setAudioFades). */
  fadeIn(opts?: { at?: Time; over?: Time; ease?: Ease } & ReplaceAnimation): Clip;
  /** Opacity from its value to 0 over `over` (default 0.5 s), ending at the clip's end (or starting at `at`). Writes 2 opacity keys. */
  fadeOut(opts?: { at?: Time; over?: Time; ease?: Ease } & ReplaceAnimation): Clip;
  /** Slow push: zoom x from.scale to x to.scale (default 1 to 1.15) and position + pan ([x, y] px), over the clip (or `over`), "linear". Writes 2 zoom keys (and 2 position keys with a pan). */
  kenBurns(opts?: { from?: { scale?: number; pan?: Vec2 }; to?: { scale?: number; pan?: Vec2 }; at?: Time; over?: Time; ease?: Ease } & ReplaceAnimation): Clip;
  /** Move on a circle/ellipse: position keys from `from` to `to` (default the whole clip), stepsPerTurn per turn. phase in degrees. */
  orbit(o?: { r?: number; ry?: number; center?: Vec2; turns?: number; phase?: number; from?: Time; to?: Time; stepsPerTurn?: number } & ReplaceAnimation): Clip;
  /** Tilt (a still rotation) + drop shadow + zoom punch: zoom keys `zoom` x `punch` at 0 easing to `zoom` at `settle` (default frames(4)). `zoom` defaults to the clip's own zoom, so a clip sized by width keeps its size. A clip that already has a shadow (text shadow or a "drop_shadow" effect) keeps it unless `shadow` is given. */
  stamp(o?: { rotation?: number; punch?: number; settle?: Time; zoom?: number; shadow?: Record<string, ParamValue> } & ReplaceAnimation): Clip;

  // Shapes and nesting
  /** A shape clip's paths, drawn first to last. */
  paths(): ShapePath[];
  /** Another path in a shape clip (drawn above the others). Presets fill a square box centred in the clip. */
  addPath(preset: PathPreset, opts?: PathOptions): ShapePath;
  /** A nested clip: replace it with copies of its contents, cut to its span (the editor's Unfold). Returns the new clips. */
  unnest(): Clip[];
  /** A nested clip: give it its own copy of the timeline it shows, so editing that copy changes only this clip. */
  makeUnique(): Clip;
}

/** One path of a shape clip (handle "p3"). */
interface ShapePath {
  readonly id: string;
  readonly clip: Clip;
  /** The preset it was made from, or "path". */
  readonly kind: PathPreset;
  readonly name: string;
  /** Public props; set(inspect()) changes nothing. */
  inspect(): PathOptions & { readonly id: string; readonly clip: string; readonly kind: PathPreset };
  /** Change props as inspect() prints them (nested: stroke, trim). */
  set(props: PathOptions, opts?: ReplaceAnimation): ShapePath;
  /**
   * Animate one property (clip-local `at`): "trim_start" | "trim_end" |
   * "trim_offset" (percent), "stroke_width" | "dash_offset" (px),
   * "position" | "scale" | "rotation" | "opacity" (the path transform), or
   * "vertices" (points are vertex lists: the outline morphs).
   */
  setKeyframes(property: PathProperty, points: KeyframePoint<number | Vec2 | Vertex[]>[]): ShapePath;
  keyframes(property: PathProperty): KeyframePoint<number | Vec2 | Vertex[]>[] | null;
  /**
   * Single keys of property (as keyframes(property) reads them; `at` is a
   * key's clip-local time). The curve is rewritten as setKeyframes would.
   */
  addKeyframe(property: PathProperty, key: NewKeyframe<number | Vec2 | Vertex[]>): ShapePath;
  /** Move one key in time and/or change its value. */
  moveKeyframe(property: PathProperty, at: Time, change: KeyframeChange<number | Vec2 | Vertex[]>): ShapePath;
  /** Delete one key; deleting the last leaves the property still at its value. */
  deleteKeyframe(property: PathProperty, at: Time): ShapePath;
  /** The ease of the stretch leaving the key at `at` (not the last key). Elastic, bounce and springs bake as in setKeyframes. */
  setKeyframeEase(property: PathProperty, at: Time, ease: Ease): ShapePath;
  /** A shape keeps at least one path. */
  remove(): void;
}

type PathProperty = "vertices" | "trim_start" | "trim_end" | "trim_offset" | "stroke_width" | "dash_offset" | "position" | "rotation" | "scale" | "opacity";

interface Rng {
  /** 0 <= x < 1 */
  next(): number;
  range(lo: number, hi: number): number;
  /** Integer in lo..hi inclusive. */
  int(lo: number, hi: number): number;
  pick<T>(list: T[]): T;
  shuffle<T>(list: T[]): T[];
}

interface Cursor {
  media(asset: string | HostHandle, opts?: Omit<MediaOptions, "at">): Clip;
  text(text: string, opts?: Omit<Placement, "at"> & TextLayout): Clip;
  shape(preset: PathPreset, opts?: Omit<ShapeOptions, "at">): Clip;
  adjustment(opts?: Omit<Placement, "at">): Clip;
}

interface CatalogParam {
  name: string;
  type: "number" | "integer" | "[x, y]" | "color" | "boolean" | "choice" | "string";
  description: string;
  default: ParamValue;
  min?: number | Vec2;
  max?: number | Vec2;
  choices?: string[];
}

interface Catalog {
  effects: { name: EffectName; description: string; params: CatalogParam[] }[];
  transitions: { name: TransitionName; description: string; params: CatalogParam[] }[];
  /** Audio params carry `unit` (dB, ms, Hz, %, ...). */
  audio_effects: { name: AudioEffectName; description: string; params: (Omit<CatalogParam, "type"> & { type: "number" | "boolean" | "choice"; unit?: string })[] }[];
  /** clip.addComponent on a 3D camera clip. */
  camera_components: { name: CameraComponentName; description: string; params: CatalogParam[] }[];
  /** Grade settings (types also "curve", "[r, g, b]", "path"); `animatable` lists the ones that take keyframes. */
  grade: { description: string; params: (Omit<CatalogParam, "type"> & { type: string })[]; animatable: string[] };
  blend_modes: BlendMode[];
  /** clip.addCustomEffect: the shader contract in one line, and a complete minimal shader. */
  custom_effect: { description: string; rules: string; template: string };
  /** tl.addCustomTransition: the transition contract in one line, and a complete minimal transition. */
  custom_transition: { description: string; rules: string; template: string };
  /** caps.animate("shader") presets: the unit each was written for. */
  text_shaders: { name: TextShaderPreset; by: "character" | "word" | "line" | "cue"; description: string }[];
  /** caps.animate("shader"): the text shader contract in one line, and a complete shader. */
  text_shader: { description: string; rules: string; template: string };
  /** caps.applyPreset built-ins; `accent` says what the first-word accent does. */
  caption_presets: { name: CaptionPresetName; description: string; accent?: string }[];
  /** clip.applyStyle presets. */
  text_style_presets: { name: TextStylePreset; description: string }[];
}

type TrackKind = "video" | "audio" | "bus";

/**
 * A track: video, audio, a bus (an audio submix: tracks route to it with
 * `output`, or feed it with send()), or the edit's main output
 * (edit.mainOutput()). Passed wherever a track name is accepted.
 */
interface Track {
  /** Opaque handle (e.g. "V2", "A1", "B1", "main"). */
  readonly id: string;
  readonly name: string;
  readonly kind: TrackKind | "main";
  /** 0 = bottom of the stack (video) / first (audio, buses). */
  readonly position: number;
  readonly clips: number;
  readonly locked: boolean;
  /** Video tracks. */
  readonly hidden?: boolean;
  /** Audio tracks, buses, main. */
  readonly muted?: boolean;
  /** Public props; set(inspect()) changes nothing. */
  inspect(): TrackProps;
  /** Change props as inspect() prints them. */
  set(props: TrackProps): Track;
  /** A video track: a picture effect over everything on it (one value per param). Audio tracks, buses, main: an audio effect. */
  addEffect<N extends EffectName>(effect: N, params?: EffectParams[N]): Effect;
  /** By the engine's name (EffectEngineNames): the same effect as its public name. */
  addEffect<N extends EffectEngineName>(effect: N, params?: EffectParams[EffectEngineNames[N]]): Effect;
  addEffect<N extends AudioEffectName>(effect: N, params?: AudioEffectParams[N]): Effect;
  effects(): Effect[];
  /** A video track's grade (over everything on it). */
  grade(settings?: GradeSettings): Effect;
  applyLut(lut: string | BinLut | null, opts?: { strength?: number }): Effect;
  /** Audio tracks and buses: also feed `bus` (as well as the output), at `levelDb` (default 0), after the fader unless `preFader`; `{ remove: true }` removes the send. */
  send(bus: Track | string, opts?: { levelDb?: number; preFader?: boolean; remove?: boolean }): Track;
  /** The editor's delete: its clips go with it. A bus's feeds go to main. Refused while locked. */
  delete(): void;
}

/** A track's public props (which keys exist depends on the kind). id, kind, clips, effects and sends are read-only. */
interface TrackProps {
  readonly id?: string;
  readonly kind?: TrackKind | "main";
  name?: string;
  /** 0 = bottom (video) / first (audio, buses). Setting it reorders. */
  position?: number;
  readonly clips?: number;
  /** Video. */
  hidden?: boolean;
  /** Video, audio. */
  locked?: boolean;
  /** Video: 0..1 over the whole track. */
  opacity?: number;
  /** Video: how the track blends over the ones below. */
  blendMode?: BlendMode;
  /** Audio, buses, main. */
  muted?: boolean;
  /** Audio, buses. */
  solo?: boolean;
  /** Audio, buses, main: fader in dB (-60..12; -60 is silence). */
  gainDb?: number;
  /** Audio, buses, main: -1 left .. 1 right. */
  pan?: number;
  /** Audio, buses: "main" or a bus handle. */
  output?: string;
  /** Audio: this track keys the timeline's sidechain effects (ducker, compressor external_sidechain); one per timeline. */
  sidechain?: boolean;
  readonly sends?: { to: string; level_db: number; pre_fader: boolean }[];
  readonly effects?: { id: string; name: string; enabled: boolean; params: Record<string, unknown> }[];
}

/** A transition at a cut ("cut") or a clip edge ("in"/"out"). */
/** Easing names (a custom transition's `easing`). */
type Easing = 
  | "linear"
  | "quadratic_in"
  | "quadratic_out"
  | "quadratic_in_out"
  | "cubic_in"
  | "cubic_out"
  | "cubic_in_out"
  | "quartic_in"
  | "quartic_out"
  | "quartic_in_out"
  | "quintic_in"
  | "quintic_out"
  | "quintic_in_out"
  | "sine_in"
  | "sine_out"
  | "sine_in_out"
  | "circular_in"
  | "circular_out"
  | "circular_in_out"
  | "exponential_in"
  | "exponential_out"
  | "exponential_in_out"
  | "elastic_in"
  | "elastic_out"
  | "elastic_in_out"
  | "back_in"
  | "back_out"
  | "back_in_out"
  | "bounce_in"
  | "bounce_out"
  | "bounce_in_out";

interface CustomTransitionOptions extends TransitionTiming {
  /** Values for the shader's own params (its uniform-block members), by member name. Floats also take keyframes (ParamKeys, `at` from the transition's start). */
  params?: Record<string, ParamValue | ParamKeys>;
  /** How iv_progress is eased before the shader runs. Default "linear". */
  easing?: Easing;
  /** The title the editor shows. Default "Script transition". */
  name?: string;
}

interface Transition {
  /** Opaque handle (e.g. "x1"). */
  readonly id: string;
  /** A built-in transition's name, "custom" for a GLSL one (addCustomTransition), or "other". */
  readonly name: TransitionName | "custom" | "other";
  /** A custom transition's title (its `name` option; a bin transition: its shader's title); absent on built-ins. */
  readonly title?: string;
  /** A transition placed from the bin: that row's handle (while the row is in the bin); absent otherwise. */
  readonly asset?: string;
  /** Current parameter values by name; an animated number reads `{ keyframes }`, `at` from the transition's start. */
  readonly params: Record<string, unknown>;
  readonly track: string;
  /** The cut (an edge transition: the clip edge). */
  readonly at: Time;
  readonly in: Time;
  readonly out: Time;
  readonly scope: "cut" | "in" | "out";
  /** Clip handles either side (null at an edge). */
  readonly left: string | null;
  readonly right: string | null;
  /** Change parameters (names as in TransitionParams); a number param also takes keyframes (ParamKeys). */
  set(params: Record<string, ParamValue | ParamKeys>): Transition;
  /**
   * Animate one number param over the transition: `at` counts from the
   * transition's start (frames(0) = progress 0, up to its length). The
   * filter reads params at timeline time, so the keys are stored at the
   * start plus `at`; a script edit that moves the transition (a move, a
   * ripple, a resize that changes `in`) moves its keys with it. The editor
   * has no lanes for transition params and leaves the keys where they are
   * if the cut is dragged there.
   */
  setKeyframes(param: string, points: KeyframePoint<number>[]): Transition;
  /** New length: `length` in total (split evenly), or `in`/`out` around the cut; edge transitions take `length`. Limited by the clips either side. */
  resize(opts: TransitionTiming): Transition;
  /** Remove it; the clips either side stay as they are. */
  remove(): void;
}

/** A named, colored point (or span) on the timeline (handle "mk1"). */
interface Marker {
  readonly id: string;
  readonly at: Time;
  /** frames(0) for a point marker. */
  readonly length: Time;
  readonly name: string;
  /** "#rrggbb", or null for the default. */
  readonly color: string | null;
  readonly note: string;
  set(props: { at?: Time; length?: Time; name?: string; color?: Color | null; note?: string }): Marker;
  remove(): void;
}

/** A canvas guide line (handle "gd1"). */
interface Guide {
  readonly id: string;
  readonly orientation: "vertical" | "horizontal";
  /** px from the canvas center (+x right / +y down). */
  readonly position: number;
  readonly locked: boolean;
  readonly color: string | null;
  set(props: { orientation?: "vertical" | "horizontal"; position?: number; locked?: boolean; color?: Color | null }): Guide;
  remove(): void;
}

interface ClipFilter {
  /** Track name or id. */
  track?: string;
  kind?: ClipKind;
  name?: string;
  asset?: string;
  /** Substring of a text clip's text. */
  text?: string;
  /** Clips covering this time. */
  at?: Time;
}

/** A timeline's settings (`tl.inspect()`); `tl.set` changes background and duration. */
interface TimelineProps {
  readonly name: string;
  readonly fps: number;
  readonly size: Vec2;
  background: string;
  duration: Time;
  /**
   * Set only (read it as tl.workingSpace): the working color space (the
   * Timeline inspector's), "rec709" (display-referred, the default) or
   * "rec2020" (scene-referred linear on a 16-bit float chain, for HDR and
   * log sources). Renders use it at once; the desktop editor switches after
   * a relaunch (the receipt notes it).
   */
  workingSpace?: WorkingSpace;
}

type WorkingSpace = "rec709" | "rec2020";

interface Timeline {
  /** Opaque handle (e.g. "T1"). */
  readonly id: string;
  /** "build" when building a new edit, "edit" when scripting an existing one. */
  readonly mode: "build" | "edit";
  readonly name: string;
  readonly fps: number;
  readonly size: Vec2;
  readonly width: number;
  readonly height: number;
  /** The set duration, else where the last clip ends. */
  readonly duration: Time;

  /** Set the length (clips placed later default to running until it and may not pass it). Refused if a clip already runs past it. */
  setDuration(t: Time): Timeline;
  /** The background color ("#rrggbb"): what shows where no clip covers the frame. */
  readonly background: string;
  /** The working color space, read on access; change it with tl.set({ workingSpace }). */
  readonly workingSpace: WorkingSpace;
  /** The timeline folder it is filed in (a TimelineFolder handle), or null at the top level; read on access. Move it with edit.moveTimelines. */
  readonly folder: string | null;
  /** Change the background color after the fact ("#101820", [r, g, b] or [r, g, b, a] in 0..1). */
  setBackground(color: Color): Timeline;
  /** The timeline's settings as set() takes them. */
  inspect(): TimelineProps;
  /** Change background and/or duration; the other keys of inspect() are accepted unchanged (set(inspect()) changes nothing). */
  set(props: Partial<TimelineProps>): Timeline;

  /** Tracks, bottom first (video, then audio, then buses). */
  tracks(kind?: TrackKind): Track[];
  /** Compact text tree: one line per track (top first), clips with handles and times; `*` marks the selection. Bounded. */
  describe(opts?: { maxBytes?: number }): string;
  /**
   * The host's lint, read in process over the edit as this run has it: a `voice-decay` finding
   * names the voiceover track, the clips it covers and where, and ranks its remedies.
   * Not a host call and nothing is rendered or made, so it works after edits: detect, level,
   * and re-lint in one run.
   *
   *     const before = await tl.lint({ rules: ["voice-decay"] });
   *     if (before.pending.length) return before;   // the host fetches what is missing and reruns
   *     const levelled = new Set<string>();   // two findings can sit on one clip, and a clip takes one leveler
   *     for (const f of before.findings)
   *       for (const clip of f.clips)
   *         if (!levelled.has(clip.id) && !clip.effects().some((e) => e.name === "voice_leveler")) {
   *           levelled.add(clip.id);
   *           clip.addEffect("voice_leveler");
   *         }
   *     const after = await tl.lint({ rules: ["voice-decay"] });   // reads this run's own changes
   *
   * Times are on this timeline; `clip.toSource(f.range.start)` is the clip's own time there.
   * A read whose clip already has a Voice leveler (enabled or not) is not offered another: its
   * `remedies` lack `voice_leveler` and `notes` says so; enable that row or raise its Amount.
   * `pending` lists what the host could not read (return and let it fetch, then rerun); a
   * `status` of "incomplete" is never a pass. A host with no lint rejects with NotAvailableError
   * (`no_lint_source`). An unknown rule is refused with the legal ones.
   */
  lint(opts?: LintOptions): Promise<LintResult>;
  /** Clips (bottom track first, then by start), optionally filtered. */
  clips(filter?: ClipFilter): Clip[];
  clip(id: string): Clip;
  transitions(): Transition[];

  /** A named track (created now when there is none, which fixes its place in the stack). "bus": an audio submix. */
  track(name: string, kind?: TrackKind): Track;

  placeMedia(asset: MediaRef | HostHandle, opts?: MediaOptions): Clip;
  addText(text: string, opts?: TextOptions): Clip;
  /** A shape clip with one path: a preset, or "path" with `vertices`. `fill` / `stroke.color` take a Paint: a color, or a linear or radial gradient (a glow: radial from a color to transparent). Animate it through clip.paths()[0]. */
  addShape(preset: PathPreset, opts?: ShapeOptions): Clip;
  /** A clip whose effects apply to everything below it. */
  addAdjustment(opts?: Placement): Clip;
  /**
   * A 3D camera clip (the editor's Insert camera) at the default pose: it
   * frames the canvas 1:1, so it changes no picture until it is moved. It
   * views the timeline's 3D clips; give it components with addComponent.
   */
  addCamera(opts?: Placement): Clip;
  /**
   * Place another timeline of this edit as ONE clip (a precomp): its
   * transforms, effects and transitions apply to the whole nested picture.
   * Length defaults to the nested timeline's duration. The clip's box is the
   * nested timeline's canvas (a 1080x1920 timeline is a 1080x1920 box,
   * centred, whatever this canvas is): width/height, bounds(), crop and
   * mask fractions all measure that box, which is exactly the nested picture.
   */
  place(nested: Timeline, opts?: Omit<Placement, "name">): Clip;
  /**
   * Group clips into a new nested timeline (named `name`) and put one clip
   * in their place, as the editor's Nest does. Returns the group clip.
   */
  group(clips: Clip[], opts?: { name?: string }): Clip;
  /** Join two clips that touch (right.start equals left.end) on one track. */
  addTransition<N extends TransitionName>(left: Clip, right: Clip, type: N, opts?: TransitionTiming & TransitionParams[N]): Transition;
  /**
   * A transition from the bin (edit.bin.transitions(): a library item added
   * to the editor, or a catalog row the edit carries), by record or handle,
   * at the cut between two clips that touch: the row's shader and params,
   * placed and sized like a built-in, as the editor's transitions panel
   * drops it. Params by the row's own names (as in its `params`), and
   * `easing`. Reads back with name "custom", the row's title, and `asset`
   * (the row's handle).
   *
   *     const [radial] = edit.bin.transitions();
   *     tl.addTransition(a, b, "ef1", { length: seconds(1) });
   *     tl.addTransition(b, c, radial, { easing: "cubic_in_out" });
   */
  addTransition(left: Clip, right: Clip, type: BinTransition | BinTransitionHandle, opts?: BinTransitionOptions): Transition;
  /**
   * Your own GLSL transition at the cut between two clips that touch on one
   * track (placed and sized exactly like addTransition; reads back with
   * name "custom"; transition.set({ ... }) changes its params and easing).
   * `glsl` is the source, or a path to a .glsl file next to the script.
   *
   * The editor's transition contract, GLSL ES 300:
   * - `uniform sampler2D from;` is the outgoing clip (left of the cut),
   *   `uniform sampler2D to;` the incoming one; both premultiplied and in
   *   LINEAR light. outColor is premultiplied too. readTex(tex, uv) samples
   *   with transparent black outside 0..1.
   * - iv_progress runs 0..1 over the transition, already eased by
   *   `easing`; also iv_time, iv_duration (s), iv_resolution (px) and
   *   iv_scope (0: both clips, 1: only `to`, 2: only `from`).
   * - Provided helpers (do not redefine): readTex, iv_temporal_mix(a, b, t)
   *   (a display-referred crossfade), blend, getP, iv_aspect, iv_hash,
   *   iv_noise, iv_fbm.
   * - Params: members of ONE anonymous uniform block whose header
   *   `layout(std140) uniform CustomParams {` is a line of its own, closed
   *   with `};` (or `uniform float x;` lines, gathered into it). Ranges as
   *   on custom effects: `float softness; // 0..0.5`. `easing` is reserved.
   * - Compile errors name the shader line and column (of what you wrote)
   *   and show this template.
   * - Advanced: `glsl` may open with a `//! iv-meta` header (kept as authored).
   *   It can declare multipass rendering (`targets`, `output`, `passes` with a
   *   `vec4 iv_pass_<id>(vec2 uv)` function per pass) and typed `inputs` that
   *   fix each param's kind, default, range and options; a bad header is
   *   refused at build time. A `persistent` (backbuffer) target is NOT allowed
   *   on a transition.
   *
   *     #version 300 es
   *     precision highp float;
   *     uniform sampler2D from;     // the outgoing clip (left of the cut), premultiplied, LINEAR light
   *     uniform sampler2D to;       // the incoming clip (right of the cut)
   *     in vec2 v_texcoord;         // 0..1 across the frame, (0,0) top-left
   *     out vec4 outColor;          // write premultiplied rgba
   *     layout(std140) uniform CustomParams {
   *       float softness;           // 0..0.5  members are the params: float, vec2, vec3 (a color), vec4, bool
   *     };
   *     void main() {
   *       float p = iv_progress * (1.0 + 2.0 * softness) - softness;  // iv_progress: 0..1 over the transition, already eased
   *       float edge = smoothstep(p - softness, p + softness, v_texcoord.x);
   *       outColor = mix(readTex(to, v_texcoord), readTex(from, v_texcoord), edge);  // readTex: a provided helper
   *     }
   *
   *   tl.addCustomTransition(a, b, "wipe.glsl", { length: seconds(1), params: { softness: 0.1 }, easing: "cubic_in_out" });
   */
  addCustomTransition(left: Clip, right: Clip, glsl: string, opts?: CustomTransitionOptions): Transition;
  /**
   * Dip to a color (a fade to black and back) between two clips that touch
   * on one track: `left` fades into `color` (default "#000000"), then the
   * color into `right`, over `length` centered on the cut (default half a
   * second each side). It is the editor's transition for it (Flash at the
   * cut, reads back as "flash"); `easing` defaults to "linear", so the color
   * holds a moment at the cut.
   *   tl.dip(a, b, { length: frames(16) });                 // dip to black
   *   tl.dip(a, b, { color: "#ffffff", length: frames(8) }); // dip to white
   */
  dip(left: Clip, right: Clip, opts?: { color?: Color; length?: Time; easing?: TransitionParams["flash"]["easing"] }): Transition;
  /**
   * Crossfade two sounds that touch on one track (video clips: their sound):
   * both play across the cut for `length` (default seconds(0.5)), shaped by
   * `curve` (default "constant_power"); `align` places the overlap "center"
   * (default), "start" or "end" of the cut. Clips do not move; the overlap
   * reads media past their edges (a note says when there is not enough;
   * `trim: true` trims the clips for it, as the editor's Trim Clips).
   */
  crossfade(left: Clip, right: Clip, opts?: { length?: Time; curve?: FadeCurve; align?: "start" | "center" | "end"; trim?: boolean }): Timeline;
  /** A marker at `at` (a span with `length`). */
  addMarker(at: Time, opts?: { name?: string; color?: Color; length?: Time; note?: string }): Marker;
  /** Markers, in time order. */
  markers(): Marker[];
  /** A time string as a Time on this timeline: tl.time("Outro@end"), tl.time("marker:drop"). */
  time(expr: TimeString): Time;
  /** A guide line: `position` px from the canvas center along x (vertical) or y (horizontal). */
  addGuide(orientation: "vertical" | "horizontal", position: number, opts?: { locked?: boolean; color?: Color }): Guide;
  guides(): Guide[];
  /** The work area (the span the editor plays and exports): [start, end), or null to clear. */
  setWorkArea(start: Time | null, end?: Time): Timeline;
  readonly workArea: { start: Time; end: Time } | null;
  /** A copy of this timeline (tracks, clips, effects, mix) named `name` (default "<name> copy"). */
  duplicate(opts?: { name?: string }): Timeline;
  /** Open empty time at `at` on every unlocked track (or `tracks`): what is there is cut, everything after moves right (the editor's Insert Time). */
  insertTime(at: Time, length: Time, opts?: { tracks?: (Track | string)[] }): Timeline;
  /** Remove [start, end) from every unlocked track (or `tracks`), cutting clips at the edges; `closeGap` (default true) pulls what follows left, false leaves the time empty (clears the range). */
  deleteTime(start: Time, end: Time, opts?: { closeGap?: boolean; tracks?: (Track | string)[] }): Timeline;
  /**
   * Duck `music` under other sound: its audio track's volume dips by
   * `depthDb` (default -12, within -40..0; a positive value is read as its
   * attenuation, so 12 means -12 dB) across each `under` range, ramping
   * down over `attack` before it and back up over `release` after it (at
   * least one frame each). `music` is an audio track, or a clip whose sound's
   * track is used. `under` is a track (the extents of its clips), a clip, a
   * list of clips, or `{ from, to }` timeline ranges; `[]` clears the duck.
   * The duck replaces the track's whole volume lane, so a track with volume
   * keyframes set by hand is refused. Returns the music track.
   * Under a track it ducks under the track's clips, not its words: for
   * speech, pass ranges, e.g. `caps.cues().map((c) => ({ from: c.at, to: c.end }))`.
   * @example
   * tl.duck(music, { under: voice, depthDb: -15, attack: frames(6), release: frames(12) });
   */
  duck(music: Track | Clip, opts: { under: Track | Clip | Clip[] | { from: Time; to: Time }[]; depthDb?: number; attack?: Time; release?: Time }): Track;

  /** The safe area: set its margin (px or %, one or [x, y]; default "5%") for within: "safe" / area: "safe" in this run; returns it. */
  safeArea(margin?: Length | [Length, Length]): Rect;
  /**
   * The timeline's step clock, for the stepping calls after it in this run
   * (animate's `step`, onTwos). Stepped keys change on timeline frames where
   * (frame - origin) % step == 0, so every stepped clip changes on the same
   * frames whatever frame it starts on. `origin`: a point on the timeline
   * (default frames(0)); `every`: onTwos' default step (default frames(2)).
   */
  stepClock(opts: { origin?: Time; every?: Time }): Timeline;
  /**
   * Lay clips out in `cols` x `rows` equal cells (row by row; default a
   * near-square grid) inside `area` (default the frame), `gap` apart and
   * `padding` from its edges (px or %, one or [x, y]). Each clip is scaled
   * to fit its cell (fit: "contain", default) or kept at its size ("none"),
   * and centred in it. A grid that cannot fit says the size that would.
   */
  grid(clips: Clip[], opts?: { cols?: number; rows?: number; gap?: Length | [Length, Length]; padding?: Length | [Length, Length]; area?: Area; fit?: "contain" | "none" } & ReplaceAnimation): Clip[];
  /** Clips side by side ("row", default) or one under another ("column"), at their sizes, `gap` apart, lined up on `align` across ("start" | "center" | "end"); the block placed at `place` (default "center"). */
  stack(clips: Clip[], opts?: { direction?: "row" | "column"; gap?: Length; align?: "start" | "center" | "end" } & PlaceOptions & ReplaceAnimation): Clip[];
  /** Line clips up on an edge ("left" | "right" | "top" | "bottom") or centre line ("center": vertical, "middle": horizontal) of `to`: a clip, "frame", "safe", or (default) their combined bounds. */
  align(clips: Clip[], opts: { edge: "left" | "right" | "top" | "bottom" | "center" | "middle"; to?: Clip | "frame" | "safe" } & ReplaceAnimation): Clip[];
  /** Equal space between clips along `axis` (default "x"), in their order along it: across `area`, or (no area) between the first and last, which stay. */
  distribute(clips: Clip[], opts?: { axis?: "x" | "y"; area?: Area } & ReplaceAnimation): Clip[];

  /** Captions on this timeline: add cues, generate them from speech, find existing captions clips. */
  readonly captions: TimelineCaptions;
  /** Placement cursor: tl.at(seconds(2)).text("Hi", { length: frames(24) }). */
  at(t: Time): Cursor;
  /** Back-to-back media clips on one track cut at `cuts` (clip i spans cuts[i]..cuts[i+1]); assets cycle. */
  cut(assets: string | string[], cuts: Time[], opts?: Omit<MediaOptions, "at" | "length" | "end"> & { each?: (clip: Clip, i: number) => void }): Clip[];
}

// ── Captions ───────────────────────────────────────────────────────────
// A captions clip shows cues (lines of text, one after another) word by
// word, in timeline time. You write cues and words; the clip keeps the
// stretches between cues, how each word is cut and its own span (first cue
// start to last cue end) in step. Words must lie inside their cue, in order;
// cues must not overlap.

/** A cue to add: timeline times. `words` (in order, inside the cue) time each word; without them the cue's time is spread over its words by length (noted). */
interface CueInput {
  text: string;
  at: Time;
  end: Time;
  words?: { text: string; at: Time; end: Time }[];
}

/** How the words of a cue appear (or your GLSL per glyph/word/line: "shader", see textShader): one at a time ("word_by_word"), all shown with the spoken word colored ("highlight"), the spoken word marked by a band ("band"), a rounded box behind the whole cue ("box": the engine's and the editor's box is per cue, not per word; use "band" to mark the spoken word), animated in ("pop", "blur", "shake"), or all at once ("static"). */
type CaptionAnimation = "word_by_word" | "highlight" | "band" | "box" | "pop" | "blur" | "shake" | "static" | "shader";

type CaptionEasing =
  | "linear" | "quadratic_in" | "quadratic_out" | "quadratic_in_out" | "cubic_in" | "cubic_out" | "cubic_in_out"
  | "quartic_in" | "quartic_out" | "quartic_in_out" | "quintic_in" | "quintic_out" | "quintic_in_out"
  | "sine_in" | "sine_out" | "sine_in_out" | "circular_in" | "circular_out" | "circular_in_out"
  | "exponential_in" | "exponential_out" | "exponential_in_out" | "elastic_in" | "elastic_out" | "elastic_in_out"
  | "back_in" | "back_out" | "back_in_out" | "bounce_in" | "bounce_out" | "bounce_in_out";

/** Options per animation (others are refused): highlight/band/box take color; pop/blur take easing, amount; shake takes easing, direction, amount; word_by_word takes fade; all but static take duration. */
interface CaptionAnimationOptions {
  /** highlight: the spoken word's color; band: the band's; box: the box's. */
  color?: Color;
  /** How long each word's reveal or animation runs. Default seconds(0.3). */
  duration?: Time;
  easing?: CaptionEasing;
  /** shake: which way. Default "up". */
  direction?: "up" | "down" | "left" | "right";
  /** pop, blur, shake: strength 0..4. Default 1. */
  amount?: number;
  /** word_by_word: fade each word in instead of a cut. */
  fade?: boolean;
}

/** caps.animate(type, { cue }): animate that cue only; its duration, if given, is the cue's own. { cue, clear: true }: that cue gets the clip's animation and duration back. */
interface CueAnimationTarget {
  cue?: number;
  clear?: boolean;
}

/** The whole captions clip's look: the text style (font as in TextStyle: a bin font, a family a text uses, a font catalog family, or a .ttf/.otf; tracking in em, -1..10) and where the cues sit. */
interface CaptionStyle extends Omit<TextStyle, "fit"> {
  /** "bottom" (default), "center" or "top", inside a margin; applied when given. boxWidth (default 90% of the frame) is the wrap column. */
  place?: "top" | "center" | "bottom";
}

interface CaptionOptions extends CaptionStyle {
  /** A named track (default: a new track above the stack). */
  track?: string;
  /** The animation, by name or { type, ...options }. Default "word_by_word". */
  animation?: CaptionAnimation | ({ type: CaptionAnimation } & CaptionAnimationOptions) | ({ type: "shader" } & CaptionShaderOptions);
}

interface SpeechCaptionOptions extends CaptionOptions {
  /** Characters per cue (words and spaces). Default 42 on a landscape frame, 28 on portrait or square. */
  maxChars?: number;
  /** The language the transcript should be in (e.g. "en"); refused when the transcript says another. */
  language?: string;
  /**
   * A transcript file next to the script: .srt or .vtt (words spread over
   * each cue), or .json (the media sidecar format, segments[].words[{ word,
   * start, end }], or { words: [{ text, start, end }] }), in media seconds.
   * Without it: the media's own transcript in the edit, else
   * "<media>.transcript.json" next to the media file.
   */
  transcript?: string;
}

/** `tl.captions`. */
interface TimelineCaptions {
  /** A captions clip from cues in timeline time, on a new track above the stack. */
  add(cues: CueInput[], opts?: CaptionOptions): Captions;
  /** Captions from what is said in a video or audio clip (its transcript, see `transcript`), cut into cues the way the editor does (punctuation, length, pauses, speaker changes, at most 5 s). */
  fromSpeech(clip: Clip, opts?: SpeechCaptionOptions): Captions;
  /** The timeline's captions clips, bottom track first. */
  all(): Captions[];
  /** A captions clip (e.g. from tl.clips({ kind: "captions" })) as Captions. */
  of(clip: Clip | string): Captions;
}

/** One word of a cue. */
interface CaptionWord {
  /** Position in its cue (from 0). */
  readonly index: number;
  /** Its cue's index. */
  readonly cue: number;
  readonly text: string;
  readonly at: Time;
  readonly end: Time;
  /** Correct the word's text (its timing stays): caps.find("cleani")[0].fix("cleaning"). */
  fix(text: string): CaptionWord;
  /** Style this word: word.style({ color: "#ffd400", fontWeight: 800 }). Its timing stays. */
  style(style: RangeStyle): CaptionWord;
}

/** One cue (indexes count from 0; split, merge and remove renumber the cues after it). */
interface Cue {
  readonly index: number;
  readonly text: string;
  readonly at: Time;
  readonly end: Time;
  readonly words: CaptionWord[];
  /** New text; words that stay keep their timing, new ones share the time around them. */
  setText(text: string): Cue;
  /** The words from `beforeWord` on become a new cue right after this one; returns it. */
  split(opts: { beforeWord: number }): Cue;
  /** Join with the next cue. */
  merge(): Cue;
  /** Shift the cue and its words (frames(-6) moves it earlier). Refused when it would overlap a neighbour. */
  move(by: Time): Cue;
  /** New start and/or end (timeline times); words cut by an edge shorten, words left outside are refused. */
  trim(opts: { start?: Time; end?: Time }): Cue;
  /** Remove the cue; `ripple` moves the later cues earlier by its length. */
  remove(opts?: { ripple?: boolean }): void;
  /**
   * Style part of this cue: `{ word: n }`, or characters by a string,
   * `{ line: n }` or a regular expression (the cue's words split at the
   * part's edges; the pieces keep their timing). `{ all: true }` or a /g
   * regex styles every match. cue.style("on", { underline: true })
   */
  style(target: TextTarget, style: RangeStyle, opts?: { all?: boolean }): Cue;
}

/** A captions clip: a Clip (move, trim, setPosition, ...) with cues. */
interface Captions extends Omit<Clip, "style" | "animate"> {
  /** The whole clip's look. */
  style(style: CaptionStyle): Captions;
  /**
   * Style a part, as the timeline agent's style_text_range does it (the
   * words keep their timing): caps.style("never", { color: "#ffd400" }),
   * caps.style({ cue: 0, word: 1 }, { fontSize: 96 }), caps.style({ match: /^go/i }, { band: "#ffe600" }).
   * A background is a box behind the words (padding 24, radius 8 by
   * default); band takes a color. Read-back: cue edits (setText, split,
   * merge, fix) keep each word's style.
   */
  style(target: CaptionTarget, style: RangeStyle, opts?: { all?: boolean }): Captions;
  animate(type: Exclude<CaptionAnimation, "shader">, opts?: CaptionAnimationOptions & CueAnimationTarget): Captions;
  /**
   * Your GLSL per glyph, word, line or cue (textShader), validated at build:
   *     caps.animate("shader", { shader: textShader("fx/burn.glsl"), by: "word", duration: beats(1), params: { heat: 0.8 } })
   *     caps.animate("shader", { shader: "rise" })
   */
  animate(type: "shader", opts: CaptionShaderOptions & CueAnimationTarget): Captions;
  /**
   * A caption preset onto this clip: its look replaces the clip's, and the
   * cues, words and timings stay. A built-in name resolves first: the
   * preset's whole-run style, face (from the bin; else the default face and
   * a `preset_font_missing` note), box, animation and position; hype,
   * mixtape and sticker accent each cue's first word unless `accents:
   * false`. Otherwise the editor's drop of a bin caption preset: a record
   * from `edit.bin.captionPresets()`, its handle ("cp1"), or its library
   * slug ("@scope/slug@3", or "@scope/slug" when one version is in the bin).
   * `style` then applies as caps.style(style).
   *     caps.applyPreset("hype", { accents: false })
   *     caps.applyPreset(edit.bin.captionPresets()[0])
   */
  applyPreset(preset: CaptionPresetName | BinCaptionPreset | string, opts?: { accents?: boolean; style?: CaptionStyle }): Captions;
  /** The cues, in time order. */
  cues(): Cue[];
  cue(index: number): Cue;
  /** Words containing `text`, in order (empty when none). */
  find(text: string): CaptionWord[];
}

interface TimelineOptions {
  fps?: number;
  /** [width, height] in px. Default [1920, 1080]. */
  size?: Vec2;
  background?: Color;
  /** Unique within the edit; timelines are addressed by name or handle. */
  name?: string;
  /** Total length (or set it later with tl.setDuration). */
  duration?: Time;
  /** Seeds Math.random. Default 1. */
  seed?: number;
  /** The timeline folder to file it in (default: the top level). */
  folder?: TimelineFolder | string;
}

/**
 * A folder in the Timeline browser (handle "tf1"): where timelines are
 * filed, as media is filed in bin folders. Not a bin folder: edit.bin never
 * lists it, and media never goes in it.
 */
interface TimelineFolder {
  id: string;
  name: string;
  /** The timeline folder it is in, or null at the top level. */
  parent: string | null;
}

interface BinItem {
  /** Opaque handle (e.g. "m3"). */
  id: string;
  name: string;
  kind: "image" | "video" | "audio";
  length: SourceTime | null;
  /** The library item it came from ("@scope/slug@version"), or null. */
  library: string | null;
  /** The folder it is in (a BinFolder handle), or null at the top of the bin. */
  folder: string | null;
  /** Videos: the declared color profile, or null for Auto (the detected one). */
  profile?: ColorProfile | null;
  /** Videos: the profile the media service detected, or null. */
  detected?: string | null;
}

/** A bin folder (handle "fd1"). */
interface BinFolder {
  id: string;
  name: string;
  /** The folder it is in, or null at the top of the bin. */
  parent: string | null;
}

/** A LUT in the bin (handle "lut2"): a custom upload or a catalog LUT the edit carries. */
interface BinLut {
  id: string;
  name: string;
  format: "cube" | "png";
  /** A first-party catalog LUT (else a custom one). */
  catalog: boolean;
  /** The library item it came from ("@scope/slug@version"), or null. */
  library: string | null;
  folder: string | null;
}

/** An effect in the bin (handle "fx1"): a saved effect, or a catalog row the edit carries. */
interface BinEffect {
  id: string;
  name: string;
  category: string;
  /** A saved (user or agent) effect, not a catalog row. */
  saved: boolean;
  /** The library item it came from ("@scope/slug@version"), or null. */
  library: string | null;
  folder: string | null;
  /** Its params by their own names, at their defaults. */
  params: Record<string, unknown>;
}

/**
 * A transition in the bin (handle "ef1", or "fx2"): an asset of kind
 * transition, usually added from a library item. Place it at a cut with
 * tl.addTransition(left, right, transition) (or its handle). It is not a
 * clip effect: clip.addEffect refuses it.
 */
interface BinTransition {
  id: string;
  name: string;
  category: string;
  /** The library item it came from ("@scope/slug@version"), or null. */
  library: string | null;
  folder: string | null;
  /** Its params by their own names, at their defaults (`easing` by its public name). */
  params: Record<string, unknown>;
}

/**
 * A caption preset in the bin (handle "cp1"): a whole caption look (font,
 * size, colour, stroke, shadow, animation, optional shader), usually added
 * from a library item.
 */
interface BinCaptionPreset {
  id: string;
  name: string;
  /** The library item it came from ("@scope/slug@version"), or null. */
  library: string | null;
  folder: string | null;
}

/**
 * A font in the bin (handle "f1"): an upload, a library item's font or a
 * catalog font. Pass its `id` or `name` as a text's `font`
 * (`tl.addText("Hi", { font: "f1" })`, `{ font: "Anton" }`).
 */
interface BinFont {
  id: string;
  /** The row's name (for a static face it includes the style, e.g. "Anton Bold"). */
  name: string;
  /** Font family, when the file names one. A family name picks its regular face. */
  family: string | null;
  style: string | null;
  /** [min, max] of a variable font's weight axis (fontWeight in that range draws); null for a static face. */
  weights: [number, number] | null;
  /** One of the editor's catalog fonts. */
  catalog: boolean;
  /** The library item it came from ("@scope/slug@version"), or null. */
  library: string | null;
  folder: string | null;
}

/** A color profile a bin video can be declared as (the Metadata tab's list). */
type ColorProfile = 
  | "rec709"
  | "hdr10_aces2_1000"
  | "hdr10"
  | "hlg_aces2_1000"
  | "hlg"
  | "vlog_vgamut"
  | "slog3_sgamut3cine"
  | "slog3_sgamut3"
  | "apple_log"
  | "apple_log2"
  | "logc3_awg3"
  | "logc4_awg4"
  | "clog2_cinemagamut"
  | "clog2_bt2020"
  | "clog3_cinemagamut"
  | "clog3_bt2020"
  | "log3g10_rwg"
  | "bmdfilm_gen5_wg"
  | "dlog_dgamut"
  | "llog_bt2020";

/**
 * The edit's bin, through the editor's media-library actions. Items and
 * folders are passed as records or handles.
 */
interface Bin {
  /** Media items (images, videos, sounds). */
  items(): BinItem[];
  folders(): BinFolder[];
  luts(): BinLut[];
  effects(): BinEffect[];
  /** Transitions (library items added to the editor, catalog rows the edit carries); place one with tl.addTransition(a, b, t). */
  transitions(): BinTransition[];
  captionPresets(): BinCaptionPreset[];
  /** Fonts in the bin (uploads, library items, the editor's catalog). A text's `font` takes one's handle ("f13") or name. */
  fonts(): BinFont[];
  /** The editor's New Folder (last among its siblings), at the top or in `parent`. */
  newFolder(name: string, opts?: { parent?: BinFolder | string }): BinFolder;
  /**
   * Move items and folders into `folder` (null or omitted: the top of the
   * bin), as a drag in the media panel does. A folder never moves into
   * itself or its own subfolders (refused).
   */
  move(items: (BinItem | BinFolder | string)[], folder?: BinFolder | string | null): { moved: string[]; folder: string | null };
  /**
   * The editor's Delete: items, folders (with everything inside), LUTs,
   * saved effects and caption presets. Nothing in use is refused, as in the
   * editor: clips keep playing (a clip carries its own media, not the bin
   * row), a grade keeps its LUT, an applied effect is a copy, a caption
   * keeps its look. `stillUsed` (and a
   * `bin_item_in_use` receipt note) names who still uses each.
   */
  delete(items: (BinItem | BinFolder | BinLut | BinEffect | BinTransition | BinCaptionPreset | string)[]): { removed: string[]; stillUsed: { item: string; usedBy: string[] }[] };
  /**
   * Put media in the bin without placing it, as the editor's import does:
   * a file next to the script, host media (a HostHandle), a Media, or a
   * Sequence (its first element, or the one `output` names); a .cube
   * becomes a custom LUT. Media becomes a bin item (into `folder`); place it
   * later with tl.placeMedia(item). placeMedia imports into the bin by
   * itself, so this is only for media you want there unplaced. A notebook
   * path or sequence id ("2.1") needs a host module that resolves notebook
   * refs (copilot's does): NotAvailableError (no_notebook) without one.
   */
  add(path: `${string}.cube`, opts?: { name?: string }): BinLut;
  add(media: MediaRef | HostHandle, opts?: { folder?: BinFolder | string; name?: string; output?: number | string }): BinItem;
  /**
   * A video's color profile, as the Metadata tab sets it (null or omitted:
   * Auto, the detected one). Legal values depend on the detection.
   */
  setColorProfile(item: BinItem | string, profile?: ColorProfile | null): BinItem;
}

/**
 * What is known about a media file: st's asset_meta shape (the editor's
 * `AssetMetadata`), with its field names. An optional fact that is null
 * or absent is unknown, not false. `width`/`height` are 0 when the media
 * has no picture. `duration` is the media's duration in seconds (video,
 * audio), the same name and unit on `Media.metadata` and `edit.assetInfo`.
 */
interface AssetMetadata {
  media_type: "video" | "audio" | "image" | "document" | "font";
  width: number;
  height: number;
  fps?: number | null;
  has_alpha?: boolean | null;
  has_audio?: boolean | null;
  video_specs?: Record<string, unknown> | null;
  audio?: { sample_rate?: number | null; channels?: number | null; [k: string]: unknown } | null;
  /** Seconds. null for an image. */
  duration?: number | null;
  /**
   * @deprecated Use `duration` (seconds). Only `edit.assetInfo` fills it
   * (as a SourceTime); `Media.metadata` never has it.
   */
  length?: SourceTime | null;
}

/** The edit: its timelines, its bin, and what the person was looking at. */
interface Edit {
  readonly mode: "build" | "edit";
  /** The active timeline, or one by name or handle ("T2"). */
  timeline(key?: string): Timeline;
  timelines(): Timeline[];
  /** A new timeline; the first one of a new edit becomes the active one. */
  newTimeline(opts?: TimelineOptions): Timeline;
  /** Folders in the Timeline browser (where timelines are filed; not the bin's folders), parents before children. */
  timelineFolders(): TimelineFolder[];
  /** The Timeline browser's New Folder (last among its siblings), at the top or in `parent`. */
  newTimelineFolder(name: string, opts?: { parent?: TimelineFolder | string }): TimelineFolder;
  /**
   * File timelines and timeline folders in `folder` (null or omitted: the
   * top level), as a drag in the Timeline browser does. Timelines by object,
   * handle or name. A folder never moves into itself or its own subfolders
   * (refused).
   */
  moveTimelines(items: (Timeline | TimelineFolder | string)[], folder?: TimelineFolder | string | null): { moved: string[]; folder: string | null };
  /**
   * The Timeline browser's Delete, as edit.bin.delete deletes a bin's media:
   * each folder goes with its subfolders and every timeline filed in them
   * (`removed`). The edit's main timeline is never deleted; it moves to the
   * top level (`movedToTop`). To keep a timeline, move it out first.
   */
  deleteTimelineFolders(folders: (TimelineFolder | string)[]): { removed: string[]; movedToTop: string[] };
  /** Clips selected in the editor (from the run's context), in order. */
  readonly selection: Clip[];
  /** Playhead from the run's context, or null. */
  readonly playhead: Time | null;
  /** In/out from the run's context, or null. */
  readonly range: { in: Time; out: Time } | null;
  readonly bin: Bin;
  /**
   * Read a text file (e.g. a .glsl shader, a .json; up to 1 MiB): a path
   * relative to the script, looked up in each --asset-root first. `..` may
   * reach a --root folder or an asset root (readText("../lib/wave.glsl")
   * with --root ../lib), nothing else. A missing file is a located error
   * collected with the others (the run is refused, the script keeps going);
   * with `{ optional: true }` a missing file is null instead.
   */
  readText(path: string): string;
  readText(path: string, opts: { optional: true }): string | null;
  /**
   * Whether a file is there, where readText and placeMedia look (each
   * --asset-root, then next to the script; `..` only into a --root or an
   * asset root). Never fails for a missing file; a path the script may not
   * read is still refused.
   */
  exists(path: string): boolean;
  /** Probe a media file next to the script. */
  assetInfo(path: string): AssetMetadata;
  /** Effect/transition names and their params. */
  catalog(): Catalog;
  /** Deterministic PRNG. */
  rand(seed?: number): Rng;
  /** The edit's main output: everything ends here (gain, pan, mute and audio effects over the whole mix). */
  mainOutput(): Track;
  /**
   * Deterministic lints of the edit as it is now, so a script can react
   * (the same checks run after every build/run into `lints`, and in
   * `timeline check`). Most severe first. Only `error` findings (would
   * crash the renderer) refuse a run; none exist today.
   *
   * Beats (`off_beat`): checked against `beats`, else automatically
   * against the first grid this run made on that timeline
   * (`clip.beats()` / `beatGrid()`); `beats: false` turns it off. Only
   * edit points are checked: cuts, and where pictures (video, image, a
   * nested timeline) start and end. Text, shapes, captions, adjustment
   * clips, sounds and keyframes run free; `scope: "all"` checks them too.
   * A clip made or set with `beat: false` is never checked.
   *
   *     const grid = music.beats();
   *     for (const f of edit.check({ beats: grid, sub: 4 }))
   *       if (f.code === "off_beat") console.log(f.handle, f.offset!.frames);
   */
  check(opts?: CheckOptions): Finding[];
}

/** What tl.render renders. */
interface RenderOptions {
  /**
   * "image": one instant, a PNG. "sheet": a contact sheet of the `at`
   * instants, or of `count` tiles spread over `span`. "onion": `count`
   * frames of `span` blended into one image (a motion's path and easing).
   * "video": a fast low-res draft video of `span`. Default: "image" for one
   * instant, else "sheet". (Was tl.look's `kind`: frame, strip, onion, draft.)
   */
  as?: "image" | "sheet" | "onion" | "video";
  /** Instants on this timeline: a Time or a TimeString ("Intro@1.2s", "marker:drop", "beat:18"); up to 100. Not with `span`. */
  at?: Time | TimeString | (Time | TimeString)[];
  /** A stretch of the timeline, or a scene's name. Default: the whole timeline. */
  span?: { start: Time | TimeString; end: Time | TimeString } | string;
  /** Tiles (sheet, default 16) or blended frames (onion, default 6, at least 2) spread over `span`, ends included; up to 100. */
  count?: number;
  /** Render height in px. Default: 720 for an image, 240 for sheet tiles, 480 for onion and video. */
  quality?: 240 | 360 | 480 | 720 | 1080;
}

/** What tl.analyze measures: each part as @iv/media's media.audio.* result (st's field names). */
interface MixAnalysis {
  /** The rendered mix the numbers are about. */
  readonly of: Media;
  /** Integrated loudness (LUFS), true peak (dBTP) and loudness range (LU). */
  readonly loudness?: { readonly input_i: number; readonly input_tp: number; readonly input_lra: number; readonly [field: string]: unknown };
  /** Musical beats (strong and weak). */
  readonly beats?: { readonly high_beats: { readonly at: SourceTime; readonly text: string }[]; readonly low_beats: { readonly at: SourceTime; readonly text: string }[] };
  /** Onsets (spectral flux). */
  readonly onsets?: { readonly events: { readonly time_s: SourceTime; readonly strength: number; readonly [field: string]: unknown }[]; readonly [field: string]: unknown };
  /** What is speech, music, sfx or silence, and when. */
  readonly content?: {
    readonly verdicts: { readonly has_music: boolean; readonly has_speech: boolean; readonly mostly: string };
    readonly spans: { readonly start: SourceTime; readonly end: SourceTime; readonly label: "silence" | "music" | "speech" | "sfx"; readonly [field: string]: unknown }[];
    readonly [field: string]: unknown;
  };
}

interface ExportOptions {
  /** The timeline (a Timeline, its handle or name). Default: the active one. */
  timeline?: Timeline | string;
  /** Default: the host's. */
  resolution?: "1080p" | "720p" | "480p" | "240p";
  /** Default: the host's. */
  quality?: "draft" | "good" | "best";
  /** A stretch of the timeline, or a scene's name. Default: all of it. */
  span?: { start: Time | TimeString; end: Time | TimeString } | string;
}

/** What tl.lint reads. */
interface LintOptions {
  /** Rule ids to run (today "voice-decay"). Default: all of them. */
  rules?: "voice-decay"[];
}

/** What tl.lint reports. */
interface LintResult {
  /** "pass", "fail" (a finding), "incomplete" (a voice clip's sidecar is pending and nothing was found: not a pass, and not "no voice") or "nothing_measured" (no voice to read). */
  readonly status: "pass" | "fail" | "incomplete" | "nothing_measured";
  readonly findings: {
    readonly rule: "voice-decay";
    readonly severity: "warning" | "error";
    /** The voiceover track. */
    readonly track: Track;
    /** The clips the read covers, in timeline order. */
    readonly clips: Clip[];
    /** Where on the timeline. */
    readonly range: { readonly start: Time; readonly end: Time };
    /** How far the speech level moves over the read (dB, negative falls). */
    readonly changeDb: number;
    readonly startLufs: number;
    readonly endLufs: number;
    readonly cause: "generation_drift" | "level_drift" | null;
    readonly message: string;
    /** Best first. */
    readonly remedies: { readonly code: "voice_leveler" | "regenerate_in_segments"; readonly rank: number; readonly words: string }[];
  }[];
  /** Drift under the finding bar. */
  readonly residuals: {
    readonly track: Track;
    readonly clips: Clip[];
    readonly range: { readonly start: Time; readonly end: Time };
    readonly changeDb: number;
    readonly limitDb: number;
  }[];
  /** What the host could not read. Return it and the host fetches and reruns. */
  readonly pending: {
    readonly clips: Clip[];
    /** The media the sidecar is about, as the host names it. */
    readonly asset: string;
    readonly kind: "loudness" | "sound_events";
    readonly reason: "not_staged" | "not_in_storage" | "generating" | "failed" | "budget" | "build_timeout";
    readonly message: string;
  }[];
  readonly notes: string[];
}

interface CheckOptions {
  /** The beat grid edit points must sit on; false: no beat check. Default: the first grid this run made. */
  beats?: BeatGrid | false;
  /** "edits" (default): cuts and picture starts/ends. "all": also text, shapes, captions, adjustment clips and each animation's first keyframe. Clips with `beat: false` are skipped either way. */
  scope?: "edits" | "all";
  /** Parts per beat allowed: 1, 2 or 4 (default 4: every quarter beat). */
  sub?: 1 | 2 | 4;
  /** Also report text past a title-safe margin (0.05 or "5%" of the frame per side), as info. */
  safeArea?: number | string;
}

/**
 * One check finding. Codes: text_too_large, text_off_canvas, missing_glyphs,
 * gap, overlap, past_media_end, off_beat, av_drift, linked_audio_orphan,
 * off_canvas (a layout call placed a clip partly outside the frame, not
 * full-bleed media; in a run's lints), shader_param_far (a custom shader
 * param far outside 0..1 with no declared range; in a run's lints) (warn); text_outside_safe_area, disabled_clip, muted_clip, hidden_track,
 * muted_track, unused_asset, shader_unused_input (info).
 */
interface Finding {
  code: string;
  severity: "error" | "warn" | "info";
  /** What is wrong, with the numbers. */
  message: string;
  /** How to fix it. */
  fix: string;
  /** The record it is about (a clip, track, effect). */
  handle?: string;
  /** Every record involved (both clips of a gap or overlap, picture and sound). */
  handles?: string[];
  timeline?: string;
  /** Where on the timeline. */
  at?: TimeJson;
  /** off_beat: how far from the nearest allowed point. */
  offset?: { frames: number; beats: number };
  /** gap: [start, end) frames. */
  frames?: [number, number];
  /** The script call that made the record (with --trace, and in `timeline check`). */
  file?: string;
  line?: number;
  col?: number;
}

// ── host: what an embedding host adds (`--host`, CONTRACT.md) ─────────────

/** A value or media file an embedding host produces (a host module's result, e.g. the agent harness's `gen.generate`). Placeable like a file when it is media: `tl.placeMedia(h)`. Host modules declare their own types next to this file (`timeline build --types --host ...`). */
interface HostHandle {
  /** Opaque handle ("gen3"). */
  readonly id: string;
}

/** The edit this script works on: the existing one (`timeline run ... --on <edit>`) or the new, empty one being built (`timeline build`). */
declare const edit: Edit;

/** Lines go to the run's `logs`. */
declare const console: {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

// ── What `timeline run --json` prints (not callable from scripts) ─────────

/** A time in receipts and describe(). */
interface TimeJson {
  frames: number;
  seconds: number;
}

/** One refused (or skipped) call. */
interface ScriptDiagnostic {
  severity: "error" | "skipped";
  /** Stable: unknown_name, unknown_option, out_of_range, not_found, overlap, subframe_time, time_unit, wrong_time_kind, animated_property, wrong_entry_point, exception, ... */
  code: string;
  line: number;
  col: number;
  /** The call as written, e.g. "clip.addEffect", or with its receiver for skipped calls ("shoe.addEffect"). */
  call: string;
  message: string;
  expected?: string;
  actual?: string;
  /** Legal values from the resolver that refused the call (first 12; legal_more counts the rest). */
  legal?: string[];
  legal_more?: number;
  fix?: string;
  retryable: boolean;
  /** skipped: the line of the refused call it depended on. */
  depends_on?: number;
  /** Identical errors merged. */
  count?: number;
  called_from?: string[];
}

interface ScriptReceipt {
  status: "applied" | "planned" | "refused" | "failed";
  /** Whether the edit now carries the changes. */
  landed: boolean;
  /** False when nothing changed. */
  changed: boolean;
  /** One human sentence. */
  summary: string;
  created: { handle: string; kind: string }[];
  removed: { handle: string; kind: string }[];
  /** Per field: what was asked (when asked directly), achieved, and before. Ripple and linked knock-ons have no `requested`. Times are TimeJson. */
  changes: { handle: string; field: string; requested?: unknown; achieved: unknown; before: unknown }[];
  changes_more?: number;
  blast_radius: {
    handles: string[];
    tracks: string[];
    durations?: { timeline: string; before: TimeJson; after: TimeJson }[];
    /** Changed span per timeline, [first, last). */
    times?: Record<string, [TimeJson, TimeJson]>;
  };
  /** Clamps and fallbacks: { code, handle, requested, achieved, message }. */
  notes: { code: string; handle: string; requested: unknown; achieved: unknown; message: string }[];
  /** check() findings this run introduced (see Edit.check), plus gaps it opened (gap_created). */
  lints: Finding[];
  /** At most 20; errors_more counts the rest. */
  errors: ScriptDiagnostic[];
  errors_more?: number;
  logs: string[];
  next?: string;
  /** The embedding host's section (`--host`), e.g. `{ generation: ... }`: opaque to the timeline. */
  host?: Record<string, unknown>;
}

// ── @iv/ modules ─────────────────────────────────────────────────────────
// `@iv/types` is always available; `@iv/edit` when an editor backs the run
// (the globals above stay as aliases). Any other `@iv/<name>` is a module
// the embedding host registers, declared below this file by
// `embed::script_types`. Other `@scope` imports are refused.

/** A piece of media: where it lives, what is known about it, where it came from. */
/** What a subagent was asked: its inputs, by the subagent's own names. */
type SubagentInput = Record<string, unknown>;
/**
 * A generation's result set (copilot's sequence, its field names): `elements` are the outputs, `id` is the
 * display slug ("2.1"). Where media is taken, a Sequence means its first element (or the one `output` names).
 */
/** What every media input accepts: a Media, a Sequence, a string (a notebook path or a sequence id like "2.1"), or a bin item. Notebook refs need a host module that resolves them (see Timeline.placeMedia). */

// /sdk/types/types.d.ts — @iv/types: the error classes every @iv/* call throws (catch by class,
// e instanceof CreditsError) and attempt(). Time, Media, Sequence and the other types it names are in
// /sdk/types/edit.d.ts.

interface Media<K extends "image" | "video" | "audio" | "file" | "three_d" | "web_page" = "image" | "video" | "audio" | "file" | "three_d" | "web_page"> {
  readonly id: string; // placeable: tl.placeMedia(m) (its bin item in an editor once landed)
  readonly path: string | null; // "/notebook/page-1/thread-2/2.1.mp4"; null while planned
  readonly sequence: string | null; // the sequence it belongs to ("2.1")
  readonly metadata: { // a property: m.metadata.duration (media.metadata(ref) fetches it for any ref)
    readonly media_type: K;
    readonly width?: number;
    readonly height?: number;
    readonly duration?: number; // seconds
    readonly fps?: number;
    readonly has_audio?: boolean; // false or absent: no sound; audio analyses and audio edits refuse it
    readonly has_alpha?: boolean;
    readonly mime_type?: string;
    readonly size?: number; // bytes
    readonly page_count?: number; // documents
    readonly video_specs?: { readonly [field: string]: unknown }; // st's probed video stream
    readonly audio?: { readonly [field: string]: unknown }; // st's probed audio: stream, loudness, verdicts
  };
  readonly source: Source;
  readonly credits?: number;
  readonly planned: boolean; // true in a plan: a placeholder with estimated facts
}

type Source =
  | { readonly from: "gen"; readonly subagent: string; readonly mode: string; readonly call: string }
  | { readonly from: "stock"; readonly provider: string; readonly id: string }
  | { readonly from: "notebook" }
  | { readonly from: "bin"; readonly editor: string; readonly handle: string }
  | { readonly from: "media"; readonly op: string; readonly of: Media | null };

interface Sequence {
  readonly id: string | null; // display_slug, e.g. "2.1"; null while planned
  readonly path: string | null; // "/notebook/page-1/thread-2/2.1"
  readonly display_name: string | null;
  readonly state: "proposed" | "running" | "completed" | "error" | "pending" | "rejected";
  readonly version: number;
  readonly parent?: string;
  readonly judgement?: { readonly status: "accepted" | "rejected"; readonly message?: string };
  readonly elements: Media[];
  readonly seed?: number;
  readonly is_favorited: boolean;
  readonly credits: number;
  readonly planned: boolean;
}

type MediaRef<K extends string = string> = Media<any> | Sequence | { readonly id: string; readonly kind?: K } | string;

interface GenOptions {
  
  take?: number;
  
  label?: string;
}

interface Gen {
  
  readonly audio_tools: Gen_audio_tools;
  
  readonly image_tools: Gen_image_tools;
  
  readonly nanobanana_2: Gen_nanobanana_2;
  
  readonly video_tools: Gen_video_tools;
  
}

type SourceTimeLike = SourceTime | string;

type SpanLike = { readonly start: SourceTimeLike; readonly end: SourceTimeLike };

declare abstract class IvError extends Error {
  
  readonly status: "refused" | "failed" | "completion_unknown";
  readonly code: string;
  readonly charged: boolean;
  readonly retryable?: boolean;
  readonly at?: { file: string; line: number; col: number };
}

declare class InputError extends IvError { readonly field: string; readonly reason: string; readonly max?: number }
declare class NotAvailableError extends IvError { readonly module: string; readonly context: string }
declare class PermissionError extends IvError { readonly path?: string }

declare class CreditsError extends IvError { readonly scope: "wallet" | "project" | "user"; readonly needed?: number; readonly available?: number }
declare class ConsentError extends IvError { readonly items: string[] }
declare class ModerationError extends IvError { readonly subagent?: string }
declare class ConflictError extends IvError {}
declare class CancelledError extends IvError {}
declare class ServiceError extends IvError { readonly service: "media" | "st" | "media-router" | "gen" | "agent"; readonly retried: number }

interface Of { readonly of: Media }

interface Description extends Of {
  readonly understanding: {
    readonly summary: { readonly asset: string; readonly [field: string]: unknown };
    readonly chapters?: (Span & { readonly title: string; readonly summary: string })[];
    readonly closed_captions?: (Span & { readonly description: string })[];
    readonly speaker_map?: { readonly [id: string]: string };
    readonly scenes?: unknown[];
    readonly caption?: string; // images
  };
  readonly speech_to_text?: {
    readonly text: string;
    readonly words: (Span & { readonly text: string; readonly speaker_id: string | null })[];
    readonly speakers: { readonly id: string; readonly name: string | null }[];
  } | null;
}
interface Understanding {
  readonly answer: string; // the understand agent's report, markdown
  readonly refs: (Span & { readonly media: Media; readonly note: string | null })[];
}

interface Shots extends Of {
  readonly cut_times: SourceTime[];
  readonly shots: Span[];
  readonly fps: number;
  readonly frame_count: number;
  readonly coverage: "full" | "partial";
}

interface Transcript extends Of { readonly words: (Span & { readonly type: "word"; readonly text: string; readonly speaker_id: string | null })[] }

interface Beats extends Of {
  readonly high_beats: { readonly at: SourceTime; readonly text: string }[];
  readonly low_beats: { readonly at: SourceTime; readonly text: string }[];
}

interface Onsets extends Of {
  readonly duration_secs: SourceTime;
  readonly preset: string;
  
  readonly span?: Span;
  readonly events: { readonly time_s: SourceTime; readonly peak_s?: SourceTime; readonly cut_s?: SourceTime; readonly end_s?: SourceTime; readonly strength: number; readonly [field: string]: unknown }[];
  readonly [field: string]: unknown;
}

interface AudioContent extends Of {
  readonly verdicts: { readonly has_music: boolean; readonly has_speech: boolean; readonly mostly: "music" | "speech" | null };
  readonly spans: (Span & { readonly label: "silence" | "music" | "speech"; readonly concurrent?: string[]; readonly scores?: { readonly [label: string]: number } })[];
  readonly [field: string]: unknown;
}

interface SoundEvents extends Of {
  readonly duration_s: SourceTime;
  readonly events?: { readonly [preset: string]: (Span & { readonly class_id: number; readonly label: string; readonly max_prob: number })[] };
  readonly queries?: { readonly query: string; readonly events: (Span & { readonly peak_s: SourceTime; readonly peak_prob: number })[] }[];
  
  readonly unheard?: Span[];
  readonly [field: string]: unknown;
}

interface Markers extends Of {
  readonly markers: { readonly time_s: SourceTime; readonly family: string; readonly type: string; readonly tier: number; readonly label: string; readonly description: string }[];
}

interface Key extends Of {
  readonly duration_secs: SourceTime;
  
  readonly span?: Span;
  readonly global: { readonly tonic: string; readonly mode: "major" | "minor" | "unknown"; readonly correlation: number; readonly confidence: number; readonly alternatives: unknown[] };
}

interface Sections extends Of {
  
  readonly span?: Span;
  readonly levels: { readonly k: number; readonly groups: number; readonly sections: (Span & { readonly index: number; readonly group: number; readonly mean_rms_db: number; readonly starts_on_downbeat: boolean })[] }[];
  readonly [field: string]: unknown;
}
interface Waveform extends Of { readonly peaks: unknown } // st's peaks document
interface Loudness extends Of { readonly input_i: number; readonly input_tp: number; readonly input_lra: number }
interface Pages extends Of { readonly pages: Media[]; readonly failed_pages?: number[] }

interface FolderAnswers {
  readonly answers: {
    readonly question: string;
    readonly answer: string;
    readonly confidence: "high" | "medium" | "low";
    readonly files: { readonly path: string; readonly timestamps: Span[]; readonly why: string }[];
  }[];
  readonly folder_summary: string;
  readonly summary: string;
  readonly unanswerable: string[];
}
interface SearchResults { readonly results: { readonly path: string; readonly snippet: string }[] }

interface People {
  readonly people: {
    readonly slug: string; // "person-1"
    readonly name: string;
    readonly facet_slug: string;
    readonly thumbnail: string | null;
    readonly files: { readonly path: string; readonly appearances: Span[] }[];
  }[];
}

interface AnalysisVideoFrame {
  readonly time: SourceTime;
  readonly image: Media;
}
interface AnalysisVideoFrameError {
  readonly requestedTime: SourceTime;
  readonly error: { readonly code: string; readonly retryable: boolean };
}
interface AnalysisVideoContactSheet {
  readonly image: Media;
  readonly startTime: SourceTime;
  readonly endTime: SourceTime;
  readonly tiles: ReadonlyArray<AnalysisVideoFrame>;
  
  readonly spacing?: SourceTime;
  readonly layout: { readonly columns: number; readonly rows: number; readonly tile_width: number; readonly tile_height: number; readonly label_height: number };
}

interface MediaVideo extends MediaVideoTools {

  shots(video: MediaRef, options?: { span?: SpanLike }): Promise<Shots>;

  beats(video: MediaRef): Promise<Beats>;
  
  readonly audio: MediaAudioAnalyses;
}
interface MediaAudioAnalyses {
  
  onsets(audio: MediaRef, options?: { span?: SpanLike }): Promise<Onsets>;
  
  content(audio: MediaRef): Promise<AudioContent>;
  
  events(audio: MediaRef, options?: { queries?: string[]; sensitivity?: "low" | "medium" | "high" }): Promise<SoundEvents>;
  
  markers(audio: MediaRef): Promise<Markers>;
  
  key(audio: MediaRef, options?: { span?: SpanLike }): Promise<Key>;
  
  sections(audio: MediaRef, options?: { span?: SpanLike }): Promise<Sections>;
  
  waveform(audio: MediaRef): Promise<Waveform>;
  
  loudness(audio: MediaRef): Promise<Loudness>;
}
interface MediaAudio extends MediaAudioAnalyses, MediaAudioTools {

  beats(audio: MediaRef): Promise<Beats>;
}
interface MediaImage extends MediaImageTools {}

declare const __iv_media: {
  
  metadata(media: MediaRef): Promise<Media["metadata"]>;

  people(album: string): Promise<People>;
  readonly video: MediaVideo;
  readonly audio: MediaAudio;
  readonly image: MediaImage;
};

interface MediaVideoTools {
  
  trim(video: MediaRef, options?: {
     startTime?: SourceTimeLike;
     endTime?: SourceTimeLike;
     into?: Into;
  }): Promise<Sequence>;
  
  reverse(video: MediaRef, options?: {
     into?: Into;
  }): Promise<Sequence>;
  
  changeSpeed(video: MediaRef, options?: {
     startSpeed?: number;
     endSpeed?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  stitch(videos: MediaRef[], options?: {
     aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "source";
     into?: Into;
  }): Promise<Sequence>;
  
  sceneSplit(video: MediaRef, options?: {
     threshold?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  loop(video: MediaRef, options?: {
     targetDuration?: SourceTimeLike;
     into?: Into;
  }): Promise<Sequence>;
  
  extractFrameFirst(video: MediaRef, options?: {
     into?: Into;
  }): Promise<Sequence>;
  
  extractFrameLast(video: MediaRef, options?: {
     into?: Into;
  }): Promise<Sequence>;
  
  extractFrameByNumber(video: MediaRef, options?: {
     frameNumber?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  extractFrameAtTime(video: MediaRef, options?: {
     timeSeconds?: SourceTimeLike;
     into?: Into;
  }): Promise<Sequence>;
  
  extractFrameInterval(video: MediaRef, options?: {
     frameInterval?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  extractMsInterval(video: MediaRef, options?: {
     intervalMs?: SourceTimeLike;
     into?: Into;
  }): Promise<Sequence>;
  
  replaceAudio(video: MediaRef, options: {
     audioInput: MediaRef<"audio">;
     into?: Into;
  }): Promise<Sequence>;
  
  addAudioTrack(video: MediaRef, options: {
     audioInput: MediaRef<"audio">;
     volume?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  resize(video: MediaRef, options?: {
     resolution?: "240" | "360" | "480" | "720" | "1080";
     into?: Into;
  }): Promise<Sequence>;
}

interface MediaAudioTools {
  
  toVideo(audio: MediaRef, options?: {
     aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
     fps?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  trim(audio: MediaRef, options?: {
     startTime?: SourceTimeLike;
     endTime?: SourceTimeLike;
     into?: Into;
  }): Promise<Sequence>;
  
  extract(video: MediaRef, options?: {
     format?: "mp3" | "wav" | "ogg" | "aac" | "opus";
     into?: Into;
  }): Promise<Sequence>;
  
  concat(audios: MediaRef[], options?: {
     gapDuration?: SourceTimeLike;
     into?: Into;
  }): Promise<Sequence>;
  
  addAudioTrack(audio: MediaRef, options: {
     overlayAudioInput: MediaRef<"audio">;
     volume?: number;
     startTime?: SourceTimeLike;
     into?: Into;
  }): Promise<Sequence>;
}

interface MediaImageTools {
  
  collage(images: MediaRef[], options?: {
     aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
     into?: Into;
  }): Promise<Sequence>;
  
  crop(image: MediaRef, options?: {
     x?: number;
     y?: number;
     w?: number;
     h?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  resizeAspectRatio(image: MediaRef, options?: {
     aspectRatio?: "16:9" | "9:16";
     maxHeight?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  resizeFit(image: MediaRef, options?: {
     maxWidth?: number;
     maxHeight?: number;
     into?: Into;
  }): Promise<Sequence>;
  
  rotate(image: MediaRef, options?: {
     into?: Into;
  }): Promise<Sequence>;
}

type PublicCodePath = "/lib" | "/editors" | `/lib/${string}` | `/editors/${string}`;
type PublicSequenceRef = `${number}.${number}` | `PLAN-${number}${string}`;

interface NotebookEntry {
  readonly path: string; // "/editors/EL1/lib/fx.ts", "/notebook/page-1/thread-2/2.1.mp4", "/context/style.md"
  readonly kind: "file" | "media" | "folder";
  readonly version?: number | null; // code files only
  readonly updated_at?: string | null; // ISO 8601, where the mount keeps it
  readonly planned?: boolean; // a write in a plan: checked, not made
}

interface NotebookMatch {
  readonly path: string;
  readonly line: number; // 1-based
  readonly text: string;
  readonly before: string[];
  readonly after: string[];
}

interface Thread {
  readonly id: string | null; // "thread-2"; null for a planned thread (a plan makes none)
  readonly path: string | null; // "/notebook/page-1/thread-2"
  readonly title: string;
  readonly page: string | null; // "/notebook/page-1"
  readonly planned?: boolean;
}

type Into = Thread | { kind: "new"; title: string; page?: string } | { kind: "existing"; thread: string };

interface Judgement {
  readonly status: "accepted" | "rejected";
  readonly message: string; // what failed, or the reviewer's summary
  readonly failed: string[]; // the checklist lines that failed
  readonly recommendation: string; // the reviewer's: ship | ship_with_caveats | regenerate | skipped | planned
  readonly planned?: boolean;
}

interface NotebookEdit {
  old: string;
  new: string;
  all?: boolean;
}

interface StockHit extends Media {
  readonly caption: string | null;
}

interface WebResult {
  readonly title: string;
  readonly link: string;
  readonly snippet: string;
  readonly position: number;
  readonly date?: string | null;
}

interface WebImage extends Media {
  readonly title?: string | null;
  readonly link?: string | null; // the page it was found on
  readonly site?: string | null;
}

interface SocialResult {
  readonly platform: string;
  readonly url: string;
  readonly thumbnail_url?: string | null;
  readonly caption?: string | null;
  readonly [field: string]: unknown;
}

type Scraped =
  | { readonly kind: "page"; readonly url: string; readonly text: string; readonly text_path: string; readonly images: Media[] }
  | {
      readonly kind: "social";
      readonly url: string;
      readonly platform: "instagram" | "tiktok" | "x";
      readonly caption: string | null;
      readonly post_kind: string;
      readonly caption_path: string | null;
      readonly image: Media | null;
    }
  | {
      readonly kind: "transcript";
      readonly video_id: string;
      readonly language: string;
      readonly title: string;
      readonly description: string;
      readonly captions_text: string;
    };

declare const __iv_notebook: {
  
  read(path: PublicCodePath): Promise<string>;
  
  media(ref: PublicSequenceRef): Promise<Media>;
  
  list(path: PublicCodePath, opts?: { recursive?: boolean }): Promise<NotebookEntry[]>;
  
  glob(pattern: string, opts: { path: PublicCodePath }): Promise<NotebookEntry[]>;
  
  grep(pattern: string, opts: { path: PublicCodePath; glob?: string; context?: number; ignoreCase?: boolean; offset?: number }): Promise<NotebookMatch[]>;

  sequence(id: string): Promise<Sequence>;
  
  sequences(filter?: {
    thread?: string | Thread;
    state?: Sequence["state"];
    judgement?: "accepted" | "rejected" | "none";
  }): Promise<Sequence[]>;
  
  thread(which: string): Promise<Thread>;
  
  readonly stock: {
    
    search(query: string, opts?: { mediaType?: "video" | "image" | "audio"; n?: number; providers?: string[]; orientation?: string }): Promise<StockHit[]>;
    
  };

};

// /sdk/types/gen/audio_tools.d.ts — gen.audio_tools (import { gen } from "@iv/gen"). Generated from the model registry; do not edit.
// Media, Sequence, MediaRef and GenOptions are in /sdk/types/gen/index.d.ts.
/** Audio Tools — Audio manipulation tools.
 *  @context editor script, workflow
 *  @example const seq = await gen.audio_tools.TRIM({ audio_input: "2.1" });
 */
interface Gen_audio_tools {
  /** TRIM — Trim: Trim an audio file to a specific time range.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.audio_tools.TRIM({ audio_input: "2.1" });
   */
  TRIM(inputs: {
    /** Source audio to trim. */ audio_input: MediaRef<"audio">;
    /** Start time in seconds. At least 0. Default 0. */ start_time?: number;
    /** End time in seconds. At least 0. Default 0. */ end_time?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** EXTRACT — Extract: Extract audio track from a video file.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.audio_tools.EXTRACT({ video_input: "2.1" });
   */
  EXTRACT(inputs: {
    /** Source video to extract audio from. */ video_input: MediaRef<"video">;
    /** Output audio format. Default "mp3". */ format?: "mp3" | "wav" | "ogg" | "aac" | "opus";
  }, opts?: GenOptions): Promise<Sequence>;
  /** CONCAT — Concat: Concatenate multiple audio files into a single audio track.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.audio_tools.CONCAT({ audio_array: ["2.1"] });
   */
  CONCAT(inputs: {
    /** Audio files to concatenate (2-10). At least 2. Up to 10. */ audio_array: MediaRef<"audio">[];
    /** Silent gap duration between items (seconds). At least 0. Default 0. */ gap_duration?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** ADD_AUDIO_TRACK — Add Audio Track: Mix an overlay audio track (e.g. background music) on top of a base audio file. Output duration matches the base audio.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.audio_tools.ADD_AUDIO_TRACK({ base_audio_input: "2.1", overlay_audio_input: "2.1" });
   */
  ADD_AUDIO_TRACK(inputs: {
    /** Base audio (e.g. voiceover) — plays at full volume; output duration matches this. */ base_audio_input: MediaRef<"audio">;
    /** Overlay audio to mix in (e.g. background music). */ overlay_audio_input: MediaRef<"audio">;
    /** Volume of the overlay audio (0.0 = silent, 1.0 = full). From 0 to 2. Default 0.25. */ volume?: number;
    /** When the overlay starts in the base audio (seconds). At least 0. Default 0. */ start_time?: number;
  }, opts?: GenOptions): Promise<Sequence>;
}

// /sdk/types/gen/image_tools.d.ts — gen.image_tools (import { gen } from "@iv/gen"). Generated from the model registry; do not edit.
// Media, Sequence, MediaRef and GenOptions are in /sdk/types/gen/index.d.ts.
/** Image Tools — Image manipulation tools.
 *  @context editor script, workflow
 *  @example const seq = await gen.image_tools.COLLAGE({ image_array: ["2.1"] });
 */
interface Gen_image_tools {
  /** COLLAGE — Collage: Combine multiple images into a single collage.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.image_tools.COLLAGE({ image_array: ["2.1"] });
   */
  COLLAGE(inputs: {
    /** Images to combine (1-8). Up to 8. */ image_array: MediaRef<"image">[];
    /** Output aspect ratio. Options: `16:9`: Landscape (16:9); `9:16`: Portrait (9:16); `1:1`: Square (1:1); `4:3`: Standard (4:3); `3:4`: Portrait (3:4). Default "16:9". */ aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  }, opts?: GenOptions): Promise<Sequence>;
  /** CROP — Crop: Crop a rectangular region from an image.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.image_tools.CROP({ image_input: "2.1" });
   */
  CROP(inputs: {
    /** Source image to crop. */ image_input: MediaRef<"image">;
    /** Left edge position (0.0 to 1.0). From 0 to 1. Default 0. */ x?: number;
    /** Top edge position (0.0 to 1.0). From 0 to 1. Default 0. */ y?: number;
    /** Crop width (0.0 to 1.0). From 0 to 1. Default 1. */ w?: number;
    /** Crop height (0.0 to 1.0). From 0 to 1. Default 1. */ h?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** RESIZE_ASPECT_RATIO — Resize by Aspect Ratio: Resize image to a target aspect ratio with max height.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.image_tools.RESIZE_ASPECT_RATIO({ image_input: "2.1" });
   */
  RESIZE_ASPECT_RATIO(inputs: {
    /** Source image to resize. */ image_input: MediaRef<"image">;
    /** Target aspect ratio. Options: `16:9`: Landscape (16:9); `9:16`: Portrait (9:16). Default "16:9". */ aspect_ratio?: "16:9" | "9:16";
    /** Maximum height in pixels. At least 1. Default 1080. */ max_height?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** RESIZE_FIT — Fit to Dimensions: Resize image to fit within max width and height.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.image_tools.RESIZE_FIT({ image_input: "2.1" });
   */
  RESIZE_FIT(inputs: {
    /** Source image to resize. */ image_input: MediaRef<"image">;
    /** Maximum width in pixels. At least 1. Default 1920. */ max_width?: number;
    /** Maximum height in pixels. At least 1. Default 1080. */ max_height?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** ROTATE — Rotate: Rotate an image by a specified angle.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.image_tools.ROTATE({ image_input: "2.1" });
   */
  ROTATE(inputs: {
    /** Source image to rotate. */ image_input: MediaRef<"image">;
  }, opts?: GenOptions): Promise<Sequence>;
}

// /sdk/types/gen/nanobanana_2.d.ts — gen.nanobanana_2 (import { gen } from "@iv/gen"). Generated from the model registry; do not edit.
// Media, Sequence, MediaRef and GenOptions are in /sdk/types/gen/index.d.ts.
/** Nano Banana 2 (image) — Google's advanced image generation model.
 *  @context editor script, workflow
 *  @example const seq = await gen.nanobanana_2.INGREDIENTS({ prompt: "..." });
 */
interface Gen_nanobanana_2 {
  /** INGREDIENTS — Ingredients: Generate images with reference inputs.
   *  Pricing: 0.24 credits (flat) when resolution=4K; 0.18 credits (flat) when resolution=2K; 0.12 credits (flat) (default); Surcharges:; 0.06 credits (flat) when web_search_grounding=true; 0.06 credits (flat) when image_search_grounding=true.
   *  @context editor script, workflow
   *  @example const seq = await gen.nanobanana_2.INGREDIENTS({ prompt: "..." });
   */
  INGREDIENTS(inputs: {
    /** The text prompt describing what image you want to create. At most 30000 characters. */ prompt: string;
    /** Optional reference images to guide the generation (up to 8). Up to 8. */ reference_images?: MediaRef<"image">[];
    /** Aspect ratio for the generated images. Options: `1:1`: Square (1:1); `1:4`: Tall (1:4); `1:8`: Extra Tall (1:8); `2:3`: Portrait (2:3); `3:2`: Landscape (3:2); `3:4`: Portrait (3:4); `4:1`: Wide (4:1); `4:3`: Landscape (4:3); `4:5`: Portrait (4:5); `5:4`: Landscape (5:4); `8:1`: Extra Wide (8:1); `9:16`: Vertical (9:16); `16:9`: Horizontal (16:9); `21:9`: Ultrawide (21:9). Default "16:9". */ aspect_ratio?: "auto" | "1:1" | "1:4" | "1:8" | "2:3" | "3:2" | "3:4" | "4:1" | "4:3" | "4:5" | "5:4" | "8:1" | "9:16" | "16:9" | "21:9";
    /** Output resolution quality (1K, 2K, or 4K). Default "1K". */ resolution?: "1K" | "2K" | "4K";
    /** Thinking mode for generation quality. Default "minimal". */ thinking?: "high" | "minimal";
    /** Describe what you don't want in the generated images. */ negative_prompt?: string;
    /** Random seed for reproducible results (-1 for random). An integer. Default -1. */ seed?: number;
    /** Enable web search grounding for more accurate results. Default false. */ web_search_grounding?: boolean;
    /** Enable image search grounding for more accurate results. Default false. */ image_search_grounding?: boolean;
  }, opts?: GenOptions): Promise<Sequence & { readonly image_1: Media<"image"> }>;
}

// /sdk/types/gen/video_tools.d.ts — gen.video_tools (import { gen } from "@iv/gen"). Generated from the model registry; do not edit.
// Media, Sequence, MediaRef and GenOptions are in /sdk/types/gen/index.d.ts.
/** Video Tools — Video manipulation tools.
 *  @context editor script, workflow
 *  @example const seq = await gen.video_tools.TRIM({ video_input: "2.1" });
 */
interface Gen_video_tools {
  /** TRIM — Trim: Trim a video to a specific time range.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.TRIM({ video_input: "2.1" });
   */
  TRIM(inputs: {
    /** Source video to trim. */ video_input: MediaRef<"video">;
    /** Start time in seconds. At least 0. Default 0. */ start_time?: number;
    /** End time in seconds. At least 0. Default 0. */ end_time?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** REVERSE — Reverse: Reverse a video's playback direction.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.REVERSE({ video_input: "2.1" });
   */
  REVERSE(inputs: {
    /** Source video to reverse. */ video_input: MediaRef<"video">;
  }, opts?: GenOptions): Promise<Sequence>;
  /** CHANGE_SPEED — Change Speed: Speed up or slow down a video. Supports constant speed (set start_speed only) or a linear ramp from start_speed to end_speed over the clip's duration. Audio is preserved and pitched to match. Range 0.25x–4x.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.CHANGE_SPEED({ video_input: "2.1" });
   */
  CHANGE_SPEED(inputs: {
    /** Source video to re-time. */ video_input: MediaRef<"video">;
    /** Playback speed multiplier at the start of the clip (0.25 = 4x slow-mo, 1.0 = original, 4.0 = 4x fast). From 0.25 to 4. Default 1. */ start_speed?: number;
    /** Optional playback speed at the end of the clip. When set and different from start_speed, speed ramps linearly across the clip. Omit for constant speed. From 0.25 to 4. */ end_speed?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** STITCH — Stitch: Concatenate multiple videos into a single video. All input videos must share the same aspect ratio, stiching videos of different aspect ratios is not supported. The output resolution matches the lowest-resolution input.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.STITCH({ video_array: ["2.1"] });
   */
  STITCH(inputs: {
    /** Videos to stitch together (2-10). All videos must have the same aspect ratio. At least 2. Up to 10. */ video_array: MediaRef<"video">[];
    /** Output aspect ratio. Options: `16:9`: Landscape (16:9); `9:16`: Portrait (9:16); `1:1`: Square (1:1); `4:3`: Standard (4:3); `3:4`: Portrait (3:4); `21:9`: Ultrawide (21:9); `source`: Match the input videos. Default "16:9". */ aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "source";
  }, opts?: GenOptions): Promise<Sequence>;
  /** SCENE_SPLIT — Scene Split: Split a video into scenes based on content changes.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.SCENE_SPLIT({ video_input: "2.1" });
   */
  SCENE_SPLIT(inputs: {
    /** Source video to split. */ video_input: MediaRef<"video">;
    /** Scene detection sensitivity (0.0-1.0, lower = more splits). From 0 to 1. In steps of 0.05. Default 0.2. */ threshold?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** LOOP — Loop: Loop a video until it reaches a target duration.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.LOOP({ video_input: "2.1" });
   */
  LOOP(inputs: {
    /** Source video to loop. */ video_input: MediaRef<"video">;
    /** Target duration in seconds. At least 1. Default 10. */ target_duration?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** EXTRACT_FRAME_FIRST — First Frame: Extract the first frame of a video.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.EXTRACT_FRAME_FIRST({ video_input: "2.1" });
   */
  EXTRACT_FRAME_FIRST(inputs: {
    /** Source video to extract frame from. */ video_input: MediaRef<"video">;
  }, opts?: GenOptions): Promise<Sequence>;
  /** EXTRACT_FRAME_LAST — Last Frame: Extract the last frame of a video.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.EXTRACT_FRAME_LAST({ video_input: "2.1" });
   */
  EXTRACT_FRAME_LAST(inputs: {
    /** Source video to extract frame from. */ video_input: MediaRef<"video">;
  }, opts?: GenOptions): Promise<Sequence>;
  /** EXTRACT_FRAME_BY_NUMBER — Frame by Number: Extract a specific frame by its number.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.EXTRACT_FRAME_BY_NUMBER({ video_input: "2.1" });
   */
  EXTRACT_FRAME_BY_NUMBER(inputs: {
    /** Source video to extract frame from. */ video_input: MediaRef<"video">;
    /** Frame number to extract (1-based). At least 1. Default 1. */ frame_number?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** EXTRACT_FRAME_AT_TIME — Frame at Time: Extract the frame at a specific second.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.EXTRACT_FRAME_AT_TIME({ video_input: "2.1" });
   */
  EXTRACT_FRAME_AT_TIME(inputs: {
    /** Source video to extract frame from. */ video_input: MediaRef<"video">;
    /** Time in seconds to extract frame at. At least 0. Default 0. */ time_seconds?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** EXTRACT_FRAME_INTERVAL — Frames at Frame Interval: Extract every Nth frame (interval measured in frames).
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.EXTRACT_FRAME_INTERVAL({ video_input: "2.1" });
   */
  EXTRACT_FRAME_INTERVAL(inputs: {
    /** Source video to extract frames from. */ video_input: MediaRef<"video">;
    /** Interval in frames between extracted frames (1 = every frame, 2 = every other frame). At least 1. Default 1. */ frame_interval?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** EXTRACT_MS_INTERVAL — Frames at Time Interval: Extract a frame every N milliseconds (time-uniform sampling).
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.EXTRACT_MS_INTERVAL({ video_input: "2.1" });
   */
  EXTRACT_MS_INTERVAL(inputs: {
    /** Source video to extract frames from. */ video_input: MediaRef<"video">;
    /** Interval in milliseconds between frames (1000 = one per second, 500 = two per second). At least 1. Default 1000. */ interval_ms?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** REPLACE_AUDIO — Replace Audio: Replace the audio track of a video with a new audio file. In case of a mismatch the audio will be truncated or passed with silence to match the video's duration.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.REPLACE_AUDIO({ video_input: "2.1", audio_input: "2.1" });
   */
  REPLACE_AUDIO(inputs: {
    /** Source video. */ video_input: MediaRef<"video">;
    /** Replacement audio track. */ audio_input: MediaRef<"audio">;
  }, opts?: GenOptions): Promise<Sequence>;
  /** ADD_AUDIO_TRACK — Add Audio Track: Mix an additional audio track (e.g. background music) into a video alongside its existing audio. In case of a mismatch the new audio will be truncated or padded with silence to match the video's duration.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.ADD_AUDIO_TRACK({ video_input: "2.1", audio_input: "2.1" });
   */
  ADD_AUDIO_TRACK(inputs: {
    /** Source video. */ video_input: MediaRef<"video">;
    /** Audio track to add alongside the video's existing audio. */ audio_input: MediaRef<"audio">;
    /** Volume of the new audio track (0.0 = silent, 1.0 = full). From 0 to 2. In steps of 0.05. Default 0.25. */ volume?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** RESIZE — Resize: Transcode a video to H.264 MP4 scaled to a target height (240/360/480/720/1080). Width is set automatically to preserve aspect ratio. Output is always .mp4 regardless of input format.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.RESIZE({ video_input: "2.1" });
   */
  RESIZE(inputs: {
    /** Video to resize (any format). Output will always be H.264 MP4. */ video_input: MediaRef<"video">;
    /** Target video height in pixels; width auto-scales to preserve aspect ratio. For portrait videos, a small height gives a small total pixel count — a 480x848 portrait resized to height 720 becomes 408x720 (fewer pixels, not more). To increase total pixel count, pick a height larger than the source height. Default "1080". */ resolution?: "240" | "360" | "480" | "720" | "1080";
  }, opts?: GenOptions): Promise<Sequence>;
  /** AUDIO_TO_VIDEO — Audio to Video: Wrap an audio file (e.g. a voiceover) into a black/blank silent-visual video of the same duration. Use this to build a Seedance R2V lipsync-drive clip: feed the resulting video into Seedance's reference VIDEO slot so the model lip-syncs to the audio.
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.AUDIO_TO_VIDEO({ audio_input: "2.1" });
   */
  AUDIO_TO_VIDEO(inputs: {
    /** Source audio (e.g. voiceover) to wrap into a blank video. */ audio_input: MediaRef<"audio">;
    /** Output aspect ratio. Options: `16:9`: Landscape (16:9); `9:16`: Portrait (9:16); `1:1`: Square (1:1); `4:3`: Standard (4:3); `3:4`: Portrait (3:4); `21:9`: Ultrawide (21:9). Default "16:9". */ aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
    /** Output frame rate (frames per second). From 1 to 120. Default 30. */ fps?: number;
  }, opts?: GenOptions): Promise<Sequence>;
  /** CONTACT_SHEET — Contact sheet: One image of evenly spaced frames from the video, laid out in a grid (at most 10x10 tiles).
   *  Pricing: 0.0 credits (flat) (default).
   *  @context editor script, workflow
   *  @example const seq = await gen.video_tools.CONTACT_SHEET({ video_input: "2.1" });
   */
  CONTACT_SHEET(inputs: {
    /** Source video to build the contact sheet from. */ video_input: MediaRef<"video">;
    /** Number of tile columns (1-10). An integer. From 1 to 10. Default 3. */ columns?: number;
    /** Number of tile rows (1-10). An integer. From 1 to 10. Default 3. */ rows?: number;
    /** Height of the whole contact sheet image in pixels. Default "480". */ resolution?: "240" | "360" | "480" | "720" | "1080";
    /** labeled stamps each tile's timecode; plain is bare frames. Default "labeled". */ style?: "labeled" | "plain";
    /** Milliseconds of the source to skip before sampling frames. An integer. At least 0. Default 0. */ start_offset_ms?: number;
  }, opts?: GenOptions): Promise<Sequence>;
}
