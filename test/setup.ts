import "dotenv/config";
// Garante chave de criptografia válida em ambiente de teste.
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
}
