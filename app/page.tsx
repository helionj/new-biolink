import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

const GITHUB_REPO_URL = 'https://github.com/helionj/new-biolink';

const BENEFITS = [
  'Do cadastro à primeira página publicada em apenas 2 cliques.',
  'Todos os seus links reunidos em um único endereço profissional.',
  'Acompanhe os acessos e descubra o que a sua audiência mais clica.',
] as const;

export const metadata: Metadata = {
  title: 'BioLink — sua presença digital em um único link',
  description:
    'Crie uma página link-in-bio profissional em minutos: reúna todos os seus links, personalize e acompanhe os acessos — do cadastro à primeira publicação em 2 cliques.',
  openGraph: {
    title: 'BioLink — sua presença digital em um único link',
    description:
      'Crie uma página link-in-bio profissional em minutos. Do cadastro à primeira publicação em 2 cliques.',
    images: [{ url: '/og-image.png' }],
  },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctaHref = user ? '/dashboard' : '/signup';
  const ctaLabel = user ? 'Ir para meu dashboard' : 'Criar minha página';

  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME ?? 'dev';
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'local';

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Sua presença digital em um único link
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          O BioLink reúne todos os seus links em uma página profissional — do cadastro à primeira
          publicação em apenas 2 cliques.
        </p>
        <Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
          {ctaLabel}
        </Link>
      </section>

      <section className="border-t border-border px-6 py-16">
        <ul className="mx-auto flex max-w-3xl flex-col gap-8 sm:flex-row">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex-1 text-center text-base text-foreground sm:text-left">
              {benefit}
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 sm:flex-row">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            GitHub
          </a>
          <p className="text-xs text-muted-foreground">
            Build {buildTime} · {commitSha}
          </p>
        </div>
      </footer>
    </main>
  );
}
