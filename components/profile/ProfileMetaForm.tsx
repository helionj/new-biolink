'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import { UpdateProfileMetaInput } from '@/lib/validators/profile';
import { updateProfileMeta } from '@/server/profile/actions';

// DEV-8: schema sem `.transform` (normalização '' -> null vive na Server
// Action). Input === Output -> compatível com shim shadcn FormField.
type FormValues = UpdateProfileMetaInput;

interface ProfileMetaFormProps {
  currentDisplayName: string | null;
  currentBio: string | null;
}

export function ProfileMetaForm({ currentDisplayName, currentBio }: ProfileMetaFormProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(UpdateProfileMetaInput),
    mode: 'onChange',
    defaultValues: {
      display_name: currentDisplayName ?? '',
      bio: currentBio ?? '',
    },
  });

  // DEV-4: useWatch é o padrão do projeto (silencia warning React Compiler
  // `react-hooks/incompatible-library`). Precedente: UsernameForm.tsx:34.
  const displayNameValue = useWatch({ control: form.control, name: 'display_name' }) ?? '';
  const bioValue = useWatch({ control: form.control, name: 'bio' }) ?? '';

  async function onSubmit(values: FormValues) {
    const res = await updateProfileMeta(values);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) {
          form.setError(field as keyof FormValues, { message: String(message) });
        }
      }
      return;
    }
    toast.success('Perfil atualizado');
    form.reset({
      display_name: res.data.display_name ?? '',
      bio: res.data.bio ?? '',
    });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome de exibição</FormLabel>
              <FormControl>
                {/* DEV-4: value={field.value ?? ''} porque o campo é optional
                    (string | undefined) e React controlled input não aceita undefined. */}
                <Input
                  type="text"
                  placeholder="Seu nome ou como quer aparecer"
                  maxLength={50}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{displayNameValue.length}/50</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Conte algo sobre você (máx. 280 caracteres)"
                  maxLength={280}
                  rows={4}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{bioValue.length}/280</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar perfil'}
        </Button>
      </form>
    </Form>
  );
}
