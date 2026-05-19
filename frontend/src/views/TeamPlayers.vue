<template>
  <div class="players-page">
    <div class="players-shell">
      <input
        ref="avatarInput"
        type="file"
        accept="image/*"
        class="visually-hidden"
        @change="handleAvatarUpload"
      >

      <section class="players-hero">
        <div class="hero-main">
          <div class="hero-copy">
            <p class="eyebrow">{{ copy.eyebrow }}</p>
            <h1>{{ team.name || copy.teamFallback }}</h1>
            <p class="hero-description">
              {{ copy.description }}
            </p>

            <div class="hero-pills">
              <span class="hero-pill strong">{{ copy.playersCount(players.length) }}</span>
              <span class="hero-pill">{{ totalGoals }} {{ copy.goalsLower }}</span>
              <span v-if="isCoach" class="hero-pill accent">
                {{ isMainCoach ? copy.mainCoachMode : copy.assistantCoachMode }}
              </span>
            </div>
          </div>

          <div class="hero-nav">
            <router-link :to="`/team/${teamId}/players`" class="nav-chip" active-class="active">
              {{ copy.navPlayers }}
            </router-link>
            <router-link v-if="isCoach" :to="`/team/${teamId}/statistics`" class="nav-chip" active-class="active">
              {{ copy.navStatistics }}
            </router-link>
            <router-link :to="`/team-schedule/${teamId}`" class="nav-chip">
              {{ copy.navSchedule }}
            </router-link>
          </div>
        </div>

        <div class="hero-side">
          <div class="summary-card">
            <span class="summary-label">{{ copy.topScorer }}</span>
            <strong>{{ topScorer ? fullName(topScorer) : copy.noData }}</strong>
            <p>{{ topScorer ? copy.topScorerNote(topScorer.stats.goals) : copy.topScorerEmpty }}</p>
          </div>
        </div>
      </section>

      <section class="headline-grid">
        <article class="headline-card">
          <span class="headline-label">{{ copy.avgMatches }}</span>
          <strong>{{ averageMatches }}</strong>
          <small>{{ copy.wholeRoster }}</small>
        </article>
        <article class="headline-card">
          <span class="headline-label">{{ copy.yellowCards }}</span>
          <strong>{{ totalYellowCards }}</strong>
          <small>{{ copy.disciplineOverview }}</small>
        </article>
        <article class="headline-card">
          <span class="headline-label">{{ copy.redCards }}</span>
          <strong>{{ totalRedCards }}</strong>
          <small>{{ copy.needsAttention }}</small>
        </article>
      </section>

      <section class="controls-panel">
        <div class="search-box">
          <span class="search-icon">{{ copy.search }}</span>
          <input
            v-model="searchQuery"
            :placeholder="$t('teamPage.searchPlayers')"
            class="search-input"
          >
        </div>

        <div class="controls-right">
          <select v-model="sortBy" class="sort-select">
            <option value="name">{{ $t('teamPage.byName') }}</option>
            <option value="goals">{{ $t('teamPage.byGoals') }}</option>
            <option value="assists">{{ $t('teamPage.byAssists') }}</option>
            <option value="matches">{{ $t('teamPage.byMatches') }}</option>
          </select>

          <div class="view-toggle">
            <button
              type="button"
              :class="{ active: viewMode === 'cards' }"
              @click="viewMode = 'cards'"
            >
              {{ copy.cardsView }}
            </button>
            <button
              type="button"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              {{ copy.tableView }}
            </button>
          </div>
        </div>
      </section>

      <div class="players-status">
        <span>{{ copy.showingPlayers(filteredPlayers.length, players.length) }}</span>
        <span v-if="searchQuery">{{ copy.filter }}: "{{ searchQuery }}"</span>
      </div>

      <section v-if="filteredPlayers.length" class="content-panel">
        <div v-if="viewMode === 'cards'" class="roster-grid">
          <article v-for="player in filteredPlayers" :key="player.id" class="player-card">
            <div class="player-card-top">
              <div class="avatar-block">
                <button
                  type="button"
                  class="avatar-circle avatar-trigger"
                  :class="{ interactive: isCoach }"
                  @click="isCoach && triggerPlayerAvatarUpload(player)"
                >
                  <img v-if="player.avatar" :src="player.avatar" :alt="fullName(player)" class="avatar-image">
                  <template v-else>{{ getInitials(fullName(player)) }}</template>
                </button>
                <div>
                  <h2>{{ fullName(player) }}</h2>
                  <p>{{ player.email }}</p>
                  <div v-if="isCoach" class="avatar-actions">
                    <button
                      v-if="player.avatar"
                      type="button"
                      class="avatar-action-btn danger"
                      @click="deletePlayerAvatar(player)"
                    >
                      {{ copy.removeProfileImage }}
                    </button>
                  </div>
                </div>
              </div>

              <span class="tier-badge" :class="playerTierClass(player)">
                {{ playerTierLabel(player) }}
              </span>
            </div>

            <div class="quick-stats">
              <div class="quick-stat">
                <span>{{ copy.goals }}</span>
                <strong>{{ player.stats.goals }}</strong>
              </div>
              <div class="quick-stat">
                <span>{{ copy.assists }}</span>
                <strong>{{ player.stats.assists }}</strong>
              </div>
              <div class="quick-stat">
                <span>{{ copy.matches }}</span>
                <strong>{{ player.stats.matches }}</strong>
              </div>
            </div>

            <div class="stat-editor-grid">
              <div
                v-for="field in statFields"
                :key="field.key"
                class="stat-editor"
              >
                <span class="stat-label">{{ field.label }}</span>
                <div class="stat-controls" :class="{ readonly: !isCoach }">
                  <button
                    v-if="isCoach"
                    type="button"
                    class="stat-btn"
                    :disabled="player.stats[field.key] <= 0"
                    @click="adjustStat(player, field.key, -1)"
                  >
                    -
                  </button>
                  <input
                    v-model.number="player.stats[field.key]"
                    type="number"
                    min="0"
                    class="stat-input"
                    :disabled="!isCoach"
                    @change="updatePlayerStats(player)"
                  >
                  <button
                    v-if="isCoach"
                    type="button"
                    class="stat-btn plus"
                    @click="adjustStat(player, field.key, 1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div v-if="isMainCoach" class="card-footer">
              <button type="button" class="remove-btn" @click="confirmRemovePlayer(player)">
                {{ copy.removePlayer }}
              </button>
            </div>
          </article>
        </div>

        <div v-else class="table-panel">
          <table class="players-table">
            <thead>
              <tr>
                <th>{{ copy.player }}</th>
                <th v-for="field in statFields" :key="field.key">{{ field.label }}</th>
                <th v-if="isMainCoach">{{ copy.action }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="player in filteredPlayers" :key="player.id">
                <td>
                  <div class="table-player">
                    <button
                      type="button"
                      class="table-avatar avatar-trigger"
                      :class="{ interactive: isCoach }"
                      @click="isCoach && triggerPlayerAvatarUpload(player)"
                    >
                      <img v-if="player.avatar" :src="player.avatar" :alt="fullName(player)" class="avatar-image">
                      <template v-else>{{ getInitials(fullName(player)) }}</template>
                    </button>
                    <div class="table-player-copy">
                      <strong>{{ fullName(player) }}</strong>
                      <small>{{ player.email }}</small>
                      <div v-if="isCoach" class="avatar-actions compact">
                        <button
                          v-if="player.avatar"
                          type="button"
                          class="avatar-action-btn danger"
                          @click="deletePlayerAvatar(player)"
                        >
                          {{ copy.remove }}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
                <td v-for="field in statFields" :key="field.key">
                  <input
                    v-model.number="player.stats[field.key]"
                    type="number"
                    min="0"
                    class="table-input"
                    :disabled="!isCoach"
                    @change="updatePlayerStats(player)"
                  >
                </td>
                <td v-if="isMainCoach">
                  <button type="button" class="table-remove" @click="confirmRemovePlayer(player)">
                    {{ copy.remove }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="!loading" class="empty-panel">
        <h2>{{ emptyStateTitle }}</h2>
        <p>{{ emptyStateDescription }}</p>
      </section>

      <div v-if="loading" class="loading-panel">
        <div class="loading-spinner"></div>
        <p>{{ $t('messages.loading') }}</p>
      </div>

      <div v-if="toastMessage" class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { canManageTeam, isTeamOwner } from '../utils/teamAccess'
import { fetchTeamBundle, removePlayerAvatar, uploadPlayerAvatar } from '../services/teamApi'

const PLAYERS_COPY = {
  en: {
    eyebrow: 'Roster management',
    teamFallback: 'Team roster',
    description: 'Review the roster, track player contribution and update statistics in one place.',
    playersCount: (count) => `${count} ${count === 1 ? 'player' : 'players'}`,
    goalsLower: 'goals',
    assistsLower: 'assists',
    mainCoachMode: 'Head coach editing mode',
    assistantCoachMode: 'Assistant coach editing mode',
    navPlayers: 'Players',
    navStatistics: 'Statistics',
    navSchedule: 'Schedule',
    topScorer: 'Top scorer',
    topCreator: 'Top creator',
    noData: 'No data yet',
    topScorerNote: (goals) => `${goals} goals scored`,
    topScorerEmpty: 'First goals will open the leaderboard.',
    topCreatorNote: (assists) => `${assists} assists`,
    topCreatorEmpty: 'Assists will appear here.',
    avgMatches: 'Avg. matches',
    wholeRoster: 'Across the roster',
    yellowCards: 'Yellow cards',
    redCards: 'Red cards',
    disciplineOverview: 'Discipline overview',
    needsAttention: 'Needs attention',
    search: 'Search',
    cardsView: 'Cards',
    tableView: 'Table',
    showingPlayers: (visible, total) => `Showing ${visible} of ${total} players`,
    filter: 'Filter',
    removeProfileImage: 'Remove profile image',
    goals: 'Goals',
    assists: 'Assists',
    matches: 'Matches',
    yellowShort: 'Yellow',
    redShort: 'Red',
    player: 'Player',
    action: 'Action',
    remove: 'Remove',
    removePlayer: 'Remove player',
    tiers: {
      elite: 'Starter',
      strong: 'Reliable',
      steady: 'Rotation',
      rising: 'Developing'
    },
    selectImage: 'Please select an image file.',
    imageTooLarge: 'Image must be smaller than 2 MB.',
    avatarUpdated: 'Player profile image updated.',
    avatarUpdateError: 'Could not update the player profile image.',
    avatarRemoved: 'Player profile image removed.',
    avatarRemoveError: 'Could not remove the player profile image.'
  },
  lv: {
    eyebrow: 'Sastāva pārvaldība',
    teamFallback: 'Komandas sastāvs',
    description: 'Pārskatiet sastāvu, sekojiet spēlētāju ieguldījumam un atjauniniet statistiku vienuviet.',
    playersCount: (count) => `${count} spēlētāji`,
    goalsLower: 'vārti',
    assistsLower: 'piespēles',
    mainCoachMode: 'Galvenā trenera rediģēšanas režīms',
    assistantCoachMode: 'Trenera asistenta rediģēšanas režīms',
    navPlayers: 'Spēlētāji',
    navStatistics: 'Statistika',
    navSchedule: 'Grafiks',
    topScorer: 'Labākais vārtu guvējs',
    topCreator: 'Labākais piespēlētājs',
    noData: 'Datu vēl nav',
    topScorerNote: (goals) => `${goals} gūti vārti`,
    topScorerEmpty: 'Pirmie vārti atvērs līderu sarakstu.',
    topCreatorNote: (assists) => `${assists} rezultatīvas piespēles`,
    topCreatorEmpty: 'Piespēles parādīsies šeit.',
    avgMatches: 'Vid. spēles',
    wholeRoster: 'Visā sastāvā',
    yellowCards: 'Dzeltenās kartītes',
    redCards: 'Sarkanās kartītes',
    disciplineOverview: 'Disciplīnas pārskats',
    needsAttention: 'Nepieciešama uzmanība',
    search: 'Meklēt',
    cardsView: 'Kartītes',
    tableView: 'Tabula',
    showingPlayers: (visible, total) => `Parādīti ${visible} no ${total} spēlētājiem`,
    filter: 'Filtrs',
    removeProfileImage: 'Noņemt profila attēlu',
    goals: 'Vārti',
    assists: 'Piespēles',
    matches: 'Spēles',
    yellowShort: 'Dzeltenās',
    redShort: 'Sarkanās',
    player: 'Spēlētājs',
    action: 'Darbība',
    remove: 'Noņemt',
    removePlayer: 'Noņemt spēlētāju',
    tiers: {
      elite: 'Pamatsastāvs',
      strong: 'Uzticams',
      steady: 'Rotācijā',
      rising: 'Attīstībā'
    },
    selectImage: 'Izvēlieties attēla failu.',
    imageTooLarge: 'Attēlam jābūt mazākam par 2 MB.',
    avatarUpdated: 'Spēlētāja profila attēls atjaunināts.',
    avatarUpdateError: 'Neizdevās atjaunināt spēlētāja profila attēlu.',
    avatarRemoved: 'Spēlētāja profila attēls noņemts.',
    avatarRemoveError: 'Neizdevās noņemt spēlētāja profila attēlu.'
  }
}

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const teamId = route.params.id
const team = ref({ name: '', coach_id: null, logo: null })
const players = ref([])
const loading = ref(false)
const toastMessage = ref('')
const toastType = ref('success')
const searchQuery = ref('')
const sortBy = ref('name')
const viewMode = ref('list')
const avatarInput = ref(null)
const activeAvatarPlayerId = ref(null)
const localeKey = computed(() => (locale.value === 'en' ? 'en' : 'lv'))
const copy = computed(() => PLAYERS_COPY[localeKey.value])

const currentUser = computed(() => authStore.user)
const isCoach = canManageTeam({
  userRef: currentUser,
  teamRef: team,
  teamIdRef: computed(() => teamId)
})
const isMainCoach = isTeamOwner({
  userRef: currentUser,
  teamRef: team
})

const statFields = computed(() => [
  { key: 'matches', label: copy.value.matches },
  { key: 'goals', label: copy.value.goals },
  { key: 'assists', label: copy.value.assists },
  { key: 'yellow_cards', label: copy.value.yellowShort },
  { key: 'red_cards', label: copy.value.redShort }
])

const fullName = (player) => `${player.name || ''} ${player.surname || ''}`.trim()
const getInitials = (name = '') => name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'

const sortedPlayers = computed(() => {
  const roster = [...players.value]

  switch (sortBy.value) {
    case 'goals':
      return roster.sort((a, b) => b.stats.goals - a.stats.goals)
    case 'assists':
      return roster.sort((a, b) => b.stats.assists - a.stats.assists)
    case 'matches':
      return roster.sort((a, b) => b.stats.matches - a.stats.matches)
    default:
      return roster.sort((a, b) => fullName(a).localeCompare(fullName(b)))
  }
})

const filteredPlayers = computed(() => {
  if (!searchQuery.value) return sortedPlayers.value
  const query = searchQuery.value.toLowerCase()

  return sortedPlayers.value.filter((player) =>
    fullName(player).toLowerCase().includes(query) ||
    (player.email || '').toLowerCase().includes(query)
  )
})

const hasPlayerSearch = computed(() => searchQuery.value.trim().length > 0)
const emptyStateTitle = computed(() => (
  hasPlayerSearch.value
    ? t('teamPage.noPlayersMatchSearch', { query: searchQuery.value.trim() })
    : t('teamPage.noPlayers')
))
const emptyStateDescription = computed(() => (
  hasPlayerSearch.value
    ? t('teamPage.tryAnotherSearch')
    : t('teamPage.rosterWillAppearSoon')
))

const totalGoals = computed(() => players.value.reduce((sum, player) => sum + (player.stats?.goals || 0), 0))
const totalYellowCards = computed(() => players.value.reduce((sum, player) => sum + (player.stats?.yellow_cards || 0), 0))
const totalRedCards = computed(() => players.value.reduce((sum, player) => sum + (player.stats?.red_cards || 0), 0))
const averageMatches = computed(() => {
  if (!players.value.length) return '0.0'
  const totalMatches = players.value.reduce((sum, player) => sum + (player.stats?.matches || 0), 0)
  return (totalMatches / players.value.length).toFixed(1)
})

const topScorer = computed(() => [...players.value].sort((a, b) => b.stats.goals - a.stats.goals)[0] || null)

const playerImpact = (player) => (
  (player.stats?.goals || 0) * 4 +
  (player.stats?.assists || 0) * 3 +
  (player.stats?.matches || 0)
)

const playerTierLabel = (player) => {
  const score = playerImpact(player)
  if (score >= 25) return copy.value.tiers.elite
  if (score >= 14) return copy.value.tiers.strong
  if (score >= 6) return copy.value.tiers.steady
  return copy.value.tiers.rising
}

const playerTierClass = (player) => {
  const score = playerImpact(player)
  if (score >= 25) return 'elite'
  if (score >= 14) return 'strong'
  if (score >= 6) return 'steady'
  return 'rising'
}

const fetchTeamData = async () => {
  loading.value = true
  try {
    const response = await fetchTeamBundle(teamId)
    team.value = response.team
    players.value = response.players
  } catch (error) {
    console.error('Error fetching team:', error)
    showToast(t('messages.error'), 'error')
  } finally {
    loading.value = false
  }
}

const triggerPlayerAvatarUpload = (player) => {
  if (!isCoach.value) return
  activeAvatarPlayerId.value = player.id
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event) => {
  const file = event.target.files?.[0]
  const playerId = activeAvatarPlayerId.value
  event.target.value = ''

  if (!file || !playerId) return

  if (!file.type.startsWith('image/')) {
    showToast(copy.value.selectImage, 'error')
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast(copy.value.imageTooLarge, 'error')
    return
  }

  try {
    const avatar = await uploadPlayerAvatar(playerId, file)
    const player = players.value.find((entry) => String(entry.id) === String(playerId))
    if (player) {
      player.avatar = avatar
    }
    showToast(copy.value.avatarUpdated, 'success')
  } catch (error) {
    console.error('Error updating player avatar:', error)
    showToast(error.response?.data?.error || copy.value.avatarUpdateError, 'error')
  } finally {
    activeAvatarPlayerId.value = null
  }
}

const deletePlayerAvatar = async (player) => {
  try {
    await removePlayerAvatar(player.id)
    player.avatar = null
    showToast(copy.value.avatarRemoved, 'success')
  } catch (error) {
    console.error('Error removing player avatar:', error)
    showToast(error.response?.data?.error || copy.value.avatarRemoveError, 'error')
  }
}

const adjustStat = (player, key, delta) => {
  const nextValue = Math.max(0, Number(player.stats[key] || 0) + delta)
  player.stats[key] = nextValue
  updatePlayerStats(player)
}

const updatePlayerStats = async (player) => {
  try {
    await axios.put(`/api/auth/players/${player.id}/stats`, player.stats)
    showToast(t('messages.statsUpdated'), 'success')
  } catch (error) {
    console.error('Error updating stats:', error)
    showToast(t('teamPage.errorUpdatingStats'), 'error')
    fetchTeamData()
  }
}

const confirmRemovePlayer = async (player) => {
  if (!isMainCoach.value) return
  if (!confirm(t('teamPage.removePlayerConfirm'))) return

  try {
    await axios.delete(`/api/auth/players/${player.id}/team`)
    showToast(t('teamPage.playerRemoved'), 'success')
    fetchTeamData()
  } catch (error) {
    console.error('Error removing player:', error)
    showToast(t('teamPage.errorRemovingPlayer'), 'error')
  }
}

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

onMounted(() => {
  fetchTeamData()
})
</script>

<style scoped>
.players-page {
  --page-bg: var(--bg-color, var(--background-color));
  --page-surface: var(--bg-color-secondary, var(--card-bg));
  --page-border: var(--border-color);
  --page-text: var(--text-color);
  --page-muted: var(--text-color-secondary, var(--text-secondary));
  --page-accent: #0b72e7;
  --page-accent-soft: rgba(11, 114, 231, 0.14);
  --page-danger-soft: rgba(220, 53, 69, 0.14);
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 24%),
    var(--page-bg);
  color: var(--page-text);
}

html.dark-mode .players-page {
  --page-accent: #6fb2ff;
  --page-accent-soft: rgba(74, 144, 226, 0.2);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.2), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    var(--page-bg);
}

