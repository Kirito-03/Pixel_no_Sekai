export type AdminRouteName =
  | 'AdminDashboard'
  | 'AnimeList'
  | 'AnimeForm'
  | 'EpisodeManager'
  | 'AdminLogin'

export type AdminNavItem = {
  key: string
  label: string
  icon: string
  route?: AdminRouteName
  disabled?: boolean
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', route: 'AdminDashboard' },
  { key: 'anime', label: 'Anime', icon: 'film-outline', route: 'AnimeList' },
  { key: 'episodes', label: 'Episodios', icon: 'play-circle-outline', route: 'EpisodeManager', disabled: true },
  { key: 'transcode', label: 'Transcodificación', icon: 'pulse-outline', disabled: true },
  { key: 'storage', label: 'Storage R2', icon: 'cloud-outline', disabled: true },
  { key: 'users', label: 'Usuarios', icon: 'people-outline', disabled: true },
]

