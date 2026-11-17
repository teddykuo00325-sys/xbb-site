# Sound exploration library — 2026-11-12

## 2026-11-12 catalog v3: nature sounds retired, cat and household sounds added

Ian asked to remove the nature sounds and add another cat sound. Retired from
the explorer (files moved out of the app, recoverable copies in
`releases/V161.1/backups/sound-nature-removed/`): bird, rustle, rain, drops,
stream, drizzle. Their old IDs stay valid in saved data so favorites, avoids and
reaction records are kept; the daily draw of catalog v2 days is preserved and
retired sounds are simply not offered. Seven new recordings were added, making
the explorer 13 choices (the six remaining earlier recordings are unchanged).

Source pages were checked on 2026-11-12 and each states CC0; public HQ previews
were downloaded without login. Processing as below (fixed excerpt up to 8 s).
Measurements and hashes: `docs/sound-recordings-new-metrics.json`.

| Stable ID / file | Creator and original source | Excerpt |
| --- | --- | --- |
| meow / `meow-recording.mp3` | dreamstobecome — [cat chirp.wav](https://freesound.org/people/dreamstobecome/sounds/451250/) | 0–7.8 s |
| scratch / `scratch-recording.mp3` | Samantha_Dolman — [Cat Scratching A Post](https://freesound.org/people/Samantha_Dolman/sounds/490730/) | 7.5–15.5 s |
| box / `box-recording.mp3` | PersonMakingSounds — [Cardboard Rubbing or Tearing](https://freesound.org/people/PersonMakingSounds/sounds/431528/) | 0–5.6 s |
| toy / `toy-recording.mp3` | Kiano.ow — [Cat Playing with Toy.wav](https://freesound.org/people/Kiano.ow/sounds/594132/) | 3.5–11.5 s |
| jingle / `jingle-recording.mp3` | Abir19 — [pettoy;jingle.wav](https://freesound.org/people/Abir19/sounds/629517/) | 0–3.3 s |
| plastic / `plastic-recording.mp3` | dster777 — [Plastic Bag 1.wav](https://freesound.org/people/dster777/sounds/344555/) | 0.1–8.1 s |
| wood / `wood-recording.mp3` | Anzbot — [Wooden clicks.wav](https://freesound.org/people/Anzbot/sounds/565027/) | 0–3.9 s |

**Full human listening review is pending** for all seven; excerpts were chosen
by loudness analysis and source metadata, not by listening. Technical checks do
not establish absence of voices or sudden background events, or any cat
preference. The seven matching `*-friend.svg` illustrations are original vector
artwork. Entries below that mention bird, rustle, rain, drops, stream or drizzle
are historical; those files are no longer shipped in the explorer. The one exception is `rustle.mp3`, which stays packaged only as the optional play-lab cue (陪玩「沙沙聲」), not as an explorer sound; `drops.wav` and `chimes.wav` also remain for play-lab cues.

## Earlier catalog notes (2026-11-11)

The previous twelve sound-exploration choices were recordings documented as CC0.
The four synthesized choices were replaced by separate recording files on
2026-11-11; stable track IDs retain existing history and preferences. The eight
earlier recording files are unchanged. Legacy WAV files remain packaged for
existing play-mode cues and are not relabelled as recordings.

## 2026-11-11 real-recording replacements

Exact source pages and the CC0 deed were checked on 2026-11-11. CC0 permits
copying, modification and distribution for commercial purposes without asking
permission; it does not imply author endorsement. Public HQ previews were
downloaded without account login. All new excerpts are 8 seconds, at original
speed, with no looping, synthetic extension or AI-generated sound.

| Stable ID / file | Creator and original source | Excerpt |
| --- | --- | --- |
| rain / `rain-recording.mp3` | Legnalegna55 — [Gentle rain on window](https://freesound.org/people/Legnalegna55/sounds/553390/) | 12–20 s |
| drops / `drops-recording.mp3` | yurkobb — [Water drops](https://freesound.org/people/yurkobb/sounds/181890/) | 8–16 s |
| chimes / `chimes-recording.mp3` | hz37 — [Wind chimes](https://freesound.org/people/hz37/sounds/792470/) | 2–10 s |
| hum / `hum-recording.mp3` | rareguy27 — [Cat purr.wav](https://freesound.org/people/rareguy27/sounds/690620/) | 8–16 s |

The hum ID now plays a real cat purr, not the earlier synthesized low tone.
Past saved observations describe the audio heard then; replacing a source does
not establish the same reaction to the new recording.

Processing: 40 Hz high-pass, 250 ms fade-in, 400 ms fade-out; FFmpeg loudnorm
target -23 LUFS / -8 dBTP / LRA 7; stereo 44.1 kHz / 160 kbps MP3. Final decoded
true peaks are checked below -6 dBTP. Dynamic source material may remain quieter
than the integrated loudness target. Public preview URLs, original and output
SHA-256 values, exact durations and final measurements are recorded in
`docs/sound-recordings-196-metrics.json` in the app repository. Original previews,
source-page HTML evidence and processing script are retained locally under
`releases/V161.1/backups/sound-real-before/`.

**Full human listening review is pending.** The excerpts were selected by fixed
time ranges and source descriptions, not a complete audition. Technical checks
do not establish absence of voices, abrupt background events, or cat preference.
The app does not claim a calming or therapeutic effect.

License deed: https://creativecommons.org/publicdomain/zero/1.0/

## Historical catalog notes below

The following entries describe prior versions; the four WAVs are no longer
sound-exploration choices, but their original provenance is retained.

## Existing field recordings

- `can-open.mp3`: **can_open.wav** by MLaudio, opening a can of cat food; https://freesound.org/people/MLaudio/sounds/531474/ — CC0 as checked on the source page. Public HQ preview: https://cdn.freesound.org/previews/531/531474_6890478-hq.mp3 (4.527891 s).
- `food-bag-open.mp3`: **opening cat food bag.wav** by VoxHumanaMusiCurators, opening a cat food bag and serving; https://freesound.org/people/VoxHumanaMusiCurators/sounds/529798/ — CC0 as checked on the source page. Public HQ preview: https://cdn.freesound.org/previews/529/529798_25142-hq.mp3 (5.535125 s).
- License: https://creativecommons.org/publicdomain/zero/1.0/

Processing: FFmpeg, high-pass at 60 Hz, loudnorm I=-23/TP=-6/LRA=7, 25 ms fade-in and 100 ms fade-out, stereo 44.1 kHz / 160 kbps MP3. No loops, no artificial extension to 15 seconds. Playback is user initiated, mutually exclusive, and stops on exit/background. Original previews retained outside the checkout in the task artifacts folder.

Additional existing recordings (original audio files unchanged):

- `birds.mp3`: soundofsong, https://freesound.org/people/soundofsong/sounds/640781/ — CC0, existing 15-second excerpt.
- `rustle.mp3`: Wigglesworth, https://freesound.org/people/Wigglesworth/sounds/767220/ — CC0, existing 15-second excerpt.

## Original computer-synthesized effects

These four WAVs are original computer-synthesized effects created for this
prototype with `scripts/generate-sound-effects.py` using only Python's standard
library. They use no external samples or third-party sound libraries. They are
not field recordings and are not covered by the CC0 source citations above.
No third-party recording, creator attribution, or license is claimed for them.

- `rain.wav`: soft filtered pseudorandom noise, with three low-pass stages at
  1,300 Hz, a low-frequency cut at 85 Hz, and slow level modulation. Fixed seed:
  2026110501. A synthetic rain-like texture, not recorded rainfall.
- `drops.wav`: seven rounded sine-based plucks with smoothly descending pitch
  and a weak inharmonic partial. Fixed seed: 2026110502. A water-like synthetic
  effect, not recorded water drops.
- `chimes.wav`: five muted pitched taps at 392.00, 523.25, 440.00, 587.33, and
  392.00 Hz, with short, quiet upper partials. Deterministic synthesis without
  randomness. Not a recording of physical chimes.
- `hum.wav`: a 130.8128 Hz tone with quiet second and third harmonics and shallow
  slow modulation. Deterministic synthesis without randomness. Not a purr or
  other animal recording.

Each file is exactly 6.0 seconds, mono, 44.1 kHz, 16-bit uncompressed PCM WAV,
529,244 bytes. All use 0.4-second raised-cosine fade-in and fade-out. Their peak
sample level is normalized below 0.16 of full scale, with no clipped samples.
Reproduce with `python3 scripts/generate-sound-effects.py`; verify byte-for-byte
without writing using `python3 scripts/generate-sound-effects.py --check`.

Signal-level checks are not a listening test and are not evidence of safety or
a calming effect for any cat. Playback volume and individual responses vary.
Start quietly, supervise, and stop playback if the cat appears uncomfortable.

The prototype offers an explicitly labelled Pro trial without real billing.
Free and Pro share one player and cannot play simultaneously. The four existing
SVG card illustrations are original vector artwork created for this prototype.

## 2026-11-06 remaster

The same four track IDs were remade in `scripts/generate-sound-effects.py`:
- `rain.wav`: a new seeded, filtered rain-like noise texture with slower swells.
- `drops.wav`: eight new rounded pitch-bending droplets with short resonances.
- `chimes.wav`: a new five-note phrase with softened attacks and decaying partials.
- `hum.wav`: a new warm low tone with harmonic layers and slow modulation.

Each remains 6 seconds, mono, 44.1 kHz, 16-bit PCM, with 0.6-second end fades and a peak limit of 0.14. There are no external samples. New image illustrations were generated with built-in ImageGen and stored as `*-art-v98.jpg`; original PNGs and prompts are in `docs/sound-art-originals/`. Existing four CC0 recordings and the eight track IDs remain unchanged, so saved preferences and history still reference the same choices. Measured hashes and levels: `docs/sound-v98-metrics.json`. Reproduce with `python3 scripts/generate-sound-effects.py --check`.


## Twelve-choice catalog additions — 2026-11-08

**Audition remains incomplete.** Publication was approved after this limitation
was disclosed. Technical checks and browser playback checks passed, but neither
the four complete source recordings nor the four final excerpts have undergone
a complete listening review. Signal analysis does not establish absence of
voices, thunder, distracting background events, or subjective harshness. It does
not establish safety, preference, or calming for cats.

The existing eight files above remain byte-for-byte unchanged. This update adds
four separate real recordings, resulting in eight recordings plus four existing
programmatically synthesized effects. No AI audio generation, new synthesis,
looping, extension, or time stretching was used. Free access remains two daily
choices plus one daily care unlock; Pro has all twelve. Existing saved eight-
choice days and their earned bonus are preserved when upgrading.

All four exact source pages were rechecked on 2026-11-08 and state CC0.
CC0 terms: https://creativecommons.org/publicdomain/zero/1.0/

- `stream.mp3`: BurghRecords, https://freesound.org/people/BurghRecords/sounds/446019/. CC0. Public HQ preview: https://cdn.freesound.org/previews/446/446019_7241289-hq.mp3. Selected 49.50–59.50 s; output 10.000000 s. SHA-256 `ce30f0db13600ea7873596afda2c327887b3fd1674fc49c631b7044723a023d5`. **Pending full audition.**
- `drizzle.mp3`: SpinOpel, https://freesound.org/people/SpinOpel/sounds/772244/. CC0. Public HQ preview: https://cdn.freesound.org/previews/772/772244_16303686-hq.mp3. Selected 25.25–35.25 s; output 10.000000 s. SHA-256 `a600c8ea4019e3d85ec4e0937814ff8921303ff85e59f4390bbe7235e8490138`. **Pending full audition.**
- `paper.mp3`: keweldog, https://freesound.org/people/keweldog/sounds/181774/. CC0. Public HQ preview: https://cdn.freesound.org/previews/181/181774_3153523-hq.mp3. Selected 0.00–4.83 s; output 4.830771 s. SHA-256 `8b828c9802923a667fe9d257f4b7e880f702599954783b4a5ce9c9e166867183`. **Pending full audition.**
- `cloth.mp3`: IENBA, https://freesound.org/people/IENBA/sounds/850705/. CC0. Public HQ preview: https://cdn.freesound.org/previews/850/850705_9616576-hq.mp3. Selected 1.00–11.00 s; output 10.000000 s. SHA-256 `7e08034590bed7d15581e1f0059d62479326511cd9329a1513d6fede94618b59`. **Pending full audition.**

Processing: FFmpeg, 60 Hz high-pass; 250 ms fade-in and 400 ms fade-out
(paper: 80/150 ms); loudness target −23 LUFS, true-peak constraint ≤ −6 dBTP;
44.1 kHz stereo 160 kbps MP3. Fine rain additionally uses a 6.5 kHz two-pole
low-pass. No denoising was applied. Segment selection was algorithmic and is
not a listening-based editorial decision. Final output measurements and exact
filters are in `docs/sound-catalog12-candidates/metrics.json`.

The four matching `*-friend.svg` illustrations are original code-native vector
artwork made for this prototype, using no external artwork.
