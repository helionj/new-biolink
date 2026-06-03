import { BarChart3 } from 'lucide-react';

type Props = {
  siteUrl: string;
  username: string;
};

export function EmptyAnalyticsState({ siteUrl, username }: Props) {
  const publicUrl = username ? `${siteUrl}/@${username}` : siteUrl;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-h3 font-medium">Sem analytics ainda</h2>
        <p className="mx-auto mt-2 max-w-md text-body text-muted-foreground">
          {username
            ? `Compartilhe sua página em /@${username} para começar a ver dados aqui.`
            : 'Compartilhe sua página para começar a ver dados aqui.'}
        </p>
        {username ? (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-body-sm font-medium underline hover:no-underline"
          >
            Ver minha página pública
          </a>
        ) : null}
      </div>
    </div>
  );
}
