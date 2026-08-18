// PlatformMediaRules (README 15): centraliza regras de mídia. Configuráveis.
export const PlatformMediaRules = {
  allowedMime: ["video/mp4", "video/quicktime"],
  maxSizeBytes: 500 * 1024 * 1024, // 500MB
  maxDurationSeconds: 90,
};

export function validateUpload(mime: string, sizeBytes: number): string | null {
  if (!PlatformMediaRules.allowedMime.includes(mime)) return "mime_nao_suportado";
  if (sizeBytes > PlatformMediaRules.maxSizeBytes) return "arquivo_muito_grande";
  return null;
}

// Limites de Reels da Meta (README 15). Valores conservadores para evitar erro na API.
export const ReelsRules = {
  minDurationSeconds: 3,
  maxDurationSeconds: 900, // 15 min
  minAspect: 0.01, // largura/altura
  maxAspect: 10,
  recommendedAspect: 9 / 16,
};

// Retorna código de erro se o vídeo não serve como Reel, senão null.
export function validateReels(
  durationSeconds: number | null,
  width: number | null,
  height: number | null,
): string | null {
  if (durationSeconds != null) {
    if (durationSeconds < ReelsRules.minDurationSeconds) return "reels_muito_curto";
    if (durationSeconds > ReelsRules.maxDurationSeconds) return "reels_muito_longo";
  }
  if (width && height) {
    const aspect = width / height;
    if (aspect < ReelsRules.minAspect || aspect > ReelsRules.maxAspect) return "reels_proporcao_invalida";
  }
  return null;
}
