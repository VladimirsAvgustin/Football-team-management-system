<template>
  <div class="statistics-page">
    <div class="statistics-shell">
      <section class="statistics-hero">
        <div class="hero-main">
          <div class="hero-copy">
            <p class="eyebrow">{{ copy.eyebrow }}</p>
            <h1>{{ team.name || copy.teamFallback }}</h1>
           

            <div class="hero-pills">
              <span class="hero-pill">{{ summary.totalGoals }} {{ copy.goalsLower }}</span>
              <span class="hero-pill">{{ summary.totalMatches }} {{ copy.matchesLower }}</span>
              <span class="hero-pill accent">{{ summary.avgAttendance }}% {{ copy.attendanceLower }}</span>
            </div>
          </div>

          <div class="hero-nav">
            <router-link :to="`/team/${teamId}/players`" class="nav-chip">
              {{ copy.navPlayers }}
            </router-link>
            <router-link :to="`/team/${teamId}/statistics`" class="nav-chip" active-class="active">
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
            <p>{{ topScorer ? copy.topScorerNote(topScorer.goals ?? topScorer.stats?.goals ?? 0) : copy.topScorerEmpty }}</p>
          </div>
          <div class="summary-card">
            <span class="summary-label">{{ copy.topCreator }}</span>
            <strong>{{ topCreator ? fullName(topCreator) : copy.noData }}</strong>
            <p>{{ topCreator ? copy.topCreatorNote(topCreator.assists ?? topCreator.stats?.assists ?? 0) : copy.topCreatorEmpty }}</p>
          </div>
        </div>
      </section>

      <div v-if="isCoach">
        <section class="headline-grid">
          <article v-for="metric in headlineMetrics" :key="metric.label" class="headline-card">
            <span class="headline-label">{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>{{ metric.note }}</small>
          </article>
        </section>

        <section class="chart-grid">
          <article class="chart-panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">{{ copy.contributionKicker }}</p>
                <h2>{{ copy.goalsAndAssists }}</h2>
              </div>
            </div>

            <div v-if="contributionBreakdown.length" class="chart-stack">
              <div class="chart-summary-strip">
                <div class="chart-summary-card">
                  <span class="chart-summary-label">{{ copy.biggestContribution }}</span>
                  <strong>{{ contributionBreakdown[0].total }}</strong>
                  <small>{{ fullName(contributionBreakdown[0].player) }}</small>
                </div>
                <div class="chart-summary-card">
                  <span class="chart-summary-label">{{ copy.trackedActions }}</span>
                  <strong>{{ totalDirectActions }}</strong>
                  <small>{{ copy.actionsFromLeaders }}</small>
                </div>
              </div>

              <div class="split-list">
                <article v-for="entry in contributionBreakdown" :key="entry.player.id" class="split-row">
                  <div class="chart-player">
                    <div class="chart-rank">#{{ entry.rank }}</div>
                    <div class="chart-player-avatar">
                      <img v-if="entry.player.avatar" :src="entry.player.avatar" :alt="fullName(entry.player)" class="chart-player-image">
                      <template v-else>{{ getInitials(fullName(entry.player)) }}</template>
                    </div>
                    <div class="chart-player-copy">
                      <strong>{{ fullName(entry.player) }}</strong>
                      <small>{{ copy.teamShareText(formatPercent(entry.teamShare)) }}</small>
                    </div>
                  </div>

                  <div class="split-visual">
                    <div class="split-track">
                      <span class="split-segment goals" :style="{ width: `${entry.goalShare}%` }"></span>
                      <span class="split-segment assists" :style="{ width: `${entry.assistShare}%` }"></span>
                    </div>
                    <div class="split-meta">
                      <span>{{ entry.goals }} {{ copy.goalsLower }}</span>
                      <span>{{ entry.assists }} {{ copy.assistsLower }}</span>
                    </div>
                  </div>

                  <div class="split-total">
                    <strong>{{ entry.total }}</strong>
                    <small>{{ copy.total }}</small>
                  </div>
                </article>
              </div>
            </div>
            <div v-else class="empty-card">
              {{ copy.contributionEmpty }}
            </div>
          </article>

          <article class="chart-panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">{{ copy.workload }}</p>
                <h2>{{ copy.matchesPlayed }}</h2>
              </div>
            </div>

            <div v-if="workloadBreakdown.length" class="chart-stack">
              <div class="chart-summary-strip">
                <div class="chart-summary-card">
                  <span class="chart-summary-label">{{ copy.biggestWorkload }}</span>
                  <strong>{{ maxMatchesTracked }}</strong>
                  <small>{{ copy.biggestMatchCount }}</small>
                </div>
                <div class="chart-summary-card">
                  <span class="chart-summary-label">{{ copy.teamAverage }}</span>
                  <strong>{{ averageMatches() }}</strong>
                  <small>{{ copy.matchesPerTrackedPlayer }}</small>
                </div>
              </div>

              <div class="usage-list">
                <article v-for="entry in workloadBreakdown" :key="entry.player.id" class="usage-row">
                  <div class="chart-player">
                    <div class="chart-rank soft">#{{ entry.rank }}</div>
                    <div class="chart-player-avatar usage">
                      <img v-if="entry.player.avatar" :src="entry.player.avatar" :alt="fullName(entry.player)" class="chart-player-image">
                      <template v-else>{{ getInitials(fullName(entry.player)) }}</template>
                    </div>
                    <div class="chart-player-copy">
                      <strong>{{ fullName(entry.player) }}</strong>
                    </div>
                  </div>

                  <div class="usage-visual">
                    <div class="usage-track">
                      <span class="usage-fill" :style="{ width: `${entry.usagePercent}%` }"></span>
                    </div>
                  </div>

                  <div class="usage-total">
                    <strong>{{ entry.matches }}</strong>
                    <small>{{ copy.matchesLower }}</small>
                  </div>
                </article>
              </div>
            </div>
            <div v-else class="empty-card">
              {{ copy.workloadEmpty }}
            </div>
          </article>
        </section>

        <section class="table-section">
          <article class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">{{ copy.detailedTable }}</p>
                <h2>{{ copy.fullPlayerStats }}</h2>
              </div>
              <div class="panel-actions">
                <button
                  type="button"
                  class="export-btn"
                  :disabled="!rankedPlayers.length"
                  @click="exportStatisticsCsv"
                >
                  {{ copy.exportCsv }}
                </button>
                <button
                  type="button"
                  class="export-btn secondary"
                  :disabled="!rankedPlayers.length"
                  @click="exportStatisticsExcel"
                >
                  {{ copy.exportExcel }}
                </button>
                <span class="panel-chip">{{ copy.rowsCount(rankedPlayers.length) }}</span>
              </div>
            </div>

            <div v-if="rankedPlayers.length" class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{{ copy.player }}</th>
                    <th>{{ copy.matches }}</th>
                    <th>{{ copy.goals }}</th>
                    <th>{{ copy.assists }}</th>
                    <th>{{ copy.yellowShort }}</th>
                    <th>{{ copy.redShort }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(player, index) in rankedPlayers" :key="player.id">
                    <td>{{ index + 1 }}</td>
                    <td>
                      <div class="stats-player-cell">
                        <div class="stats-player-avatar">
                          <img v-if="player.avatar" :src="player.avatar" :alt="fullName(player)" class="stats-player-image">
                          <template v-else>{{ getInitials(fullName(player)) }}</template>
                        </div>
                        <div class="stats-player-copy">
                          <strong>{{ fullName(player) }}</strong>
                          <small>{{ contributionText(player) }}</small>
                        </div>
                      </div>
                    </td>
                    <td>{{ player.stats.matches }}</td>
                    <td>{{ player.stats.goals }}</td>
                    <td>{{ player.stats.assists }}</td>
                    <td>{{ player.stats.yellow_cards }}</td>
                    <td>{{ player.stats.red_cards }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-card">
              {{ copy.tableEmpty }}
            </div>
          </article>
        </section>
      </div>

      <section v-else class="access-panel">
        <h2>{{ copy.coachAccessTitle }}</h2>
        <p>{{ copy.coachAccessText }}</p>
        <router-link :to="`/team/${teamId}/players`" class="access-link">
          {{ copy.openPlayersPage }}
        </router-link>
      </section>

      <div v-if="loading" class="loading-panel">
        <div class="loading-spinner"></div>
        <p>{{ $t('messages.loading') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { canManageTeam } from '../utils/teamAccess'
import { fetchTeamBundle, fetchTeamSummary } from '../services/teamApi'

const STATS_COPY = {
  en: {
    eyebrow: 'Performance analytics',
    teamFallback: 'Team statistics',
    goals: 'Goals',
    assists: 'Assists',
    matches: 'Matches',
    attendance: 'Attendance',
    goalsLower: 'goals',
    assistsLower: 'assists',
    matchesLower: 'matches',
    attendanceLower: 'attendance',
    navPlayers: 'Players',
    navStatistics: 'Statistics',
    navSchedule: 'Schedule',
    topScorer: 'Top scorer',
    topCreator: 'Top creator',
    noData: 'No data yet',
    topScorerNote: (goals) => `${goals} goals this cycle`,
    topScorerEmpty: 'Goal data will appear here.',
    topCreatorNote: (assists) => `${assists} assists`,
    topCreatorEmpty: 'Assist trends will appear here.',
    contributionKicker: 'Contribution breakdown',
    goalsAndAssists: 'Goals and assists',
    biggestContribution: 'Biggest contribution',
    trackedActions: 'Tracked actions',
    actionsFromLeaders: 'Goals and assists from the leader group',
    teamShareText: (percent) => `${percent} of direct actions`,
    total: 'total',
    contributionEmpty: 'Add player statistics to unlock contribution insights.',
    workload: 'Workload',
    matchesPlayed: 'Matches played',
    biggestWorkload: 'Biggest workload',
    biggestMatchCount: 'Highest match count in the roster',
    teamAverage: 'Team average',
    matchesPerTrackedPlayer: 'Matches per tracked player',
    workloadEmpty: 'Add player match participation to unlock workload insights.',
    detailedTable: 'Detailed table',
    fullPlayerStats: 'Full player statistics',
    exportCsv: 'Export CSV',
    exportExcel: 'Export Excel',
    rowsCount: (count) => `${count} ${count === 1 ? 'row' : 'rows'}`,
    player: 'Player',
    yellowShort: 'Yellow',
    redShort: 'Red',
    tableEmpty: 'Add player statistics to unlock the table view.',
    coachAccessTitle: 'Coach access required',
    coachAccessText: 'Only this team’s coaches can open the analytics workspace.',
    openPlayersPage: 'Open players page',
    perPlayer: 'per player',
    completedMatches: 'Completed matches from the schedule',
    noCompletedMatches: 'No completed matches in the schedule yet',
    practiceAttendance: 'Practice attendance',
    contributionText: (player) => `${player.stats.matches} matches, ${player.stats.goals} goals, ${player.stats.assists} assists`,
    exportHeaders: ['Rank', 'Player', 'Email', 'Matches', 'Goals', 'Assists', 'Yellow cards', 'Red cards'],
    worksheetName: 'Statistics',
    filenameFallback: 'team'
  },
  lv: {
    eyebrow: 'Snieguma analītika',
    teamFallback: 'Komandas statistika',
    goals: 'Vārti',
    assists: 'Piespēles',
    matches: 'Spēles',
    attendance: 'Apmeklējums',
    goalsLower: 'vārti',
    assistsLower: 'piespēles',
    matchesLower: 'spēles',
    attendanceLower: 'apmeklējums',
    navPlayers: 'Spēlētāji',
    navStatistics: 'Statistika',
    navSchedule: 'Grafiks',
    topScorer: 'Labākais vārtu guvējs',
    topCreator: 'Labākais piespēlētājs',
    noData: 'Datu vēl nav',
    topScorerNote: (goals) => `${goals} vārti šajā ciklā`,
    topScorerEmpty: 'Vārtu dati parādīsies šeit.',
    topCreatorNote: (assists) => `${assists} rezultatīvas piespēles`,
    topCreatorEmpty: 'Piespēļu tendences parādīsies šeit.',
    contributionKicker: 'Ieguldījuma sadalījums',
    goalsAndAssists: 'Vārti un piespēles',
    biggestContribution: 'Lielākais ieguldījums',
    trackedActions: 'Uzskaitītās darbības',
    actionsFromLeaders: 'Vārti un piespēles no līderu grupas',
    teamShareText: (percent) => `${percent} no tiešajām darbībām`,
    total: 'kopā',
    contributionEmpty: 'Pievienojiet spēlētāju statistiku, lai atvērtu ieguldījuma ieskatus.',
    workload: 'Slodze',
    matchesPlayed: 'Aizvadītās spēles',
    biggestWorkload: 'Lielākā slodze',
    biggestMatchCount: 'Lielākais spēļu skaits sastāvā',
    teamAverage: 'Komandas vidējais',
    matchesPerTrackedPlayer: 'Spēles uz uzskaitīto spēlētāju',
    workloadEmpty: 'Pievienojiet spēlētāju dalību spēlēs, lai atvērtu slodzes ieskatus.',
    detailedTable: 'Detalizēta tabula',
    fullPlayerStats: 'Pilna spēlētāju statistika',
    exportCsv: 'Eksportēt CSV',
    exportExcel: 'Eksportēt Excel',
    rowsCount: (count) => `${count} rindas`,
    player: 'Spēlētājs',
    yellowShort: 'Dzeltenās',
    redShort: 'Sarkanās',
    tableEmpty: 'Pievienojiet spēlētāju statistiku, lai atvērtu tabulas skatu.',
    coachAccessTitle: 'Nepieciešama trenera piekļuve',
    coachAccessText: 'Analītikas darba vidi var atvērt tikai šīs komandas treneri.',
    openPlayersPage: 'Atvērt spēlētāju lapu',
    perPlayer: 'uz spēlētāju',
    completedMatches: 'Pabeigtās spēles no grafika',
    noCompletedMatches: 'Grafikā vēl nav aizvadītu spēļu',
    practiceAttendance: 'Treniņu apmeklējums',
    contributionText: (player) => `${player.stats.matches} spēles, ${player.stats.goals} vārti, ${player.stats.assists} piespēles`,
    exportHeaders: ['Vieta', 'Spēlētājs', 'E-pasts', 'Spēles', 'Vārti', 'Piespēles', 'Dzeltenās kartītes', 'Sarkanās kartītes'],
    worksheetName: 'Statistika',
    filenameFallback: 'komanda'
  }
}

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const teamId = route.params.id
const team = ref({ name: '', coach_id: null, logo: null })
const players = ref([])
const summary = ref({
  totalPlayers: 0,
  totalMatches: 0,
  totalGoals: 0,
  totalAssists: 0,
  totalYellowCards: 0,
  totalRedCards: 0,
  avgAttendance: 0,
  topScorers: [],
  topAssists: []
})
const loading = ref(false)
const localeKey = computed(() => (locale.value === 'en' ? 'en' : 'lv'))
const copy = computed(() => STATS_COPY[localeKey.value])

const currentUser = computed(() => authStore.user)
const isCoach = canManageTeam({
  userRef: currentUser,
  teamRef: team,
  teamIdRef: computed(() => teamId)
})

const fullName = (player) => `${player.name || ''} ${player.surname || ''}`.trim()
const getInitials = (name = '') => name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'

const rankedPlayers = computed(() => [...players.value].sort((a, b) => {
  const goalsDiff = (b.stats?.goals || 0) - (a.stats?.goals || 0)
  if (goalsDiff !== 0) return goalsDiff
  const assistsDiff = (b.stats?.assists || 0) - (a.stats?.assists || 0)
  if (assistsDiff !== 0) return assistsDiff
  const matchesDiff = (b.stats?.matches || 0) - (a.stats?.matches || 0)
  if (matchesDiff !== 0) return matchesDiff
  return fullName(a).localeCompare(fullName(b))
}))

const topScorer = computed(() => summary.value.topScorers[0] || rankedPlayers.value[0] || null)
const topCreator = computed(() => {
  return summary.value.topAssists[0] ||
    [...players.value]
      .filter((player) => (player.stats?.assists || 0) > 0)
      .sort((a, b) => {
        const assistsDiff = (b.stats?.assists || 0) - (a.stats?.assists || 0)
        if (assistsDiff !== 0) return assistsDiff

        const goalsDiff = (b.stats?.goals || 0) - (a.stats?.goals || 0)
        if (goalsDiff !== 0) return goalsDiff

        return fullName(a).localeCompare(fullName(b))
      })[0] ||
    null
})

const performanceLeaders = computed(() => {
  return [...players.value]
    .filter((player) => (player.stats?.goals || 0) > 0 || (player.stats?.assists || 0) > 0)
    .sort((a, b) => {
      const contributionDiff = ((b.stats?.goals || 0) + (b.stats?.assists || 0)) - ((a.stats?.goals || 0) + (a.stats?.assists || 0))
      if (contributionDiff !== 0) return contributionDiff

      const goalsDiff = (b.stats?.goals || 0) - (a.stats?.goals || 0)
      if (goalsDiff !== 0) return goalsDiff

      return fullName(a).localeCompare(fullName(b))
    })
    .slice(0, 5)
})

const matchesLeaders = computed(() => {
  return [...players.value]
    .filter((player) => (player.stats?.matches || 0) > 0)
    .sort((a, b) => {
      const matchesDiff = (b.stats?.matches || 0) - (a.stats?.matches || 0)
      if (matchesDiff !== 0) return matchesDiff

      const goalsDiff = (b.stats?.goals || 0) - (a.stats?.goals || 0)
      if (goalsDiff !== 0) return goalsDiff

      return fullName(a).localeCompare(fullName(b))
    })
    .slice(0, 5)
})

const totalDirectActions = computed(() => {
  return contributionBreakdown.value.reduce((sum, entry) => sum + entry.total, 0)
})

const maxMatchesTracked = computed(() => {
  return Math.max(1, ...matchesLeaders.value.map((player) => Number(player.stats?.matches) || 0), 0)
})

const contributionBreakdown = computed(() => {
  const list = performanceLeaders.value.length ? performanceLeaders.value : [...rankedPlayers.value].slice(0, 5)
  const total = list.reduce((sum, player) => sum + (player.stats?.goals || 0) + (player.stats?.assists || 0), 0)

  return list.map((player, index) => {
    const goals = Number(player.stats?.goals) || 0
    const assists = Number(player.stats?.assists) || 0
    const contributionTotal = goals + assists

    return {
      player,
      rank: index + 1,
      goals,
      assists,
      total: contributionTotal,
      goalShare: contributionTotal ? (goals / contributionTotal) * 100 : 0,
      assistShare: contributionTotal ? (assists / contributionTotal) * 100 : 0,
      teamShare: total ? (contributionTotal / total) * 100 : 0
    }
  })
})

const workloadBreakdown = computed(() => {
  const list = matchesLeaders.value.length ? matchesLeaders.value : [...rankedPlayers.value].slice(0, 5)
  const peakMatches = maxMatchesTracked.value || 1

  return list.map((player, index) => {
    const matches = Number(player.stats?.matches) || 0
    const usagePercent = peakMatches ? (matches / peakMatches) * 100 : 0

    return {
      player,
      rank: index + 1,
      matches,
      usagePercent
    }
  })
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
    note: summary.value.totalMatches
      ? copy.value.completedMatches
      : copy.value.noCompletedMatches
  },
  {
    label: copy.value.attendance,
    value: `${summary.value.avgAttendance}%`,
    note: copy.value.practiceAttendance
  }
])

const exportRows = computed(() => rankedPlayers.value.map((player, index) => ({
  rank: index + 1,
  player: fullName(player),
  email: player.email || '',
  matches: player.stats.matches,
  goals: player.stats.goals,
  assists: player.stats.assists,
  yellowCards: player.stats.yellow_cards,
  redCards: player.stats.red_cards
})))

const fetchStatistics = async () => {
  loading.value = true
  try {
    const [bundle, stats] = await Promise.all([
      fetchTeamBundle(teamId),
      fetchTeamSummary(teamId)
    ])

    team.value = bundle.team
    players.value = bundle.players
    summary.value = stats
  } catch (error) {
    console.error('Error fetching team statistics:', error)
  } finally {
    loading.value = false
  }
}

const formatChartLabel = (player) => {
  const full = fullName(player)
  if (full.length <= 16) return full

  const [firstName = '', ...rest] = full.split(' ')
  const lastName = rest.join(' ')

  if (firstName && lastName) {
    return `${firstName[0]}. ${lastName}`
  }

  return `${full.slice(0, 15)}…`
}

const perPlayer = (value) => {
  if (!summary.value.totalPlayers) return '0.0'
  return (value / summary.value.totalPlayers).toFixed(1)
}

const averageMatches = () => {
  if (!players.value.length) return '0.0'
  const totalMatches = players.value.reduce((sum, player) => sum + (player.stats?.matches || 0), 0)
  return (totalMatches / players.value.length).toFixed(1)
}

const formatPercent = (value) => {
  if (!Number.isFinite(value) || value <= 0) return '0%'
  return `${Math.max(1, Math.round(value))}%`
}

const contributionText = (player) => {
  return copy.value.contributionText(player)
}

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? '')
  if (/[";\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

const escapeXmlValue = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const createFilename = (extension) => {
  const safeTeamName = (team.value?.name || copy.value.filenameFallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '') || copy.value.filenameFallback

  return `${safeTeamName}-${copy.value.worksheetName.toLowerCase()}.${extension}`
}

const downloadBlob = (content, mimeType, filename) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const exportStatisticsCsv = () => {
  const delimiter = ';'
  const headers = copy.value.exportHeaders
  const lines = [
    `sep=${delimiter}`,
    headers.join(delimiter),
    ...exportRows.value.map((row) => [
      row.rank,
      row.player,
      row.email,
      row.matches,
      row.goals,
      row.assists,
      row.yellowCards,
      row.redCards
    ].map(escapeCsvValue).join(delimiter))
  ]

  downloadBlob(`\uFEFF${lines.join('\n')}`, 'text/csv;charset=utf-8;', createFilename('csv'))
}

const exportStatisticsExcel = () => {
  const rowsXml = exportRows.value.map((row) => `
    <Row>
      <Cell><Data ss:Type="Number">${row.rank}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXmlValue(row.player)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXmlValue(row.email)}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.matches}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.goals}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.assists}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.yellowCards}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.redCards}</Data></Cell>
    </Row>
  `).join('')

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Worksheet ss:Name="${escapeXmlValue(copy.value.worksheetName)}">
        <Table>
          <Row>
            ${copy.value.exportHeaders.map((header) => `<Cell><Data ss:Type="String">${escapeXmlValue(header)}</Data></Cell>`).join('')}
          </Row>
          ${rowsXml}
        </Table>
      </Worksheet>
    </Workbook>`

  downloadBlob(`\uFEFF${workbook}`, 'application/vnd.ms-excel;charset=utf-8;', createFilename('xls'))
}

onMounted(async () => {
  await fetchStatistics()
})
</script>

<style scoped>
.statistics-page {
  --page-bg: var(--bg-color, var(--background-color));
  --page-surface: var(--bg-color-secondary, var(--card-bg));
  --page-border: var(--border-color);
  --page-text: var(--text-color);
  --page-muted: var(--text-color-secondary, var(--text-secondary));
  --page-accent: #0b72e7;
  --page-accent-soft: rgba(11, 114, 231, 0.14);
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 24%),
    var(--page-bg);
  color: var(--page-text);
}

html.dark-mode .statistics-page {
  --page-accent: #6fb2ff;
  --page-accent-soft: rgba(74, 144, 226, 0.2);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.2), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    var(--page-bg);
}

.statistics-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
}

.statistics-hero,
.headline-card,
.chart-panel,
.panel,
.access-panel {
  background: var(--page-surface);
  border: 1px solid var(--page-border);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
}

.statistics-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(520px, 600px);
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
.panel-kicker {
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

.hero-description,
.summary-card p,
.headline-card small,
.access-panel p,
.empty-card {
  color: var(--page-muted);
}

.hero-pills,
.hero-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hero-pill,
.nav-chip,
.panel-chip,
.access-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  font-weight: 700;
}

.hero-pill,
.nav-chip {
  border: 1px solid var(--page-border);
  background: var(--page-surface);
  color: var(--page-muted);
  text-decoration: none;
}

.hero-pill.accent,
.nav-chip.active,
.panel-chip,
.access-link {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.hero-side {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
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

.headline-grid,
.chart-grid,
.table-section {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.headline-grid {
  grid-template-columns: repeat(3, minmax(240px, 267px));
  justify-content: center;
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.headline-card,
.chart-panel,
.panel,
.access-panel {
  border-radius: 24px;
  padding: 1.2rem;
}

.chart-panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.headline-card strong {
  display: block;
  font-size: 2rem;
  line-height: 1;
  margin: 0.3rem 0;
}

.chart-stack {
  display: grid;
  gap: 1rem;
}

.chart-summary-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.chart-summary-card,
.split-row,
.usage-row {
  border: 1px solid var(--page-border);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent), var(--page-surface);
}

.chart-summary-card {
  padding: 0.95rem 1rem;
}

.chart-summary-label {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--page-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}

.chart-summary-card strong {
  display: block;
  font-size: 1.65rem;
  line-height: 1;
}

.chart-summary-card small {
  display: block;
  margin-top: 0.35rem;
  color: var(--page-muted);
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
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.export-btn {
  border: none;
  border-radius: 999px;
  padding: 0.65rem 0.95rem;
  background: var(--page-accent);
  color: white;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 10px 22px rgba(11, 114, 231, 0.18);
}

.export-btn.secondary {
  background: rgba(11, 114, 231, 0.08);
  color: var(--page-accent);
  border: 1px solid rgba(11, 114, 231, 0.12);
  box-shadow: none;
}

.export-btn:hover {
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.split-list,
.usage-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.split-row,
.usage-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 0.95rem 1rem;
}

.split-row:first-child,
.usage-row:first-child {
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 90%), var(--page-surface);
}

.chart-player {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.chart-rank {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--page-accent-soft);
  color: var(--page-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}

.chart-rank.soft {
  background: rgba(23, 182, 200, 0.14);
  color: #17b6c8;
}

.chart-player-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--page-accent-soft);
  color: var(--page-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  overflow: hidden;
  flex-shrink: 0;
}

.chart-player-avatar.usage {
  background: rgba(23, 182, 200, 0.14);
  color: #17b6c8;
}

.chart-player-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.chart-player-copy {
  min-width: 0;
  display: grid;
  gap: 0.2rem;
}

.chart-player-copy strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-player-copy small {
  color: var(--page-muted);
}

.split-visual,
.usage-visual {
  min-width: 0;
}

.split-track,
.usage-track {
  width: 100%;
  height: 16px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.14);
}

.split-track {
  display: flex;
}

.split-segment {
  height: 100%;
  display: block;
}

.split-segment.goals {
  background: linear-gradient(90deg, #0b72e7, #2f8cff);
}

.split-segment.assists {
  background: linear-gradient(90deg, #7fb5ff, #bdd8ff);
}

.usage-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #17b6c8, #64d2df);
}

.split-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.45rem;
  font-size: 0.82rem;
  color: var(--page-muted);
}

.split-total,
.usage-total {
  min-width: 64px;
  display: grid;
  justify-items: end;
  gap: 0.15rem;
}

.split-total strong,
.usage-total strong {
  font-size: 1.25rem;
  line-height: 1;
}

.split-total small,
.usage-total small {
  color: var(--page-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.72rem;
}

.stats-table-wrap {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 0.9rem 0.8rem;
  text-align: left;
  border-bottom: 1px solid var(--page-border);
  vertical-align: middle;
}

.stats-table th {
  color: var(--page-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
}

.stats-player-cell {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 240px;
}

.stats-player-avatar {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: var(--page-accent-soft);
  color: var(--page-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
  overflow: hidden;
}

.stats-player-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.stats-player-copy {
  display: grid;
  gap: 0.2rem;
}

.stats-player-copy strong {
  display: block;
}

.stats-player-copy small {
  color: var(--page-muted);
}


.empty-card {
  border: 1px solid var(--page-border);
  border-radius: 18px;
  padding: 0.95rem 1rem;
}

.access-panel {
  margin-top: 1rem;
  text-align: center;
}

.access-panel h2 {
  margin-top: 0;
}

.access-link {
  margin-top: 0.75rem;
  text-decoration: none;
}

.loading-panel {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  color: var(--page-muted);
}

.loading-spinner {
  width: 42px;
  height: 42px;
  border: 3px solid var(--page-border);
  border-top-color: var(--page-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .statistics-hero,
  .chart-grid {
    grid-template-columns: 1fr;
  }

  .hero-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .headline-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .statistics-shell {
    padding: 1rem;
  }

  .statistics-hero,
  .headline-card,
  .chart-panel,
  .panel,
  .access-panel {
    border-radius: 20px;
  }

  .hero-side {
    grid-template-columns: 1fr;
  }

  .headline-grid {
    grid-template-columns: 1fr;
  }

  .chart-summary-strip,
  .split-row,
  .usage-row {
    grid-template-columns: 1fr;
  }

  .split-total,
  .usage-total {
    justify-content: flex-start;
    justify-items: flex-start;
  }
}

@media (max-width: 540px) {
  .statistics-shell {
    padding: 0.75rem;
  }

  .statistics-hero,
  .headline-card,
  .chart-panel,
  .panel,
  .access-panel {
    padding: 1rem;
  }

  .hero-copy h1 {
    font-size: 1.85rem;
  }
}
</style>