.players-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
}

.players-hero,
.headline-card,
.controls-panel,
.content-panel,
.empty-panel {
  background: var(--page-surface);
  border: 1px solid var(--page-border);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
}

.players-hero {
  display: grid;
  grid-template-columns: 1.3fr 320px;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 28px;
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 65%), var(--page-surface);
}

.hero-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.eyebrow,
.headline-label,
.summary-label,
.stat-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
  color: var(--page-muted);
}

.hero-copy h1 {
  margin: 0.35rem 0 0.65rem;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1;
}

.hero-description {
  margin: 0;
  color: var(--page-muted);
  max-width: 60ch;
}

.hero-pills,
.hero-nav,
.headline-grid,
.quick-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hero-pill,
.nav-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--page-border);
  background: var(--page-surface);
  color: var(--page-muted);
  text-decoration: none;
  font-weight: 700;
}

.hero-pill.strong,
.hero-pill.accent,
.nav-chip.active {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-card {
  border: 1px solid var(--page-border);
  border-radius: 22px;
  padding: 1rem 1.1rem;
  background: var(--page-surface);
}

.summary-card.soft {
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 70%), var(--page-surface);
}

.summary-card strong {
  display: block;
  margin: 0.35rem 0;
  font-size: 1.1rem;
}

.summary-card p {
  margin: 0;
  color: var(--page-muted);
}

