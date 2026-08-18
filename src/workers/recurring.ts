import { processRecurring } from "@/modules/recurring/service";

// Cria ocorrências recorrentes sob demanda (README 62). Não publica — só gera posts SCHEDULED.
export function startRecurring(): NodeJS.Timeout {
  console.log("[recurring] iniciado");
  return setInterval(async () => {
    try {
      const n = await processRecurring();
      if (n > 0) console.log(`[recurring] criadas ${n} ocorrências`);
    } catch (e) {
      console.error("[recurring] erro", e);
    }
  }, 60_000);
}
