// Política de privacidade (LGPD — README 117). Conteúdo base; ajuste ao seu caso.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 text-sm leading-relaxed">
      <h1 className="mb-4 text-2xl font-bold">Política de Privacidade</h1>
      <p className="mb-3 text-neutral-600 dark:text-neutral-400">Última atualização: 2026.</p>

      <h2 className="mt-4 font-semibold">Dados que coletamos</h2>
      <p className="mb-3">Nome, e-mail e senha (armazenada com hash Argon2id). Metadados das contas do Instagram conectadas e das mídias e publicações que você cria.</p>

      <h2 className="mt-4 font-semibold">Como usamos</h2>
      <p className="mb-3">Exclusivamente para operar o agendamento e a publicação nas suas contas. Tokens de acesso são criptografados e nunca expostos.</p>

      <h2 className="mt-4 font-semibold">Seus direitos (LGPD)</h2>
      <p className="mb-3">Você pode exportar todos os seus dados ou excluir sua conta a qualquer momento em <a href="/settings" className="text-indigo-500">Configurações</a>. A exclusão remove seus arquivos e registros de forma definitiva.</p>

      <h2 className="mt-4 font-semibold">Retenção</h2>
      <p className="mb-3">Mantemos os dados enquanto sua conta existir. Após a exclusão, os dados são removidos, exceto o mínimo exigido por lei.</p>

      <a href="/dashboard" className="text-indigo-500">← Voltar</a>
    </main>
  );
}
