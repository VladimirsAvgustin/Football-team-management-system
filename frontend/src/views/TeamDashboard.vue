<template>
  <div class="team-dashboard">
    <div class="dashboard-shell">
      <section class="dashboard-hero">
        <div class="hero-grid">
          <div class="hero-brand">
            <button
              type="button"
              class="logo-frame"
              :class="{ interactive: isCoach }"
              :disabled="!isCoach"
              @click="triggerLogoUpload"
            >
              <img v-if="team.logo" :src="team.logo" :alt="team.name" class="team-logo-image" />
              <div v-else class="logo-fallback">{{ teamInitials }}</div>
            </button>

            <div v-if="isCoach" class="logo-actions">
              <button type="button" class="hero-button secondary" @click="triggerLogoUpload">
                {{ copy.changeLogo }}
              </button>
              <button v-if="team.logo" type="button" class="hero-button danger" @click="deleteLogo">
                {{ copy.removeLogo }}
              </button>
            </div>

            <input
              ref="logoInput"
              type="file"
              accept="image/*"
              class="hidden-input"
              @change="handleLogoUpload"
            />
          </div>

          <div class="hero-copy">
            <p class="eyebrow">{{ copy.eyebrow }}</p>
            <h1>{{ team.name || copy.teamFallback }}</h1>

            <div class="hero-pills">
              <span class="hero-pill code">{{ copy.code }}: {{ team.team_code || copy.notSpecified }}</span>
              <span class="hero-pill">{{ playerCountText(summary.totalPlayers) }}</span>
              <span class="hero-pill">{{ upcomingCountText(upcomingEvents.length) }}</span>
              <span v-if="isCoach" class="hero-pill accent">
                {{ isMainCoach ? copy.mainCoachAccess : copy.assistantCoachAccess }}
              </span>
              <span v-if="isMainCoach && coachRequests.length" class="hero-pill attention">
                {{ coachRequestCountText(coachRequests.length) }}
              </span>
            </div>

            <div class="hero-actions">
              <router-link
                v-for="link in quickLinks"
                :key="link.to"
                :to="link.to"
                class="hero-link"
              >
                <span class="link-title">{{ link.label }}</span>
                <span class="link-subtitle">{{ link.description }}</span>
              </router-link>
            </div>
          </div>

          <div class="hero-highlight">
            <div class="highlight-card">
              <span class="highlight-label">{{ copy.nextEvent }}</span>
              <strong>{{ nextEventTitle }}</strong>
              <p>{{ nextEventMeta }}</p>
            </div>
            <div class="highlight-card soft">
              <span class="highlight-label">{{ copy.attendanceOverview }}</span>
              <strong>{{ attendanceOverviewValue }}</strong>
              <p>{{ attendanceOverviewText }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="metrics-grid">
        <article v-for="metric in headlineMetrics" :key="metric.label" class="metric-card">
          <span class="metric-label">{{ metric.label }}</span>
          <strong class="metric-value">{{ metric.value }}</strong>
          <span class="metric-note">{{ metric.note }}</span>
        </article>
      </section>

      <section class="section-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">{{ copy.performance }}</p>
              <h2>{{ copy.leaderboard }}</h2>
            </div>
            <span class="panel-chip">{{ trackedPlayerCountText(rankedPlayers.length) }}</span>
          </div>

          <div v-if="topPlayers.length" class="leaderboard">
            <div
              v-for="(player, index) in topPlayers"
              :key="player.id"
              class="leader-card"
              :class="`rank-${index + 1}`"
            >
              <div class="leader-rank">#{{ index + 1 }}</div>
              <div class="leader-main">
                <div class="leader-avatar">{{ getInitials(fullName(player)) }}</div>
                <div>
                  <h3>{{ fullName(player) }}</h3>
                </div>
              </div>
              <div class="leader-stats">
                <span>{{ player.stats.goals }} {{ copy.goalsLower }}</span>
                <span>{{ player.stats.assists }} {{ copy.assistsShort }}</span>
                <span>{{ player.stats.matches }} {{ copy.matchesLower }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-card">
            {{ copy.leaderboardEmpty }}
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">{{ copy.schedule }}</p>
              <h2>{{ copy.upcomingEventsTitle }}</h2>
            </div>
            <router-link :to="`/team-schedule/${teamId}`" class="panel-link">{{ copy.openSchedule }}</router-link>
          </div>

          <div v-if="upcomingEvents.length" class="event-list">
            <div v-for="event in upcomingEvents.slice(0, 4)" :key="event.id" class="event-item">
              <div class="event-date">
                <strong>{{ formatShortDay(event.event_date) }}</strong>
                <span>{{ formatDayNumber(event.event_date) }}</span>
              </div>
              <div class="event-copy">
                <h3>{{ event.event_name }}</h3>
                <p>{{ event.location || copy.locationFallback }}</p>
              </div>
              <div class="event-meta">
                <span class="event-badge" :class="event.event_type || 'other'">{{ eventTypeLabel(event.event_type) }}</span>
                <span>{{ formatEventTime(event.event_time) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-card">
            {{ copy.scheduleEmpty }}
          </div>
        </article>
      </section>

      <section v-if="isMainCoach" class="panel coach-requests-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">{{ copy.coachInbox }}</p>
            <h2>{{ copy.assistantRequests }}</h2>
          </div>
          <span class="panel-chip">{{ copy.waitingCount(coachRequests.length) }}</span>
        </div>

        <div v-if="coachRequestsLoading" class="empty-card">
          {{ copy.loadingRequests }}
        </div>
        <div v-else-if="coachRequests.length" class="coach-request-list">
          <article v-for="request in coachRequests" :key="request.id" class="coach-request-card">
            <div class="coach-request-main">
              <div class="coach-request-avatar">
                <img v-if="request.avatar" :src="request.avatar" :alt="coachRequestName(request)" class="coach-request-image">
                <template v-else>{{ getInitials(coachRequestName(request)) }}</template>
              </div>
              <div class="coach-request-copy">
                <strong>{{ coachRequestName(request) }}</strong>
                <p>{{ request.email }}</p>
                <small>{{ copy.requested }} {{ formatRequestDate(request.created_at) }}</small>
              </div>
            </div>
            <div class="coach-request-actions">
              <button type="button" class="hero-button secondary" @click="reviewCoachRequest(request, 'reject')">
                {{ copy.reject }}
              </button>
              <button type="button" class="hero-button primary" @click="reviewCoachRequest(request, 'approve')">
                {{ copy.approve }}
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-card">
          {{ copy.noRequests }}
        </div>
      </section>

      <div v-if="toastMessage" class="toast" :class="toastType">{{ toastMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { canManageTeam, isTeamOwner } from '../utils/teamAccess'
import {
  approveCoachJoinRequest,
  fetchCoachJoinRequests,
  fetchTeamBundle,
  rejectCoachJoinRequest,
  fetchTeamSchedule,
  fetchTeamSummary,
  removeTeamLogo,
  uploadTeamLogo
} from '../services/teamApi'

const DASHBOARD_COPY = {
  en: {
    changeLogo: 'Change logo',
    removeLogo: 'Remove logo',
    eyebrow: 'Team dashboard',
    teamFallback: 'Team workspace',
    code: 'Code',
    notSpecified: 'not specified',
    mainCoachAccess: 'Head coach access',
    assistantCoachAccess: 'Assistant coach access',
    nextEvent: 'Next event',
    attendanceOverview: 'Practice attendance',
    coachInbox: 'Coach inbox',
    assistantRequests: 'Assistant coach requests',
    requested: 'Requested',
    reject: 'Reject',
    approve: 'Approve',
    loadingRequests: 'Loading assistant coach requests...',
    noRequests: 'New assistant coach requests will appear only for the head coach.',
    performance: 'Performance',
    leaderboard: 'Leaderboard',
    leaderboardEmpty: 'Player statistics are not available yet. Start tracking matches to fill the leaderboard.',
    schedule: 'Schedule',
    upcomingEventsTitle: 'Upcoming events',
    openSchedule: 'Open schedule',
    locationFallback: 'Location will be confirmed',
    scheduleEmpty: 'No upcoming events yet. The schedule page is ready for the next practice or match.',
    goals: 'Goals',
    assists: 'Assists',
    matches: 'Matches',
    attendance: 'Attendance',
    goalsLower: 'goals',
    assistsShort: 'ast.',
    matchesLower: 'matches',
    perPlayer: 'per player',
    practiceAvailability: 'Practice availability',
    noEventTitle: 'No event planned',
    noEventMeta: 'The calendar is empty. Add the next session on the schedule page.',
    players: (count) => `${count} ${count === 1 ? 'player' : 'players'}`,
    upcomingCount: (count) => `${count} ${count === 1 ? 'upcoming event' : 'upcoming events'}`,
    upcomingGames: (count) => `${count} ${count === 1 ? 'upcoming match' : 'upcoming matches'}`,
    coachRequests: (count) => `${count} ${count === 1 ? 'coach request' : 'coach requests'}`,
    waitingCount: (count) => `${count} ${count === 1 ? 'waiting' : 'waiting'}`,
    trackedPlayers: (count) => `${count} ${count === 1 ? 'player tracked' : 'players tracked'}`,
    eventCountText: (count) => `${count} ${count === 1 ? 'upcoming event' : 'upcoming events'}`,
    scheduledEvents: (count) => count === 1 ? '1 upcoming event planned' : `${count} upcoming events planned`,
    attendanceOverviewText: (eventText) => `${eventText}.`,
    quickLinks: {
      players: {
        label: 'Players',
        description: 'Open the roster and player statistics'
      },
      schedule: {
        label: 'Schedule',
        description: 'Practices, matches and team meetings'
      },
      statistics: {
        label: 'Statistics',
        description: 'Coach analytics and breakdowns'
      }
    },
    coachRequestFallback: 'Coach request',
    loadRequestsError: 'Could not load assistant coach requests.',
    coachRequestsWaitingToast: (count) => `${count} assistant coach ${count === 1 ? 'request is' : 'requests are'} waiting for review.`,
    dashboardLoadError: 'Could not load the team dashboard.',
    imageTooLarge: 'Image must be smaller than 2 MB.',
    logoUpdated: 'Team logo updated.',
    logoUpdateError: 'Could not update the team logo.',
    removeLogoConfirm: (name) => `Remove the logo for "${name}"?`,
    logoRemoved: 'Team logo removed.',
    logoRemoveError: 'Could not remove the team logo.',
    reviewConfirm: (action, name) => `${action === 'approve' ? 'Approve' : 'Reject'} request from ${name}?`,
    coachApproved: (name) => `${name} is now an assistant coach.`,
    coachRejected: (name) => `${name} request rejected.`,
    coachReviewError: 'Could not process this request.',
    timePrefix: 'at',
    dateLocale: 'en-US',
    eventTypes: {
      practice: 'Practice',
      game: 'Match',
      meeting: 'Meeting',
      other: 'Event'
    }
  },
  lv: {
    changeLogo: 'Mainīt logotipu',
    removeLogo: 'Noņemt logotipu',
    eyebrow: 'Komandas panelis',
    teamFallback: 'Komandas vide',
    code: 'Kods',
    notSpecified: 'nav norādīts',
    mainCoachAccess: 'Galvenā trenera piekļuve',
    assistantCoachAccess: 'Trenera asistenta piekļuve',
    nextEvent: 'Nākamais notikums',
    attendanceOverview: 'Treni\u0146u apmekl\u0113jums',
    coachInbox: 'Trenera iesūtne',
    assistantRequests: 'Trenera asistentu pieprasījumi',
    requested: 'Pieprasīts',
    reject: 'Noraidīt',
    approve: 'Apstiprināt',
    loadingRequests: 'Ielādē trenera asistentu pieprasījumus...',
    noRequests: 'Jauni trenera asistenta pieprasījumi parādīsies tikai galvenajam trenerim.',
    performance: 'Sniegums',
    leaderboard: 'Līderu saraksts',
    leaderboardEmpty: 'Spēlētāju statistikas vēl nav. Sāciet uzskaitīt spēles, lai aizpildītu sarakstu.',
    schedule: 'Grafiks',
    upcomingEventsTitle: 'Tuvākie notikumi',
    openSchedule: 'Atvērt grafiku',
    locationFallback: 'Vieta tiks precizēta',
    scheduleEmpty: 'Tuvāko notikumu vēl nav. Grafika lapa ir gatava nākamajam treniņam vai spēlei.',
    goals: 'Vārti',
    assists: 'Piespēles',
    matches: 'Spēles',
    attendance: 'Apmeklējums',
    goalsLower: 'vārti',
    assistsShort: 'piesp.',
    matchesLower: 'spēles',
    perPlayer: 'uz spēlētāju',
    practiceAvailability: 'Treniņu pieejamība',
    noEventTitle: 'Notikums nav ieplānots',
    noEventMeta: 'Kalendārs ir tukšs. Pievienojiet nākamo nodarbību grafika lapā.',
    players: (count) => `${count} spēlētāji`,
    upcomingCount: (count) => `${count} gaidāmie notikumi`,
    upcomingGames: (count) => count === 1 ? '1 gaidāma spēle' : `${count} gaidāmas spēles`,
    coachRequests: (count) => `${count} trenera pieprasījumi`,
    waitingCount: (count) => `${count} gaida`,
    trackedPlayers: (count) => `${count} spēlētāji uzskaitē`,
    eventCountText: (count) => count === 1 ? '1 gaidāms notikums' : `${count} gaidāmie notikumi`,
    scheduledEvents: (count) => count === 1 ? 'Iepl\u0101nots 1 gaid\u0101ms notikums' : `Iepl\u0101noti ${count} gaid\u0101mi notikumi`,
    attendanceOverviewText: (eventText) => `${eventText}.`,
    quickLinks: {
      players: {
        label: 'Spēlētāji',
        description: 'Atvērt sastāvu un spēlētāju statistiku'
      },
      schedule: {
        label: 'Grafiks',
        description: 'Treniņi, spēles un sapulces'
      },
      statistics: {
        label: 'Statistika',
        description: 'Trenera analītika un sadalījumi'
      }
    },
    coachRequestFallback: 'Trenera pieprasījums',
    loadRequestsError: 'Neizdevās ielādēt trenera asistenta pieprasījumus.',
    coachRequestsWaitingToast: (count) => `${count} trenera asistenta pieprasījumi gaida pārskatīšanu.`,
    dashboardLoadError: 'Neizdevās ielādēt komandas paneli.',
    imageTooLarge: 'Attēlam jābūt mazākam par 2 MB.',
    logoUpdated: 'Komandas logotips atjaunināts.',
    logoUpdateError: 'Neizdevās atjaunināt komandas logotipu.',
    removeLogoConfirm: (name) => `Noņemt komandas "${name}" logotipu?`,
    logoRemoved: 'Komandas logotips noņemts.',
    logoRemoveError: 'Neizdevās noņemt komandas logotipu.',
    reviewConfirm: (action, name) => `${action === 'approve' ? 'Apstiprināt' : 'Noraidīt'} pieprasījumu no ${name}?`,
    coachApproved: (name) => `${name} tagad ir trenera asistents.`,
    coachRejected: (name) => `${name} pieprasījums noraidīts.`,
    coachReviewError: 'Neizdevās apstrādāt šo pieprasījumu.',
    timePrefix: 'plkst.',
    dateLocale: 'lv-LV',
    eventTypes: {
      practice: 'Treniņš',
      game: 'Spēle',
      meeting: 'Sapulce',
      other: 'Notikums'
    }
  }
}

const { locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const teamId = route.params.id
const team = ref({ name: '', coach_id: null, team_code: '', logo: null })
const players = ref([])
const schedule = ref([])
const summary = ref({
  totalPlayers: 0,
  totalMatches: 0,
  totalGoals: 0,
  totalAssists: 0,
  avgAttendance: 0
})
const toastMessage = ref('')
const toastType = ref('success')
const logoInput = ref(null)
const coachRequests = ref([])
const coachRequestsLoading = ref(false)
const localeKey = computed(() => (locale.value === 'en' ? 'en' : 'lv'))
const copy = computed(() => DASHBOARD_COPY[localeKey.value])

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

const fullName = (player) => `${player.name || ''} ${player.surname || ''}`.trim()
const getInitials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'
const teamInitials = computed(() => getInitials(team.value.name || copy.value.teamFallback))
const playerCountText = (count) => copy.value.players(count)
const upcomingCountText = (count) => copy.value.upcomingCount(count)
const coachRequestCountText = (count) => copy.value.coachRequests(count)
const trackedPlayerCountText = (count) => copy.value.trackedPlayers(count)

const playerScore = (player) => (
  (player.stats?.goals || 0) * 4 +
  (player.stats?.assists || 0) * 3 +
  (player.stats?.matches || 0)
)

const rankedPlayers = computed(() => [...players.value].sort((a, b) => {
  const scoreDiff = playerScore(b) - playerScore(a)
  if (scoreDiff !== 0) return scoreDiff
  return fullName(a).localeCompare(fullName(b))
}))

const topPlayers = computed(() => rankedPlayers.value.slice(0, 3))

const sortEvents = (events) => [...events].sort((a, b) => {
  const aStamp = new Date(`${a.event_date}T${a.event_time || '00:00'}`).getTime()
  const bStamp = new Date(`${b.event_date}T${b.event_time || '00:00'}`).getTime()
  return aStamp - bStamp
})

const upcomingEvents = computed(() => {
  const now = Date.now()

  return sortEvents(schedule.value).filter((event) => {
    const eventStamp = new Date(`${event.event_date}T${event.event_time || '00:00'}`).getTime()
    return eventStamp >= now
  })
})

const upcomingGames = computed(() =>
  upcomingEvents.value.filter((event) => String(event.event_type || '').toLowerCase() === 'game')
)

const nextEventTitle = computed(() => upcomingEvents.value[0]?.event_name || copy.value.noEventTitle)
const nextEventMeta = computed(() => {
  const nextEvent = upcomingEvents.value[0]

  if (!nextEvent) {
    return copy.value.noEventMeta
  }

  return `${formatFullDate(nextEvent.event_date)} ${copy.value.timePrefix} ${formatEventTime(nextEvent.event_time)}`
})

const attendanceOverviewValue = computed(() => `${summary.value.avgAttendance || 0}%`)

const attendanceOverviewText = computed(() => {
  const eventText = copy.value.scheduledEvents(upcomingEvents.value.length)
  return copy.value.attendanceOverviewText(eventText)
})

const headlineMetrics = computed(() => [
  {
    label: copy.value.goals,
    value: summary.value.totalGoals,
    note: `${perPlayer(summary.value.totalGoals)} ${copy.value.perPlayer}`
  },
  {
    label: copy.value.matches,
    value: summary.value.totalMatches,
    note: copy.value.upcomingGames(upcomingGames.value.length)
  },
  {
    label: copy.value.attendance,
    value: `${summary.value.avgAttendance}%`,
    note: copy.value.practiceAvailability
  }
])

const quickLinks = computed(() => {
  const links = [
    {
      to: `/team/${teamId}/players`,
      label: copy.value.quickLinks.players.label,
      description: copy.value.quickLinks.players.description
    },
    {
      to: `/team-schedule/${teamId}`,
      label: copy.value.quickLinks.schedule.label,
      description: copy.value.quickLinks.schedule.description
    }
  ]

  if (isCoach.value) {
    links.unshift({
      to: `/team/${teamId}/statistics`,
      label: copy.value.quickLinks.statistics.label,
      description: copy.value.quickLinks.statistics.description
    })
  }

  return links
})

const coachRequestName = (request) => `${request.name || ''} ${request.surname || ''}`.trim() || copy.value.coachRequestFallback

const loadCoachRequests = async () => {
  if (!isMainCoach.value) {
    coachRequests.value = []
    return
  }

  coachRequestsLoading.value = true

  try {
    coachRequests.value = await fetchCoachJoinRequests(teamId)
  } catch (error) {
    console.error('Error loading coach requests:', error)
    showToast(copy.value.loadRequestsError, 'error')
  } finally {
    coachRequestsLoading.value = false
  }
}

const fetchDashboard = async () => {
  try {
    const [bundle, nextSummary, nextSchedule] = await Promise.all([
      fetchTeamBundle(teamId),
      fetchTeamSummary(teamId),
      fetchTeamSchedule(teamId)
    ])

    team.value = bundle.team
    players.value = bundle.players
    summary.value = nextSummary
    schedule.value = nextSchedule
    await loadCoachRequests()

    if (isMainCoach.value && coachRequests.value.length) {
      showToast(
        copy.value.coachRequestsWaitingToast(coachRequests.value.length),
        'info'
      )
    }
  } catch (error) {
    console.error('Error loading team dashboard:', error)
    showToast(copy.value.dashboardLoadError, 'error')
  }
}

const triggerLogoUpload = () => {
  if (!isCoach.value) return
  logoInput.value?.click()
}

const handleLogoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    showToast(copy.value.imageTooLarge, 'error')
    return
  }

  try {
    team.value.logo = await uploadTeamLogo(teamId, file)
    showToast(copy.value.logoUpdated)
  } catch (error) {
    console.error('Error uploading team logo:', error)
    showToast(copy.value.logoUpdateError, 'error')
  } finally {
    event.target.value = ''
  }
}

const deleteLogo = async () => {
  if (!confirm(copy.value.removeLogoConfirm(team.value.name || copy.value.teamFallback))) return

  try {
    await removeTeamLogo(teamId)
    team.value.logo = null
    showToast(copy.value.logoRemoved)
  } catch (error) {
    console.error('Error deleting team logo:', error)
    showToast(copy.value.logoRemoveError, 'error')
  }
}

const reviewCoachRequest = async (request, decision) => {
  const actionLabel = decision === 'approve' ? 'approve' : 'reject'

  if (!confirm(copy.value.reviewConfirm(actionLabel, coachRequestName(request)))) {
    return
  }

  try {
    if (decision === 'approve') {
      await approveCoachJoinRequest(teamId, request.id)
      showToast(copy.value.coachApproved(coachRequestName(request)))
    } else {
      await rejectCoachJoinRequest(teamId, request.id)
      showToast(copy.value.coachRejected(coachRequestName(request)))
    }

    coachRequests.value = coachRequests.value.filter((entry) => entry.id !== request.id)
  } catch (error) {
    console.error(`Error trying to ${actionLabel} coach request:`, error)
    showToast(error.response?.data?.error || copy.value.coachReviewError, 'error')
  }
}

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

const perPlayer = (value) => {
  if (!summary.value.totalPlayers) return '0.0'
  return (value / summary.value.totalPlayers).toFixed(1)
}

const formatFullDate = (value) => new Intl.DateTimeFormat(copy.value.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
const formatShortDay = (value) => new Intl.DateTimeFormat(copy.value.dateLocale, { weekday: 'short' }).format(new Date(`${value}T00:00:00`))
const formatDayNumber = (value) => new Intl.DateTimeFormat(copy.value.dateLocale, { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`))
const formatEventTime = (value) => (value ? value.slice(0, 5) : copy.value.notSpecified)
const formatRequestDate = (value) => new Intl.DateTimeFormat(copy.value.dateLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

const eventTypeLabel = (value) => {
  const normalized = (value || '').toLowerCase()
  if (normalized === 'practice') return copy.value.eventTypes.practice
  if (normalized === 'game') return copy.value.eventTypes.game
  if (normalized === 'meeting') return copy.value.eventTypes.meeting
  return copy.value.eventTypes.other
}

onMounted(() => {
  fetchDashboard()
})
</script>

<style scoped>
.team-dashboard {
  --team-page-bg: var(--bg-color, var(--background-color));
  --team-surface: var(--bg-color-secondary, var(--card-bg));
  --team-border: var(--border-color);
  --team-text: var(--text-color);
  --team-muted: var(--text-color-secondary, var(--text-secondary));
  --team-accent: #0b72e7;
  --team-accent-soft: rgba(11, 114, 231, 0.14);
  --team-danger-soft: rgba(220, 53, 69, 0.12);
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 22%),
    var(--team-page-bg);
  color: var(--team-text);
}

html.dark-mode .team-dashboard {
  --team-accent: #6fb2ff;
  --team-accent-soft: rgba(74, 144, 226, 0.2);
  --team-danger-soft: rgba(255, 107, 107, 0.18);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.22), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    var(--team-page-bg);
}

.dashboard-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
}

.dashboard-hero,
.panel,
.metric-card {
  background: var(--team-surface);
  border: 1px solid var(--team-border);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.dashboard-hero {
  border-radius: 28px;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--team-accent-soft), transparent 65%), var(--team-surface);
}

.hero-grid {
  display: grid;
  grid-template-columns: auto 1.4fr minmax(240px, 320px);
  gap: 1.5rem;
}

.hero-brand {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.logo-frame {
  width: 160px;
  height: 160px;
  border: 1px solid var(--team-border);
  border-radius: 28px;
  padding: 0;
  background: linear-gradient(145deg, var(--team-surface), rgba(255, 255, 255, 0.05));
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--team-accent);
  font-size: 2.75rem;
  font-weight: 800;
  cursor: default;
}

.logo-frame.interactive {
  cursor: pointer;
}

.logo-frame:disabled {
  opacity: 1;
}

.logo-frame.interactive:hover {
  transform: translateY(-2px);
}

.team-logo-image,
.logo-fallback {
  width: 100%;
  height: 100%;
}

.team-logo-image {
  object-fit: cover;
}

.logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--team-accent-soft), transparent);
}

.logo-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.hidden-input {
  display: none;
}

.hero-copy h1 {
  margin: 0.25rem 0 0.9rem;
  font-size: clamp(2rem, 3vw, 3.2rem);
  line-height: 1;
}

.eyebrow,
.panel-kicker {
  margin: 0;
  color: var(--team-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
}

.hero-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 1.2rem 0 1.5rem;
}

.hero-pill,
.panel-link,
.panel-chip,
.leader-stats span,
.event-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
}

.hero-pill {
  border: 1px solid var(--team-border);
  background: var(--team-surface);
  color: var(--team-muted);
}

.hero-pill.code {
  color: var(--team-text);
}

.hero-pill.accent,
.panel-link,
.panel-chip,
.leader-stats span {
  background: var(--team-accent-soft);
  color: var(--team-accent);
}

.hero-pill.attention {
  background: rgba(11, 114, 231, 0.18);
  color: var(--team-accent);
  border-color: rgba(11, 114, 231, 0.28);
}

.hero-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.hero-link {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid var(--team-border);
  background: var(--team-surface);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.hero-link:hover {
  transform: translateY(-2px);
  border-color: var(--team-accent);
}

.link-title {
  font-weight: 700;
}

.link-subtitle {
  color: var(--team-muted);
  font-size: 0.86rem;
}

.hero-highlight {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.highlight-card {
  min-height: 132px;
  padding: 1.1rem 1.15rem;
  border: 1px solid var(--team-border);
  border-radius: 22px;
  background: var(--team-surface);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.highlight-card.soft {
  background: linear-gradient(135deg, var(--team-accent-soft), transparent 70%), var(--team-surface);
}

.highlight-label,
.metric-label {
  color: var(--team-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.82rem;
}

.highlight-card strong {
  margin: 0.35rem 0;
  font-size: 1.2rem;
}

.highlight-card p {
  margin: 0;
  color: var(--team-muted);
}

.hero-button {
  border: 1px solid var(--team-border);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  background: var(--team-surface);
  color: var(--team-text);
  cursor: pointer;
  font-weight: 700;
}

.hero-button.primary {
  background: var(--team-accent);
  border-color: var(--team-accent);
  color: white;
}

.hero-button.secondary:hover,
.hero-button.secondary:focus-visible {
  border-color: var(--team-accent);
}

.hero-button.danger {
  background: var(--team-danger-soft);
  color: #b42318;
}

html.dark-mode .hero-button.danger {
  color: #ff8b8b;
}

.metrics-grid,
.section-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.metrics-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  justify-content: center;
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

.section-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel,
.metric-card {
  border-radius: 24px;
  padding: 1.25rem;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.metric-value {
  font-size: 2rem;
  line-height: 1;
}

.metric-note {
  color: var(--team-muted);
  font-size: 0.88rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0.25rem 0 0;
  font-size: 1.35rem;
}

.leaderboard,
.event-list,
.coach-request-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.leader-card,
.event-item,
.coach-request-card,
.empty-card {
  border: 1px solid var(--team-border);
  border-radius: 18px;
  padding: 0.95rem 1rem;
}

.coach-requests-panel {
  margin-top: 1rem;
}

.coach-request-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  background: linear-gradient(135deg, rgba(11, 114, 231, 0.06), transparent 75%);
}

.coach-request-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.coach-request-avatar {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: var(--team-accent-soft);
  color: var(--team-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  overflow: hidden;
  flex-shrink: 0;
}

.coach-request-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.coach-request-copy {
  min-width: 0;
}

.coach-request-copy strong,
.coach-request-copy p,
.coach-request-copy small {
  display: block;
}

.coach-request-copy p,
.coach-request-copy small {
  margin: 0.2rem 0 0;
  color: var(--team-muted);
  overflow: hidden;
  text-overflow: ellipsis;
}

.coach-request-actions {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.leader-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
}

.leader-card.rank-1 {
  background: linear-gradient(135deg, var(--team-accent-soft), transparent 60%);
}

.leader-rank,
.leader-avatar,
.event-date {
  background: var(--team-accent-soft);
  color: var(--team-accent);
}

.leader-rank {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.leader-main {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.leader-main h3,
.event-copy h3 {
  margin: 0;
}

.leader-main p,
.event-copy p,
.empty-card {
  margin: 0.2rem 0 0;
  color: var(--team-muted);
}

.leader-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.leader-stats {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.event-badge.game {
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
}

.event-badge.practice {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}

.event-badge.meeting {
  background: rgba(168, 85, 247, 0.14);
  color: #7c3aed;
}

html.dark-mode .event-badge.game {
  color: #ff9a9a;
}

html.dark-mode .event-badge.practice {
  color: #86efac;
}

html.dark-mode .event-badge.meeting {
  color: #d8b4fe;
}

.event-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
}

.event-date {
  min-width: 68px;
  border-radius: 16px;
  padding: 0.75rem 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.event-date strong {
  font-size: 0.82rem;
  text-transform: uppercase;
}

.event-date span {
  font-size: 1rem;
  font-weight: 700;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  align-items: flex-end;
  color: var(--team-muted);
  font-size: 0.88rem;
}

.empty-card {
  background: rgba(255, 255, 255, 0.02);
}

.toast {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  padding: 0.9rem 1.15rem;
  border-radius: 14px;
  color: white;
  background: #1f8f5a;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
  z-index: 20;
}

.toast.error {
  background: #c43d3d;
}

.toast.info {
  background: #0b72e7;
}

@media (max-width: 1180px) {
  .hero-grid,
  .section-grid {
    grid-template-columns: 1fr;
  }

  .hero-highlight {
    flex-direction: row;
  }

  .hero-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-shell {
    padding: 1rem;
  }

  .dashboard-hero,
  .panel,
  .metric-card {
    border-radius: 20px;
  }

  .hero-grid {
    gap: 1rem;
  }

  .hero-brand {
    align-items: center;
  }

  .logo-frame {
    width: 122px;
    height: 122px;
    border-radius: 22px;
  }

  .hero-copy {
    text-align: center;
  }

  .hero-pills {
    justify-content: center;
  }

  .hero-actions,
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .hero-highlight {
    flex-direction: column;
  }

  .leader-card,
  .event-item,
  .coach-request-card {
    grid-template-columns: 1fr;
  }

  .leader-stats,
  .event-meta {
    justify-content: flex-start;
    align-items: flex-start;
  }

  .coach-request-card,
  .coach-request-main,
  .coach-request-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .coach-request-copy {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .dashboard-shell {
    padding: 0.75rem;
  }

  .dashboard-hero {
    padding: 1rem;
  }

  .hero-copy h1 {
    font-size: 1.8rem;
  }

  .panel,
  .metric-card {
    padding: 1rem;
  }

  .hero-link {
    padding: 0.9rem;
  }

  .event-date {
    min-width: 0;
    width: fit-content;
  }

  .toast {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
  }
}
</style>
