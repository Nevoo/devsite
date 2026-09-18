import type { Photo } from './categories'

/**
 * The hero plate — and the reason the whole hero is built the way it is.
 *
 * This file is a *video still*, exported off an edit timeline. That is not a
 * detail, it is the concept: the one artefact that belongs to both halves of
 * what Rouven does. A frame is a photograph AND a unit of a sequence; a still
 * export is a photographer's output AND a build artefact with a timecode on it.
 * So the hero does not treat it as wallpaper. It treats it as a frame: shown
 * whole in a 16:9 window, never cropped to a viewport, never covered by type,
 * with its slate underneath it.
 *
 * It also arrives the way a frame actually arrives. Everything comes off a
 * camera flat — low contrast, lifted blacks, desaturated — and then somebody
 * writes a look and runs it over every frame. That is the same job as writing
 * a transform and running it over your data, which is why the entrance is a
 * colourist's split-screen wipe (see the grade block in shaders/imagePlane.ts):
 * log on the right, graded on the left, an accent hairline travelling between
 * them. Both sides are a legible photograph at every instant, which is what the
 * old mosaic decode could not manage.
 *
 * Lives in its own module so the loader can preload the exact file the hero
 * renders without importing the Home page (the loader stays lightweight and
 * three.js-free by design).
 */
export const heroPhoto: Photo = {
  src: '/images/hero-plate.jpg',
  width: 1920,
  height: 1080,
  // shown in full in a 16:9 window, so the crop has no slack to art-direct;
  // centre is correct and the focus only bites during the in-frame parallax
  focus: [0.5, 0.5],
  // no clip until the real delivery file exists: `clip: '/videos/<file>.mp4'`
  // keeps `src` as the poster and the wipe/drag run on the footage unchanged
}

export const heroAlt =
  'a wide valley under a broken sky, fence line running to the mountains'

/**
 * The slate under the plate. A film slate and a data record are the same
 * object — labelled fields attached to an image — which is why this is the
 * hero's second information layer rather than a tagline.
 *
 * Only carries what is actually true of the file. `location` is deliberately
 * empty: it renders only when set, so a wrong place name never ships. Fill it
 * in and the rail picks it up.
 */
export const heroSlate = {
  /** from the export's own name: Still …_1.43.1 */
  timecode: '01:43:01',
  /** e.g. 'matukituki valley, nz' — rendered only when non-empty */
  location: '',
  /** the transform the entrance runs, start → end */
  from: 's-log3',
  to: 'rec.709',
}
