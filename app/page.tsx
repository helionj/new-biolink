import { BarChart3Icon, CodeIcon, ExternalLinkIcon, ShieldCheckIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Wordmark } from '@/components/brand/Wordmark';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

const GITHUB_REPO_URL = 'https://github.com/helionj/new-biolink';

const MOTIVOS = [
  {
    icon: ShieldCheckIcon,
    title: 'Sem ads forçados',
    description: 'Seu perfil 100% seu, sempre.',
  },
  {
    icon: BarChart3Icon,
    title: 'Analytics próprios',
    description: '7d e 30d, sem terceiros.',
  },
  {
    icon: CodeIcon,
    title: 'Open source',
    description: 'Código auditável no GitHub.',
  },
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
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-screen-lg items-center justify-between px-6">
          <Wordmark href="/" size="md" />
          {!user && (
            <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>
              Entrar
            </Link>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center min-h-[calc(100vh-3.5rem)]">
          <h1 className="text-display max-w-2xl">Seu link na bio, do seu jeito.</h1>
          <p className="text-body-lg max-w-xl text-muted-foreground">
            Crie sua página pública gratuita — seus links, seus dados.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href={ctaHref}
              className={cn(buttonVariants({ size: 'lg' }), 'h-12 w-full sm:w-auto')}
            >
              {ctaLabel} →
            </Link>
            {!user && (
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost' }), 'h-12 w-full sm:w-auto')}
              >
                Já tem conta? Entrar →
              </Link>
            )}
          </div>
        </section>

        <section className="border-t border-border px-6 py-16">
          <div className="mx-auto max-w-screen-lg">
            <p className="text-body-sm mb-6 text-center uppercase tracking-wide text-muted-foreground">
              3 motivos:
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {MOTIVOS.map(({ icon: Icon, title, description }) => (
                <Card key={title}>
                  <CardHeader>
                    <Icon className="size-6 text-primary" aria-hidden="true" />
                    <CardTitle className="text-h2 mt-2">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-border px-6 py-8">
          <div className="mx-auto flex max-w-screen-lg flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ExternalLinkIcon className="size-4" aria-hidden="true" /> open-source no GitHub
            </a>
            <p className="text-body-sm text-muted-foreground">gratuito • LGPD-mindful</p>
            <p className="text-caption text-muted-foreground/70">
              Build {buildTime} · {commitSha}
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
