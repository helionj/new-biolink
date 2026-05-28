type Row = {
  id: string;
  title: string;
  url: string;
  clicks7d: number;
  clicks30d: number;
  clicksTotal: number;
};

type Props = {
  rows: Row[];
};

export function LinksTable({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Cliques por link</caption>
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Título
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              URL
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Cliques 7d
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Cliques 30d
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-2 font-medium">{row.title}</td>
              <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={row.url}
                  className="hover:underline"
                >
                  {row.url}
                </a>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {row.clicks7d.toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {row.clicks30d.toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">
                {row.clicksTotal.toLocaleString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
