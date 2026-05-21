// app/not-found.tsx — Story 2.7
//
// 404 global renderizado por `notFound()` (de `next/navigation`) chamado em
// qualquer Server Component da árvore. Hoje o consumidor primário é
// `app/[username]/page.tsx` (rota pública): username inexistente,
// `page.is_published=false`, ou path sem prefixo `@` caem aqui.
//
// Server Component (sem `'use client'`), sem JS extra — herda `<RootLayout>`
// (Geist fonts, Toaster, theme tokens). `next/link` para o "Voltar"
// preserva client-side navigation e satisfaz `@next/next/no-html-link-for-pages`.

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground">A página que você procura não existe ou foi removida.</p>
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        Voltar para o início
      </Link>
    </main>
  );
}
