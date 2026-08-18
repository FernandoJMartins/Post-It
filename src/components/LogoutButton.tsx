"use client";

import { signOut } from "next-auth/react";

// Botão de logout (README 146: cadastro, login, logout).
export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/login" })}
      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      Sair
    </button>
  );
}
