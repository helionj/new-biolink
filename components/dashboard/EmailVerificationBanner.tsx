interface Props {
  emailConfirmedAt: string | null | undefined;
}

export function EmailVerificationBanner({ emailConfirmedAt }: Props) {
  if (emailConfirmedAt) return null;

  return (
    <div
      role="status"
      className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900"
    >
      <strong className="font-medium">Confirme seu email</strong> para garantir o acesso à sua
      conta. (Em breve: reenvio de email)
    </div>
  );
}