.headline-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.headline-card {
  border-radius: 22px;
  padding: 1.15rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.headline-card strong {
  font-size: 2rem;
  line-height: 1;
}

.headline-card small,
.players-status {
  color: var(--page-muted);
}

.controls-panel {
  margin-top: 1rem;
  border-radius: 22px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 260px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--page-muted);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.search-input,
.sort-select,
.stat-input,
.table-input {
  width: 100%;
  border: 1px solid var(--page-border);
  border-radius: 14px;
  background: var(--page-bg);
  color: var(--page-text);
}

.search-input {
  padding: 0.95rem 1rem 0.95rem 5.5rem;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sort-select {
  width: auto;
  min-width: 160px;
  padding: 0.95rem 1rem;
}

.view-toggle {
  display: inline-flex;
  gap: 0.5rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.08);
}

.view-toggle button {
  border: none;
  background: transparent;
  color: var(--page-muted);
  padding: 0.75rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
}

.view-toggle button.active {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.players-status {
  margin-top: 0.85rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.content-panel {
  margin-top: 1rem;
  border-radius: 24px;
  padding: 1.2rem;
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.player-card {
  border: 1px solid var(--page-border);
  border-radius: 22px;
  padding: 1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.player-card-top,
.avatar-block {
  display: flex;
  gap: 0.9rem;
  justify-content: space-between;
  align-items: start;
}

.avatar-block {
  justify-content: start;
}

.avatar-circle,
.table-avatar {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: var(--page-accent-soft);
  color: var(--page-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}

.avatar-trigger {
  border: none;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
}

.avatar-trigger.interactive {
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.avatar-trigger.interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(11, 114, 231, 0.16);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}

.avatar-block h2 {
  margin: 0;
  font-size: 1.1rem;
}

.avatar-block p {
  margin: 0.2rem 0 0;
  color: var(--page-muted);
  word-break: break-word;
}

.avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.7rem;
}

.avatar-actions.compact {
  margin-top: 0.45rem;
}

.avatar-action-btn {
  border: 1px solid rgba(11, 114, 231, 0.16);
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  background: rgba(11, 114, 231, 0.08);
  color: var(--page-accent);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
}

.avatar-action-btn.danger {
  border-color: rgba(196, 61, 61, 0.16);
  background: rgba(196, 61, 61, 0.08);
  color: #c2410c;
}

.tier-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.tier-badge.elite {
  background: rgba(11, 114, 231, 0.16);
  color: var(--page-accent);
}

.tier-badge.strong {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.tier-badge.steady {
  background: rgba(14, 165, 233, 0.14);
  color: #0369a1;
}

.tier-badge.rising {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

html.dark-mode .tier-badge.strong {
  color: #93c5fd;
}

html.dark-mode .tier-badge.steady {
  color: #7dd3fc;
}

html.dark-mode .tier-badge.rising {
  color: #cbd5e1;
}

.quick-stat {
  min-width: 88px;
  border-radius: 16px;
  padding: 0.85rem 0.9rem;
  background: rgba(127, 127, 127, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.quick-stat span {
  color: var(--page-muted);
  font-size: 0.78rem;
}

.quick-stat strong {
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
}

.stat-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-editor {
  border: 1px solid var(--page-border);
  border-radius: 16px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.stat-controls {
  display: grid;
  grid-template-columns: 34px minmax(64px, 1fr) 34px;
  gap: 0.35rem;
  align-items: center;
}

.stat-controls.readonly {
  grid-template-columns: minmax(72px, 1fr);
}

.stat-input,
.table-input {
  min-width: 64px;
  padding: 0.7rem 0.45rem;
  text-align: center;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-input::-webkit-outer-spin-button,
.stat-input::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.stat-input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.stat-btn {
  width: 34px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: rgba(127, 127, 127, 0.12);
  color: var(--page-text);
  cursor: pointer;
  font-weight: 800;
}

.stat-btn.plus {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.stat-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.card-footer {
  margin-top: auto;
}

.remove-btn,
.table-remove {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 0.85rem 1rem;
  background: var(--page-danger-soft);
  color: #c2410c;
  cursor: pointer;
  font-weight: 700;
}

html.dark-mode .remove-btn,
html.dark-mode .table-remove {
  color: #fca5a5;
}

html.dark-mode .avatar-action-btn.danger {
  color: #fca5a5;
}

.table-panel {
  overflow-x: auto;
}

.players-table {
  width: 100%;
  border-collapse: collapse;
}

.players-table th,
.players-table td {
  padding: 0.85rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--page-border);
}

.players-table th {
  color: var(--page-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
}

.table-player {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.table-player-copy {
  min-width: 0;
}

.table-player small {
  display: block;
  margin-top: 0.15rem;
  color: var(--page-muted);
}

.table-input {
  min-width: 78px;
}

.empty-panel,
.loading-panel {
  margin-top: 1rem;
  border-radius: 24px;
  padding: 2.5rem 1.2rem;
  text-align: center;
}

.empty-panel h2 {
  margin: 0 0 0.6rem;
}

.loading-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}

.loading-spinner {
  width: 42px;
  height: 42px;
  border: 3px solid var(--page-border);
  border-top-color: var(--page-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.toast {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  padding: 0.9rem 1.15rem;
  border-radius: 14px;
  background: #1f8f5a;
  color: white;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
  z-index: 30;
}

.toast.error {
  background: #c43d3d;
}

.visually-hidden {
  display: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .players-hero {
    grid-template-columns: 1fr;
  }

  .hero-side {
    flex-direction: row;
  }
}

@media (max-width: 768px) {
  .players-shell {
    padding: 1rem;
  }

  .players-hero,
  .headline-card,
  .controls-panel,
  .content-panel,
  .empty-panel {
    border-radius: 20px;
  }

  .headline-grid {
    grid-template-columns: 1fr;
  }

  .hero-side {
    flex-direction: column;
  }

  .controls-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 0;
  }

  .controls-right {
    width: 100%;
    justify-content: space-between;
  }

  .sort-select {
    flex: 1;
    min-width: 0;
  }

  .view-toggle {
    width: 100%;
    justify-content: space-between;
  }

  .view-toggle button {
    flex: 1;
  }

  .stat-editor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 540px) {
  .players-shell {
    padding: 0.75rem;
  }

  .players-hero,
  .content-panel {
    padding: 1rem;
  }

  .player-card-top {
    flex-direction: column;
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .toast {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
  }
}
</style>
