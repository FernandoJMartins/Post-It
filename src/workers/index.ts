import "dotenv/config";
import { startScheduler } from "./scheduler";
import { startPublisher } from "./publisher";
import { startNotifications } from "./notifications";
import { startReconciliation } from "./reconciliation";
import { startMedia } from "./media";
import { startRecurring } from "./recurring";
import { startTokenHealth } from "./tokenhealth";

// Processo de workers (README 25, 138). Descartável e reiniciável sem perda.
async function main() {
  const scheduler = startScheduler();
  const publisher = startPublisher();
  const media = startMedia();
  const notifications = startNotifications();
  const reconciliation = startReconciliation();
  const recurring = startRecurring();
  const tokenHealth = startTokenHealth();

  const shutdown = async () => {
    console.log("[workers] encerrando...");
    clearInterval(scheduler);
    clearInterval(reconciliation);
    clearInterval(recurring);
    clearInterval(tokenHealth);
    await Promise.allSettled([publisher.close(), media.close(), notifications.close()]);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((e) => {
  console.error("[workers] falha fatal", e);
  process.exit(1);
});
