import {
  AtSign,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Code,
  Coffee,
  DollarSign,
  ExternalLink,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Headphones,
  Heart,
  Image,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Newspaper,
  Palette,
  PenTool,
  Phone,
  PlayCircle,
  Podcast,
  Rss,
  Send,
  ShoppingBag,
  Star,
  Store,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';

// Catálogo curado de ícones para o select do AddLinkModal (DEV-5).
//
// Cada `slug` é kebab-case, casa o CHECK do DB `^[a-z0-9-]{1,40}$`
// (supabase/migrations/0004_links.sql) e mapeia para um componente que
// EXISTE em lucide-react ^1.14.0 (verificado — ícones de marca como
// instagram/github foram removidos do lucide por política de trademark;
// usamos ícones genéricos por propósito). Escopo curado tem latitude
// sancionada (DEV-5 / @po v0.2): ajustável sem refactor.

export interface LinkIconOption {
  slug: string;
  label: string;
}

const FALLBACK_ICON: LucideIcon = LinkIcon;

const ICON_MAP: Record<string, LucideIcon> = {
  link: LinkIcon,
  globe: Globe,
  'external-link': ExternalLink,
  mail: Mail,
  phone: Phone,
  'message-circle': MessageCircle,
  send: Send,
  'at-sign': AtSign,
  music: Music,
  headphones: Headphones,
  podcast: Podcast,
  video: Video,
  'play-circle': PlayCircle,
  camera: Camera,
  image: Image,
  'shopping-bag': ShoppingBag,
  store: Store,
  calendar: Calendar,
  'map-pin': MapPin,
  rss: Rss,
  newspaper: Newspaper,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  code: Code,
  'pen-tool': PenTool,
  palette: Palette,
  heart: Heart,
  gift: Gift,
  coffee: Coffee,
  'dollar-sign': DollarSign,
  star: Star,
  'gamepad-2': Gamepad2,
  users: Users,
};

export const LINK_ICONS: readonly LinkIconOption[] = [
  { slug: 'link', label: 'Link' },
  { slug: 'globe', label: 'Site' },
  { slug: 'external-link', label: 'Link externo' },
  { slug: 'mail', label: 'E-mail' },
  { slug: 'phone', label: 'Telefone' },
  { slug: 'message-circle', label: 'Mensagem' },
  { slug: 'send', label: 'Telegram / Enviar' },
  { slug: 'at-sign', label: 'Rede social' },
  { slug: 'music', label: 'Música' },
  { slug: 'headphones', label: 'Áudio' },
  { slug: 'podcast', label: 'Podcast' },
  { slug: 'video', label: 'Vídeo' },
  { slug: 'play-circle', label: 'Stream' },
  { slug: 'camera', label: 'Fotos' },
  { slug: 'image', label: 'Portfólio' },
  { slug: 'shopping-bag', label: 'Loja' },
  { slug: 'store', label: 'Loja física' },
  { slug: 'calendar', label: 'Agenda' },
  { slug: 'map-pin', label: 'Localização' },
  { slug: 'rss', label: 'Blog' },
  { slug: 'newspaper', label: 'Notícias' },
  { slug: 'book-open', label: 'E-book' },
  { slug: 'graduation-cap', label: 'Curso' },
  { slug: 'briefcase', label: 'Trabalho' },
  { slug: 'code', label: 'Projetos' },
  { slug: 'pen-tool', label: 'Design' },
  { slug: 'palette', label: 'Arte' },
  { slug: 'heart', label: 'Apoie' },
  { slug: 'gift', label: 'Doação' },
  { slug: 'coffee', label: 'Me pague um café' },
  { slug: 'dollar-sign', label: 'Pagamento' },
  { slug: 'star', label: 'Destaque' },
  { slug: 'gamepad-2', label: 'Games' },
  { slug: 'users', label: 'Comunidade' },
] as const;

/**
 * Resolve o componente lucide para um slug do catálogo. Retorna o ícone
 * `link` (fallback) quando o slug é nulo/ausente ou não está no catálogo —
 * garante que LinkRow/preview sempre renderizem algo.
 */
export function getLinkIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return FALLBACK_ICON;
  return ICON_MAP[slug] ?? FALLBACK_ICON;
}
