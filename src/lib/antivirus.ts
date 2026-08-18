// Verificação de malware (README 53). Stub: integrar ClamAV (clamd) em produção.
// Habilite com ENABLE_ANTIVIRUS=true. Sem isso, é no-op que aprova.
export async function scanObject(storageKey: string): Promise<{ clean: boolean; engine: string }> {
  if ((process.env.ENABLE_ANTIVIRUS ?? "false") !== "true") {
    return { clean: true, engine: "disabled" };
  }
  // TODO: baixar objeto (stream) e enviar ao clamd via INSTREAM.
  console.log(`[antivirus] (stub) escaneando ${storageKey}`);
  return { clean: true, engine: "clamav-stub" };
}
