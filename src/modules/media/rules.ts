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
