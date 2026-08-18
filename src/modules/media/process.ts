import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import { getObjectBuffer, getObjectHead, putObject, presignGet } from "@/lib/storage";

const run = promisify(execFile);

// MIME real por assinatura de arquivo (README 52). MP4/MOV começam com box 'ftyp'.
export function sniffMime(head: Buffer): string | null {
  if (head.length >= 12 && head.toString("latin1", 4, 8) === "ftyp") {
    const brand = head.toString("latin1", 8, 12);
    return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  return null;
}

export type ProbeResult = {
  mime: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
};

// Baixa a mídia, valida assinatura, extrai metadados (ffprobe) e gera thumbnail (ffmpeg).
export async function processMedia(storageKey: string): Promise<ProbeResult> {
  const head = await getObjectHead(storageKey, 16);
  const mime = sniffMime(head);

  const buf = await getObjectBuffer(storageKey);
  const dir = await mkdtemp(join(tmpdir(), "media-"));
  const input = join(dir, "input");
  const thumb = join(dir, "thumb.jpg");
  await writeFile(input, buf);

  let durationSeconds: number | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let thumbnailKey: string | null = null;
  let thumbnailUrl: string | null = null;

  try {
    // ffprobe: duração e resolução.
    const { stdout } = await run(ffprobe.path, [
      "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", input,
    ]);
    const meta = JSON.parse(stdout);
    const v = (meta.streams ?? []).find((s: { codec_type?: string }) => s.codec_type === "video");
    if (v) {
      width = Number(v.width) || null;
      height = Number(v.height) || null;
    }
    const dur = Number(meta.format?.duration);
    durationSeconds = Number.isFinite(dur) ? Math.round(dur) : null;

    // ffmpeg: 1 frame ~1s como thumbnail.
    if (ffmpegPath) {
      await run(ffmpegPath, ["-y", "-ss", "1", "-i", input, "-vframes", "1", "-q:v", "3", thumb]);
      const thumbBuf = await readFile(thumb);
      thumbnailKey = storageKey.replace(/original$/, "thumbnail.jpg");
      if (thumbnailKey === storageKey) thumbnailKey = `${storageKey}-thumb.jpg`;
      await putObject(thumbnailKey, thumbBuf, "image/jpeg");
      thumbnailUrl = await presignGet(thumbnailKey);
    }
  } finally {
    await Promise.allSettled([unlink(input), unlink(thumb)]);
  }

  return { mime, durationSeconds, width, height, thumbnailKey, thumbnailUrl };
}
