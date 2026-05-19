<template>
  <div class="home-page" :class="[localeKey === 'lv' ? 'locale-lv' : '', isDarkMode ? 'dark' : '']">
    <div class="home-shell">
      <div class="home-wordmark-wrap">
        <span class="home-wordmark-line" aria-hidden="true"></span>
        <div class="home-wordmark" aria-label="TeamFlow">
          <span>TeamFlow</span>
        </div>
        <span class="home-wordmark-line" aria-hidden="true"></span>
      </div>

      <section class="home-hero" :class="isLoggedIn ? 'member' : 'guest'">
        <div class="hero-copy">
          <h1>{{ heroTitle }}</h1>
          <p class="hero-description">{{ heroDescription }}</p>

          <div class="hero-actions">
            <template v-if="!isLoggedIn">
              <button type="button" class="hero-button primary" @click="showLoginModal = true">
                {{ homeCopy.guest.actions.login }}
              </button>
              <router-link to="/register" class="hero-button secondary">
                {{ homeCopy.guest.actions.register }}
              </router-link>
            </template>

            <template v-else>
              <router-link
                v-for="action in heroActionCards"
                :key="`${action.label}-${action.to}`"
                :to="action.to"
                class="hero-button"
                :class="action.tone"
              >
                {{ action.label }}
              </router-link>
            </template>
          </div>

          <p v-if="isLoggedIn && loadError" class="hero-note">{{ loadError }}</p>
        </div>

        <div v-if="isLoggedIn" class="hero-side">
            <article class="preview-card primary member-card">
              <div class="preview-copy">
                <span class="preview-label">{{ homeCopy.member.summaryTitle }}</span>
                <strong>{{ hasTeam ? teamName : homeCopy.member.noTeamHeadline }}</strong>
                <p v-if="!hasTeam">{{ homeCopy.member.noTeamText }}</p>
              </div>

              <div class="member-overview">
                <div class="member-overview-row">
                  <span>{{ homeCopy.member.summaryLabels.team }}</span>
                  <strong>{{ hasTeam ? teamName : homeCopy.member.badges.noTeam }}</strong>
                </div>
                <div class="member-overview-row">
                  <span>{{ homeCopy.member.summaryLabels.role }}</span>
                  <strong>{{ roleLabel }}</strong>
                </div>
                <div class="member-overview-row">
                  <span>{{ homeCopy.member.summaryLabels.upcoming }}</span>
                  <strong>{{ summary.upcomingEvents }}</strong>
                </div>
              </div>

              <div class="member-focus">
                <span class="preview-label">{{ homeCopy.member.focusLabel }}</span>
                <strong>{{ nextFocusCard.title }}</strong>
                <p>{{ nextFocusCard.text }}</p>
              </div>
            </article>
        </div>
      </section>

      <template v-if="!isLoggedIn">
        <section class="content-section two-column">
          <article class="panel">
            <div class="section-head left">
              <p class="section-kicker">{{ homeCopy.guest.capabilitiesKicker }}</p>
              <h2>{{ homeCopy.guest.capabilitiesTitle }}</h2>
            </div>

            <div class="capability-grid">
              <article
                v-for="capability in homeCopy.guest.capabilities"
                :key="capability.title"
                class="capability-card"
                :class="capability.icon"
              >
                <div class="capability-heading">
                  <div class="capability-visual" :class="capability.icon" aria-hidden="true">
                    <svg v-if="capability.icon === 'schedule'" viewBox="0 0 24 24">
                      <rect x="4" y="5" width="16" height="15" rx="3" />
                      <path d="M8 3.5v3" />
                      <path d="M16 3.5v3" />
                      <path d="M4 9.5h16" />
                      <path d="M8 13h3.5" />
                      <path d="M8 16h7" />
                    </svg>
                    <svg v-else-if="capability.icon === 'roster'" viewBox="0 0 24 24">
                      <rect x="3.5" y="5" width="17" height="14" rx="3" />
                      <circle cx="9" cy="10" r="2.2" />
                      <path d="M6.5 15.4c.7-1.3 1.7-2 2.8-2 1.1 0 2.1.7 2.8 2" />
                      <path d="M14.5 9.5h3" />
                      <path d="M14.5 12.8h3" />
                      <path d="M14.5 16h2.2" />
                    </svg>
                    <svg v-else-if="capability.icon === 'statistics'" viewBox="0 0 24 24">
                      <path d="M5 19.5h14" />
                      <rect x="6.5" y="12.5" width="2.6" height="4.5" rx="0.8" />
                      <rect x="10.7" y="9.5" width="2.6" height="7.5" rx="0.8" />
                      <rect x="14.9" y="6.5" width="2.6" height="10.5" rx="0.8" />
                    </svg>
                    <svg v-else-if="capability.icon === 'chat'" viewBox="0 0 24 24">
                      <path d="M6.5 7.5h11a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5H12l-4 3v-3H6.5A2.5 2.5 0 0 1 4 15v-5a2.5 2.5 0 0 1 2.5-2.5Z" />
                      <circle cx="9" cy="12.5" r="0.8" />
                      <circle cx="12" cy="12.5" r="0.8" />
                      <circle cx="15" cy="12.5" r="0.8" />
                    </svg>
                  </div>
                  <div class="capability-title-group">
                    <h3>{{ capability.title }}</h3>
                  </div>
                </div>
                <p>{{ capability.text }}</p>
              </article>
            </div>
          </article>

          <article class="panel">
            <div class="section-head left">
              <p class="section-kicker">{{ homeCopy.guest.guideKicker }}</p>
              <h2>{{ homeCopy.guest.guideTitle }}</h2>
            </div>

            <div class="support-points">
              <div v-for="point in homeCopy.guest.guidePoints" :key="point" class="support-point">
                {{ point }}
              </div>
            </div>

            <div class="support-box">
              <strong>{{ homeCopy.guest.supportTitle }}</strong>
              <p>{{ homeCopy.guest.supportText }}</p>
              <router-link to="/contact" class="inline-link">
                {{ homeCopy.guest.supportAction }}
              </router-link>
            </div>
          </article>
        </section>

        <section class="cta-banner">
          <div>
            <p class="section-kicker">{{ homeCopy.guest.ctaKicker }}</p>
            <h2>{{ homeCopy.guest.ctaTitle }}</h2>
          </div>

          <div class="cta-actions">
            <button type="button" class="hero-button primary" @click="showLoginModal = true">
              {{ homeCopy.guest.actions.login }}
            </button>
            <router-link to="/register" class="hero-button secondary">
              {{ homeCopy.guest.actions.register }}
            </router-link>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="content-section dashboard-grid">
          <article class="panel">
            <div class="section-head left compact">
              <div>
                <p class="section-kicker">{{ homeCopy.member.scheduleKicker }}</p>
                <h2>{{ homeCopy.member.scheduleTitle }}</h2>
              </div>
              <router-link v-if="hasTeam" :to="teamScheduleLink" class="panel-link">
                {{ homeCopy.member.openSchedule }}
              </router-link>
            </div>
            <div v-if="loading" class="empty-card">{{ homeCopy.member.loading }}</div>
            <div v-else-if="upcomingEvents.length" class="event-stack">
              <article v-for="event in upcomingEvents.slice(0, 4)" :key="event.id" class="event-card">
                <div class="event-date-pill">{{ formatEventDate(event.date) }}</div>
                <div class="event-copy">
                  <h3>{{ event.title }}</h3>
                  <p>{{ event.location || event.team || homeCopy.member.locationFallback }}</p>
                </div>
                <div class="event-side">
                  <span class="event-type" :class="displayEventType(event)">{{ eventTypeLabel(displayEventType(event)) }}</span>
                  <span>{{ formatEventTime(event.time) }}</span>
                </div>
              </article>
            </div>
            <div v-else class="empty-card">
              {{ hasTeam ? homeCopy.member.scheduleEmptyHasTeam : homeCopy.member.scheduleEmptyNoTeam }}
            </div>
          </article>

          <article class="panel">
            <div class="section-head left compact">
              <div>
                <p class="section-kicker">{{ homeCopy.member.activityKicker }}</p>
                <h2>{{ homeCopy.member.activityTitle }}</h2>
              </div>
            </div>

            <div v-if="loading" class="empty-card">{{ homeCopy.member.loading }}</div>
            <div v-else-if="recentActivity.length" class="activity-list">
              <article
                v-for="activity in recentActivity.slice(0, 4)"
                :key="activity.id"
                class="activity-card"
              >
                <div class="activity-avatar">{{ getInitials(activity.user) }}</div>
                <div class="activity-copy">
                  <strong>{{ activity.user }}</strong>
                  <p>{{ formatActivityAction(activity) }}</p>
                </div>
                <div class="activity-side">
                  <span class="activity-badge" :class="activity.type">{{ activityTypeLabel(activity.type) }}</span>
                  <small>{{ formatActivityTime(activity.time) }}</small>
                </div>
              </article>
            </div>
            <div v-else class="empty-card">
              {{ hasTeam ? homeCopy.member.activityEmptyHasTeam : homeCopy.member.activityEmptyNoTeam }}
            </div>
          </article>
        </section>

      </template>
    </div>

    <LoginModal v-if="showLoginModal" :is-dark-mode="isDarkMode" @close="showLoginModal = false" @login="handleLogin" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import axios from 'axios'
import LoginModal from '@/components/LoginModal.vue'
import { useAuthStore } from '../stores/auth'
import { normalizeRole } from '../utils/teamAccess'

const HOME_CONTENT = {
  en: {
    guest: {
      title: 'Manage your team more easily',
      description: 'Everything you need for practices, games and communication.',
      actions: {
        login: 'Login',
        register: 'Create account',
        contact: 'Contact support'
      },
      supportTitle: 'Coaches create teams. Players join with the code.',
      supportText: 'A simple flow for first-time users.',
      supportAction: 'Open support page',
      guideKicker: 'Team access',
      guideTitle: 'One simple rule for every team',
      guidePoints: [
        'The coach creates the team workspace',
        'Players join with the team code',
        'Everyone works in the same shared space'
      ],
      stepsKicker: 'Start',
      stepsTitle: 'Start in three steps',
      stepsIntro: 'The home page explains the first steps in the same order people actually use the product.',
      steps: [
        {
          title: 'Create an account',
          text: 'Choose coach or player.'
        },
        {
          title: 'Create or join a team',
          text: 'Coaches set up the workspace. Players join with the code.'
        },
        {
          title: 'Open the right page',
          text: 'Go straight to schedule, roster or chat.'
        }
      ],
      capabilitiesKicker: 'What is included',
      capabilitiesTitle: 'Schedule, roster, statistics and chat',
      capabilitiesIntro: 'Only the pieces that matter most for daily team work are highlighted.',
      capabilities: [
        { icon: 'schedule', title: 'Schedule', text: 'Practices, games and key dates.' },
        { icon: 'roster', title: 'Roster', text: 'Players, roles and team info.' },
        { icon: 'statistics', title: 'Statistics', text: 'Attendance and performance.' },
        { icon: 'chat', title: 'Chat', text: 'Team messages and quick coordination.' }
      ],
      rolesKicker: 'Roles',
      rolesTitle: 'Made for coaches and players',
      rolesIntro: 'Different roles need different actions, so the interface explains both clearly.',
      roles: [
        { title: 'For coaches', text: 'Create the team, invite players and manage plans.' },
        { title: 'For players', text: 'Join with the code and stay aligned with the team.' }
      ],
      ctaKicker: 'Ready?',
      ctaTitle: 'Choose your role and continue',
      ctaText: 'New visitors should understand the product in seconds, then move directly to login or registration.'
    },
    member: {
      welcome: 'Welcome',
      withTeamDescription: 'See the next events, recent updates and the fastest links to the pages you need.',
      withoutTeamCoachDescription: 'Create a team to invite players and publish your first schedule.',
      withoutTeamPlayerDescription: 'Ask your coach for the team code and join the team.',
      badges: {
        noTeam: 'No team yet',
        upcoming: 'upcoming',
        today: 'Today',
        tomorrow: 'Tomorrow'
      },
      summaryTitle: 'Workspace',
      noTeamHeadline: 'No team connected yet',
      noTeamText: 'Create or join a team to turn this page into your daily home.',
      focusLabel: 'Next',
      summaryLabels: {
        team: 'Team',
        code: 'Team code',
        upcoming: 'Upcoming events',
        players: 'Players',
        role: 'Role'
      },
      summaryNotes: {
        team: 'Current workspace',
        code: 'Use this to connect the team',
        upcoming: 'Visible at a glance',
        players: 'People linked to the team',
        role: 'Your current access level',
        pending: 'Will appear after team setup'
      },
      scheduleKicker: 'Schedule',
      scheduleTitle: 'Upcoming events',
      scheduleIntro: 'Only the next items stay here, so the page remains focused and easy to scan.',
      scheduleEmptyHasTeam: 'No upcoming events yet. Add the next practice or match from the schedule page.',
      scheduleEmptyNoTeam: 'When you connect to a team, upcoming events will appear here.',
      openSchedule: 'Open schedule',
      activityKicker: 'Activity',
      activityTitle: 'Recent updates',
      activityIntro: 'Important team changes stay visible without turning the home page into a feed.',
      activityEmptyHasTeam: 'Recent team activity will appear here as your workspace becomes active.',
      activityEmptyNoTeam: 'Join or create a team first to see updates here.',
      actionsKicker: 'Quick actions',
      actionsTitle: 'Open the page you actually need',
      actionsIntro: 'Useful shortcuts replace generic marketing blocks once the user is signed in.',
      stepsKicker: 'Next steps',
      stepsTitle: 'Recommended next actions',
      stepsIntro: 'A short list of practical next moves helps the user understand what to do now.',
      locationFallback: 'Location will be confirmed in the schedule',
      loading: 'Loading your workspace...',
      loadError: 'Some sections could not be refreshed, but the main navigation is ready to use.',
      roles: {
        admin: 'Admin',
        coach: 'Coach',
        player: 'Player',
        member: 'Member'
      },
      eventTypes: {
        practice: 'Practice',
        game: 'Match',
        meeting: 'Meeting',
        other: 'Event'
      },
      activityTypes: {
        event: 'Schedule',
        team: 'Roster',
        stats: 'Stats',
        other: 'Update'
      },
      activityActions: {
        'created event': 'Created event',
        'upcoming event': 'Upcoming event',
        'joined team': 'Joined team'
      },
      activityTime: {
        justNow: 'Just now',
        hourAgo: '1 hour ago',
        hoursAgo: '{count} hours ago',
        dayAgo: '1 day ago',
        daysAgo: '{count} days ago'
      }
    }
  },
  lv: {
    guest: {
      title: 'Pārvaldi komandu vienkāršāk',
      description: 'Viss, kas vajadzīgs treniņiem, spēlēm un saziņai.',
      actions: {
        login: 'Pierakstīties',
        register: 'Izveidot kontu',
        contact: 'Sazināties ar atbalstu'
      },
      supportTitle: 'Treneri izveido komandas. Spēlētāji pievienojas ar kodu.',
      supportText: 'Vienkārša plūsma jaunam lietotājam.',
      supportAction: 'Atvērt atbalsta lapu',
      guideKicker: 'Piekļuve komandai',
      guideTitle: 'Viens skaidrs princips visai komandai',
      guidePoints: [
        'Treneris izveido komandas vidi',
        'Spēlētāji pievienojas ar komandas kodu',
        'Visa komanda strādā vienā kopīgā vietā'
      ],
      stepsKicker: 'Sākums',
      stepsTitle: 'Sāciet 3 soļos',
      stepsIntro: 'Galvenā lapa tagad skaidro pirmos soļus tādā secībā, kā cilvēki produktu patiešām izmanto.',
      steps: [
        {
          title: 'Izveido kontu',
          text: 'Izvēlies trenera vai spēlētāja lomu.'
        },
        {
          title: 'Izveido vai pievienojies komandai',
          text: 'Treneris izveido vidi, spēlētāji pievienojas ar kodu.'
        },
        {
          title: 'Atver pareizo lapu',
          text: 'Dodieties uz grafiku, sastāvu vai čatu.'
        }
      ],
      capabilitiesKicker: 'Kas ir pieejams',
      capabilitiesTitle: 'Grafiks, sastāvs, statistika un čats',
      capabilitiesIntro: 'Izceltas ir tikai tās lietas, kas patiešām vajadzīgas ikdienas komandas darbam.',
      capabilities: [
        { icon: 'schedule', title: 'Grafiks', text: 'Treniņi, spēles un svarīgi datumi.' },
        { icon: 'roster', title: 'Sastāvs', text: 'Spēlētāji, lomas un komandas dati.' },
        { icon: 'statistics', title: 'Statistika', text: 'Apmeklējums un progress.' },
        { icon: 'chat', title: 'Čats', text: 'Komandas ziņas un ātra saziņa.' }
      ],
      rolesKicker: 'Lomas',
      rolesTitle: 'Noder treneriem un spēlētājiem',
      rolesIntro: 'Dažādām lomām vajadzīgas dažādas darbības, tāpēc interfeiss skaidri izskaidro abus scenārijus.',
      roles: [
        { title: 'Treneriem', text: 'Izveidojiet komandu, uzaiciniet spēlētājus un plānojiet darbu.' },
        { title: 'Spēlētājiem', text: 'Pievienojieties ar kodu un sekojiet komandas ritmam.' }
      ],
      ctaKicker: 'Gatavs?',
      ctaTitle: 'Izvēlies savu lomu un turpini',
      ctaText: 'Jaunam apmeklētājam produkts jāsaprot dažu sekunžu laikā, pēc tam uzreiz jāpāriet uz pieslēgšanos vai reģistrāciju.'
    },
    member: {
      welcome: 'Laipni lūdzam',
      withTeamDescription: 'Tuvākie notikumi, pēdējās izmaiņas un ātrākie ceļi uz vajadzīgajām lapām.',
      withoutTeamCoachDescription: 'Izveidojiet komandu, lai uzaicinātu spēlētājus un publicētu pirmo grafiku.',
      withoutTeamPlayerDescription: 'Palūdziet trenerim komandas kodu un pievienojieties komandai.',
      badges: {
        noTeam: 'Vēl nav komandas',
        upcoming: 'gaidāmie',
        today: 'Šodien',
        tomorrow: 'Rīt'
      },
      summaryTitle: 'Darba vide',
      noTeamHeadline: 'Konts vēl nav piesaistīts komandai',
      noTeamText: 'Izveidojiet vai pievienojieties komandai, lai šī lapa kļūtu par ikdienas sākumpunktu.',
      focusLabel: 'Tālāk',
      summaryLabels: {
        team: 'Komanda',
        code: 'Komandas kods',
        upcoming: 'Gaidāmie notikumi',
        players: 'Spēlētāji',
        role: 'Loma'
      },
      summaryNotes: {
        team: 'Pašreizējā darba vide',
        code: 'Izmanto komandas savienošanai',
        upcoming: 'Redzams uzreiz',
        players: 'Cilvēki, kas saistīti ar komandu',
        role: 'Jūsu piekļuves līmenis',
        pending: 'Parādīsies pēc komandas izveides'
      },
      scheduleKicker: 'Grafiks',
      scheduleTitle: 'Tuvākie notikumi',
      scheduleIntro: 'Šeit paliek tikai nākamie ieraksti, lai lapu būtu viegli ātri pārskatīt.',
      scheduleEmptyHasTeam: 'Vēl nav tuvāko notikumu. Pievienojiet nākamo treniņu vai spēli grafika lapā.',
      scheduleEmptyNoTeam: 'Kad būs pievienota komanda, tuvākie notikumi parādīsies šeit.',
      openSchedule: 'Atvērt grafiku',
      activityKicker: 'Aktivitātes',
      activityTitle: 'Pēdējie atjauninājumi',
      activityIntro: 'Svarīgākās komandas izmaiņas ir redzamas, bet sākumlapa nekļūst par trokšņainu plūsmu.',
      activityEmptyHasTeam: 'Jaunākās komandas aktivitātes parādīsies šeit, tiklīdz darba vide kļūs aktīvāka.',
      activityEmptyNoTeam: 'Vispirms pievienojieties vai izveidojiet komandu, lai šeit redzētu atjauninājumus.',
      actionsKicker: 'Ātrās darbības',
      actionsTitle: 'Atveriet tieši to lapu, kas vajadzīga',
      actionsIntro: 'Pēc pieslēgšanās vispārīgi mārketinga bloki tiek aizstāti ar lietderīgiem saīsņu ceļiem.',
      stepsKicker: 'Nākamie soļi',
      stepsTitle: 'Ieteicamās darbības',
      stepsIntro: 'Īss praktisko nākamo soļu saraksts palīdz saprast, ko vislietderīgāk darīt tagad.',
      locationFallback: 'Vieta tiks precizēta grafikā',
      loading: 'Ielādējam jūsu darba vidi...',
      loadError: 'Dažas sadaļas neizdevās atjaunot, bet galvenā navigācija jau ir gatava lietošanai.',
      roles: {
        admin: 'Administrators',
        coach: 'Treneris',
        player: 'Spēlētājs',
        member: 'Lietotājs'
      },
      eventTypes: {
        practice: 'Treniņš',
        game: 'Spēle',
        meeting: 'Sapulce',
        other: 'Notikums'
      },
      activityTypes: {
        event: 'Grafiks',
        team: 'Sastāvs',
        stats: 'Statistika',
        other: 'Jaunums'
      },
      activityActions: {
        'created event': 'Izveidots notikums',
        'upcoming event': 'Gaidāms notikums',
        'joined team': 'Pievienojās komandai'
      },
      activityTime: {
        justNow: 'Tikko',
        hourAgo: 'Pirms 1 stundas',
        hoursAgo: 'Pirms {count} stundām',
        dayAgo: 'Pirms 1 dienas',
        daysAgo: 'Pirms {count} dienām'
      }
    }
  }
}

const HOME_ACTIONS = {
  en: {
    withTeam: [
      { label: 'Team', description: 'Open the overview, roster and team summary in one place.', key: 'overview', tone: 'primary' },
      { label: 'Schedule', description: 'Open the next practices, games and team dates.', key: 'schedule', tone: 'secondary' },
      { label: 'Roster', description: 'Open the players page and review the roster.', key: 'players', tone: 'ghost' },
      { label: 'Messages', description: 'Jump into team communication when you need quick updates.', key: 'chat', tone: 'ghost' },
      { label: 'Profile', description: 'Review your account and personal details.', key: 'profile', tone: 'ghost' }
    ],
    coachNoTeam: [
      { label: 'Team', description: 'Create the workspace so you can invite players and start planning.', key: 'createTeam', tone: 'primary' },
      { label: 'Profile', description: 'Review your account details before building the team.', key: 'profile', tone: 'secondary' },
      { label: 'Support', description: 'If you need help with roles or setup, support is one click away.', key: 'support', tone: 'ghost' }
    ],
    playerNoTeam: [
      { label: 'Profile', description: 'Review your account and make sure everything is ready for joining a team.', key: 'profile', tone: 'primary' },
      { label: 'Support', description: 'If joining a team is unclear, help is available right away.', key: 'support', tone: 'secondary' }
    ],
    focus: {
      coachNoTeam: {
        title: 'Create the team and unlock the workspace',
        text: 'Once the team exists, roster, schedule and the team code become available immediately.'
      },
      playerNoTeam: {
        title: 'Join the team with the team code',
        text: 'That is the main step that turns this account into part of the real team workspace.'
      },
      emptySchedule: {
        title: 'Plan the next event',
        text: 'As soon as the next practice or game is added, this home page becomes even more useful.'
      }
    }
  },
  lv: {
    withTeam: [
      { label: 'Komanda', description: 'Pārskats, sastāvs un komandas kopsavilkums vienā vietā.', key: 'overview', tone: 'primary' },
      { label: 'Grafiks', description: 'Atveriet tuvākos treniņus, spēles un komandas datumus.', key: 'schedule', tone: 'secondary' },
      { label: 'Sastāvs', description: 'Atveriet spēlētāju lapu un pārskatiet komandas sastāvu.', key: 'players', tone: 'ghost' },
      { label: 'Ziņojumi', description: 'Pārejiet uz komandas sarunām, kad vajadzīga ātra saziņa.', key: 'chat', tone: 'ghost' },
      { label: 'Profils', description: 'Pārskatiet savu kontu un personīgo informāciju.', key: 'profile', tone: 'ghost' }
    ],
    coachNoTeam: [
      { label: 'Komanda', description: 'Izveidojiet darba vidi, lai varētu uzaicināt spēlētājus un sākt plānošanu.', key: 'createTeam', tone: 'primary' },
      { label: 'Profils', description: 'Pārbaudiet sava konta datus, pirms sākat komandas izveidi.', key: 'profile', tone: 'secondary' },
      { label: 'Atbalsts', description: 'Ja vajadzīgs skaidrojums par plūsmu vai lomām, palīdzība ir vienu klikšķi prom.', key: 'support', tone: 'ghost' }
    ],
    playerNoTeam: [
      { label: 'Profils', description: 'Pārskatiet kontu un pārliecinieties, ka viss ir gatavs pievienošanai komandai.', key: 'profile', tone: 'primary' },
      { label: 'Atbalsts', description: 'Ja nav skaidrs, kā pievienoties komandai, palīdzība ir pieejama uzreiz.', key: 'support', tone: 'secondary' }
    ],
    focus: {
      coachNoTeam: {
        title: 'Izveidojiet komandu un atveriet darba vidi',
        text: 'Pēc komandas izveides jūs uzreiz iegūsiet sastāvu, grafiku un komandas kodu spēlētājiem.'
      },
      playerNoTeam: {
        title: 'Pievienojieties komandai ar komandas kodu',
        text: 'Tas ir galvenais solis, lai jūsu konts kļūtu par daļu no īstās darba vides.'
      },
      emptySchedule: {
        title: 'Saplānojiet nākamo notikumu',
        text: 'Kad grafikā būs nākamais treniņš vai spēle, šī sākumlapa kļūs uzreiz vēl noderīgāka.'
      }
    }
  }
}

const defaultSummary = () => ({
  teamCount: 0,
  upcomingEvents: 0,
  playerCount: 0
})

const { locale, t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const showLoginModal = ref(false)
const team = ref(null)
const summary = ref(defaultSummary())
const upcomingEvents = ref([])
const recentActivity = ref([])
const loading = ref(false)
const loadError = ref('')
const isDarkMode = ref(false)
let themeObserver = null

const readDarkMode = () => {
  if (typeof document === 'undefined') return false

  return document.documentElement.classList.contains('dark-mode') ||
    document.body.classList.contains('dark-mode') ||
    localStorage.getItem('darkMode') === 'enabled'
}

const syncDarkMode = () => {
  isDarkMode.value = readDarkMode()
}

const localeKey = computed(() => (locale.value === 'en' ? 'en' : 'lv'))
const homeCopy = computed(() => HOME_CONTENT[localeKey.value])
const isLoggedIn = computed(() => authStore.isAuthenticated)
const role = computed(() => normalizeRole(authStore.user?.role))
const isCoach = computed(() => role.value === 'coach')
const hasTeam = computed(() => Boolean(activeTeamId.value))
const activeTeamId = computed(() => Number(team.value?.id || authStore.user?.team_id || 0) || null)
const displayName = computed(() => {
  const fullName = [authStore.user?.name, authStore.user?.surname].filter(Boolean).join(' ').trim()
  return fullName || authStore.user?.email || homeCopy.value.member.roles.member
})
const firstName = computed(() => authStore.user?.name || displayName.value.split(' ')[0] || homeCopy.value.member.roles.member)
const teamName = computed(() => team.value?.name || homeCopy.value.member.badges.noTeam)
const teamOverviewLink = computed(() => (activeTeamId.value ? `/team/${activeTeamId.value}` : '/profile'))
const teamPlayersLink = computed(() => (activeTeamId.value ? `/team/${activeTeamId.value}/players` : '/profile'))
const teamScheduleLink = computed(() => (activeTeamId.value ? `/team-schedule/${activeTeamId.value}` : '/profile'))

const heroTitle = computed(() => {
  if (!isLoggedIn.value) return homeCopy.value.guest.title
  return `${homeCopy.value.member.welcome}, ${firstName.value}`
})

const heroDescription = computed(() => {
  if (!isLoggedIn.value) return homeCopy.value.guest.description
  if (hasTeam.value) return homeCopy.value.member.withTeamDescription
  return isCoach.value
    ? homeCopy.value.member.withoutTeamCoachDescription
    : homeCopy.value.member.withoutTeamPlayerDescription
})

const roleLabel = computed(() => {
  if (role.value === 'admin') return homeCopy.value.member.roles.admin
  if (role.value === 'coach') return homeCopy.value.member.roles.coach
  if (role.value === 'player') return homeCopy.value.member.roles.player
  return homeCopy.value.member.roles.member
})

const memberActionCards = computed(() => {
  const actionCopy = HOME_ACTIONS[localeKey.value]
  const links = {
    overview: teamOverviewLink.value,
    schedule: teamScheduleLink.value,
    players: teamPlayersLink.value,
    chat: '/chat',
    profile: '/profile',
    createTeam: '/create-team',
    support: '/contact'
  }

  if (hasTeam.value) {
    return actionCopy.withTeam.map((action) => ({ ...action, to: links[action.key] }))
  }

  const actionGroup = isCoach.value ? actionCopy.coachNoTeam : actionCopy.playerNoTeam
  return actionGroup.map((action) => ({ ...action, to: links[action.key] }))
})

const heroActionCards = computed(() => memberActionCards.value.slice(0, 3))

const nextFocusCard = computed(() => {
  const focus = HOME_ACTIONS[localeKey.value].focus

  if (!hasTeam.value && isCoach.value) {
    return focus.coachNoTeam
  }

  if (!hasTeam.value) {
    return focus.playerNoTeam
  }

  if (upcomingEvents.value.length) {
    const event = upcomingEvents.value[0]
    return {
      title: event.title,
      text: `${formatEventDate(event.date)} • ${formatEventTime(event.time)}`
    }
  }

  return focus.emptySchedule
})

const normalizeEventType = (type) => {
  const normalized = typeof type === 'string' ? type.trim().toLowerCase() : ''
  return normalized || 'other'
}

const inferEventTypeFromTitle = (title) => {
  const normalizedTitle = typeof title === 'string' ? title.trim().toLowerCase() : ''

  if (/\b(game|match|vs\.?|versus|friendly|playoff|final|semi-final|semifinal|quarterfinal|spēle|mačs|pret|draudzības|izslēgšanas|fināls|pusfināls|ceturtdaļfināls)\b/u.test(normalizedTitle)) {
    return 'game'
  }

  if (/\b(meeting|briefing|review|analysis|sapulce|tikšanās|apspriede|analīze)\b/u.test(normalizedTitle)) {
    return 'meeting'
  }

  return null
}

const displayEventType = (event) => {
  const rawType = normalizeEventType(event?.type)
  const inferredType = inferEventTypeFromTitle(event?.title)

  if (inferredType && (rawType === 'practice' || rawType === 'other')) {
    return inferredType
  }

  return rawType
}

const eventTypeLabel = (type) => {
  const eventType = normalizeEventType(type)
  return homeCopy.value.member.eventTypes[eventType] || homeCopy.value.member.eventTypes.other
}

const activityTypeLabel = (type) => {
  const activityType = typeof type === 'string' ? type.toLowerCase() : 'other'
  return homeCopy.value.member.activityTypes[activityType] || homeCopy.value.member.activityTypes.other
}

const formatActivityAction = (activity) => {
  const rawAction = String(activity?.action || '').trim()
  if (!rawAction) return ''

  const [rawType, ...descriptionParts] = rawAction.split(':')
  if (!descriptionParts.length) return rawAction

  const actionKey = rawType.trim().toLowerCase()
  const actionLabel = homeCopy.value.member.activityActions[actionKey] || rawType.trim()
  const description = descriptionParts.join(':').trim()

  return description ? `${actionLabel}: ${description}` : actionLabel
}

const formatActivityTime = (value) => {
  const rawTime = String(value || '').trim()
  if (!rawTime) return ''

  const timeCopy = homeCopy.value.member.activityTime
  const normalizedTime = rawTime.toLowerCase()

  if (normalizedTime === 'just now') return timeCopy.justNow

  const hoursMatch = normalizedTime.match(/^(\d+)\s+hours?\s+ago$/)
  if (hoursMatch) {
    const count = Number(hoursMatch[1]) || 0
    return count === 1
      ? timeCopy.hourAgo
      : timeCopy.hoursAgo.replace('{count}', String(count))
  }

  const daysMatch = normalizedTime.match(/^(\d+)\s+days?\s+ago$/)
  if (daysMatch) {
    const count = Number(daysMatch[1]) || 0
    return count === 1
      ? timeCopy.dayAgo
      : timeCopy.daysAgo.replace('{count}', String(count))
  }

  return rawTime
}

const formatEventTime = (value) => {
  if (!value) return '—'
  const [hours = '00', minutes = '00'] = String(value).split(':')
  return `${hours}:${minutes}`
}

const formatEventDate = (value) => {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.getTime() === today.getTime()) return homeCopy.value.member.badges.today
  if (date.getTime() === tomorrow.getTime()) return homeCopy.value.member.badges.tomorrow

  return new Intl.DateTimeFormat(localeKey.value === 'lv' ? 'lv-LV' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const getInitials = (value = '') => {
  const safeValue = String(value).trim()
  if (!safeValue) return 'TF'

  return safeValue
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const resetMemberData = () => {
  team.value = null
  summary.value = defaultSummary()
  upcomingEvents.value = []
  recentActivity.value = []
  loadError.value = ''
}

const loadMemberHome = async () => {
  if (!isLoggedIn.value) {
    resetMemberData()
    return
  }

  loading.value = true
  loadError.value = ''

  const [teamResult, statsResult, eventsResult, activityResult] = await Promise.allSettled([
    axios.get('/api/auth/my-team'),
    axios.get('/api/auth/user/stats'),
    axios.get('/api/auth/user/upcoming-events'),
    axios.get('/api/auth/user/recent-activity')
  ])

  if (teamResult.status === 'fulfilled') {
    team.value = teamResult.value.data?.team || null
  } else if (teamResult.reason?.response?.status === 404) {
    team.value = null
  } else {
    console.error('Failed to load current team:', teamResult.reason)
  }

  if (statsResult.status === 'fulfilled') {
    const data = statsResult.value.data || {}
    summary.value = {
      teamCount: Number(data.teamCount) || 0,
      upcomingEvents: Number(data.upcomingEvents) || 0,
      playerCount: Number(data.playerCount) || 0
    }
  } else {
    summary.value = defaultSummary()
    console.error('Failed to load user stats:', statsResult.reason)
  }

  if (eventsResult.status === 'fulfilled') {
    upcomingEvents.value = Array.isArray(eventsResult.value.data) ? eventsResult.value.data : []
  } else {
    upcomingEvents.value = []
    console.error('Failed to load upcoming events:', eventsResult.reason)
  }

  if (activityResult.status === 'fulfilled') {
    recentActivity.value = Array.isArray(activityResult.value.data) ? activityResult.value.data : []
  } else {
    recentActivity.value = []
    console.error('Failed to load recent activity:', activityResult.reason)
  }

  const hasNonCriticalFailure = [teamResult, statsResult, eventsResult, activityResult].some((result) => {
    if (result.status !== 'rejected') return false
    return result.reason?.response?.status !== 404
  })

  if (hasNonCriticalFailure) {
    loadError.value = homeCopy.value.member.loadError
  }

  loading.value = false
}

const handleLogin = async (email, password) => {
  try {
    await authStore.login(email, password)
    showLoginModal.value = false
    await loadMemberHome()
  } catch (error) {
    console.error('Login error:', error)
    alert(`${t('messages.loginError')}: ${error.message || t('messages.somethingWentWrong')}`)
  }
}

watch(isLoggedIn, async (loggedIn) => {
  if (loggedIn) {
    await loadMemberHome()
  } else {
    resetMemberData()
  }
})

watch(localeKey, () => {
  if (loadError.value) {
    loadError.value = homeCopy.value.member.loadError
  }
})

onMounted(async () => {
  syncDarkMode()

  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(syncDarkMode)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  }

  if (!isLoggedIn.value) {
    resetMemberData()
    return
  }

  await authStore.fetchUser()
  await loadMemberHome()
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
})
</script>

<style scoped>
.home-page {
  --home-bg: linear-gradient(180deg, #f4efe4 0%, #f9f8f4 42%, #ffffff 100%);
  --home-surface: rgba(255, 255, 255, 0.82);
  --home-panel: #ffffff;
  --home-border: rgba(15, 23, 42, 0.08);
  --home-text: #0f172a;
  --home-muted: #5f6c7c;
  --home-accent: #0b72e7;
  --home-accent-strong: #084da8;
  --home-accent-soft: rgba(11, 114, 231, 0.1);
  --home-warm: #eb8b2d;
  --home-warm-soft: rgba(235, 139, 45, 0.12);
  --home-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  --home-ambient-blue: rgba(11, 114, 231, 0.16);
  --home-ambient-blue-soft: rgba(11, 114, 231, 0.04);
  --home-ambient-warm: rgba(235, 139, 45, 0.14);
  --home-ambient-warm-soft: rgba(235, 139, 45, 0.03);
  --home-ambient-mint: rgba(16, 185, 129, 0.14);
  --home-ambient-mint-soft: rgba(16, 185, 129, 0.03);
  --home-hero-guest-text: #0f172a;
  --home-hero-guest-bg:
    radial-gradient(circle at 96% 0%, rgba(235, 139, 45, 0.18), transparent 32%),
    radial-gradient(circle at 2% 100%, rgba(11, 114, 231, 0.14), transparent 38%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(232, 243, 255, 0.92) 52%, rgba(244, 249, 255, 0.95) 100%);
  --home-hero-guest-border: rgba(11, 114, 231, 0.12);
  --home-hero-guest-shadow: 0 18px 44px rgba(15, 23, 42, 0.1);
  --home-hero-guest-description: #536274;
  --home-hero-guest-orb-a: rgba(11, 114, 231, 0.08);
  --home-hero-guest-orb-b: rgba(16, 185, 129, 0.08);
  --home-hero-guest-secondary-bg: rgba(255, 255, 255, 0.72);
  --home-hero-guest-secondary-border: rgba(11, 114, 231, 0.16);
  --home-hero-guest-secondary-text: #1f3b57;
  min-height: 100vh;
  padding: 24px 20px 56px;
  background:
    radial-gradient(circle at 18% 16%, var(--home-ambient-blue) 0%, transparent 22%),
    radial-gradient(circle at 82% 18%, var(--home-ambient-warm) 0%, transparent 20%),
    radial-gradient(circle at 50% 78%, var(--home-ambient-mint) 0%, transparent 24%),
    var(--home-bg);
  background-size: 145% 145%, 140% 140%, 165% 165%, 120% 120%;
  background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%;
  color: var(--home-text);
  overflow: hidden;
  position: relative;
  isolation: isolate;
  animation: home-background-shift 16s ease-in-out infinite alternate;
}

.home-page::before,
.home-page::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  z-index: 0;
  filter: blur(14px);
  will-change: transform;
}

.home-page::before {
  width: min(48vw, 640px);
  height: min(48vw, 640px);
  top: -160px;
  left: -180px;
  background: radial-gradient(circle, var(--home-ambient-blue) 0%, var(--home-ambient-blue-soft) 48%, transparent 74%);
  box-shadow: 0 0 140px var(--home-ambient-blue-soft);
  animation: home-ambient-drift 16s ease-in-out infinite alternate;
}

.home-page::after {
  width: min(42vw, 560px);
  height: min(42vw, 560px);
  top: 140px;
  right: -160px;
  background: radial-gradient(circle, var(--home-ambient-warm) 0%, var(--home-ambient-warm-soft) 46%, transparent 74%);
  box-shadow: 0 0 140px var(--home-ambient-warm-soft);
  animation: home-ambient-drift 20s ease-in-out infinite alternate-reverse;
}

.home-shell {
  max-width: 1280px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.home-wordmark-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 4px auto 18px;
}

.home-wordmark-line {
  width: min(16vw, 140px);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(15, 23, 42, 0.18), transparent);
}

.home-wordmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.home-wordmark span {
  display: inline-block;
  font-size: clamp(1.4rem, 3.6vw, 2.5rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  line-height: 1;
  background: linear-gradient(120deg, #0b72e7 0%, #eb8b2d 48%, #0f9a6c 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 22px rgba(11, 114, 231, 0.08);
  animation: wordmark-shimmer 9s ease-in-out infinite;
}

.home-shell::before,
.home-shell::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
  z-index: -1;
  filter: blur(18px);
  will-change: transform, opacity;
}

.home-shell::before {
  width: min(62vw, 780px);
  height: 300px;
  left: 4%;
  top: 18px;
  background: radial-gradient(ellipse at center, var(--home-ambient-mint) 0%, transparent 72%);
  opacity: 0.85;
  animation: home-ribbon-sweep 18s ease-in-out infinite alternate;
}

.home-shell::after {
  width: min(56vw, 700px);
  height: 340px;
  right: -3%;
  top: 280px;
  background: radial-gradient(ellipse at center, var(--home-ambient-blue) 0%, transparent 70%);
  opacity: 0.75;
  animation: home-ribbon-sweep 23s ease-in-out infinite alternate-reverse;
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 28px;
  padding: 36px;
  border-radius: 34px;
  border: 1px solid var(--home-border);
  box-shadow: var(--home-shadow);
  overflow: hidden;
  position: relative;
}

.home-hero::before,
.home-hero::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  will-change: transform;
}

.home-hero.guest {
  grid-template-columns: minmax(0, 1fr);
  border-color: var(--home-hero-guest-border);
  background: var(--home-hero-guest-bg);
  box-shadow: var(--home-hero-guest-shadow);
  color: var(--home-hero-guest-text);
}

.home-hero.guest::before {
  width: 280px;
  height: 280px;
  right: -110px;
  top: -90px;
  background: var(--home-hero-guest-orb-a);
  animation: hero-orb-float 16s ease-in-out infinite;
}

.home-hero.guest::after {
  width: 220px;
  height: 220px;
  left: -70px;
  bottom: -90px;
  background: var(--home-hero-guest-orb-b);
  animation: hero-orb-float 20s ease-in-out infinite reverse;
}

.home-hero.member {
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  background:
    linear-gradient(145deg, rgba(11, 114, 231, 0.08), transparent 48%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.86));
}

.home-hero.member::before {
  width: 240px;
  height: 240px;
  right: -70px;
  top: -110px;
  background: rgba(11, 114, 231, 0.08);
  animation: hero-orb-float 15s ease-in-out infinite;
}

.home-hero.member::after {
  width: 180px;
  height: 180px;
  left: -50px;
  bottom: -80px;
  background: rgba(235, 139, 45, 0.08);
  animation: hero-orb-float 19s ease-in-out infinite reverse;
}

.hero-copy,
.hero-side {
  position: relative;
  z-index: 1;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.home-hero.guest .hero-copy {
  align-items: center;
  text-align: center;
  max-width: 760px;
  margin: 0 auto;
}

.section-kicker,
.preview-label,
.step-index {
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.78rem;
  font-weight: 700;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(2.5rem, 5vw, 4.4rem);
  line-height: 1.02;
  max-width: 11ch;
}

.home-hero.guest .hero-copy h1 {
  max-width: 15ch;
  font-size: clamp(2rem, 4.2vw, 3.35rem);
}

.home-page.locale-lv .home-hero.guest .hero-copy {
  max-width: 960px;
}

.home-page.locale-lv .home-hero.guest .hero-copy h1 {
  max-width: 19ch;
  font-size: clamp(1.72rem, 3.45vw, 2.82rem);
  line-height: 1.05;
}

.home-page.locale-lv .home-hero.guest .hero-description {
  max-width: 46ch;
}

.home-hero.member .hero-copy h1 {
  max-width: 14ch;
  font-size: clamp(1.9rem, 3.6vw, 3rem);
}

.hero-description {
  max-width: 66ch;
  margin: 18px 0 0;
  font-size: 1.08rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.84);
}

.home-hero.member .hero-description {
  color: var(--home-muted);
}

.home-hero.guest .hero-description {
  max-width: 52ch;
  margin-left: auto;
  margin-right: auto;
  color: var(--home-hero-guest-description);
}

.hero-actions,
.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.home-hero.guest .hero-actions {
  justify-content: center;
}

.hero-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 16px;
  border: 1px solid transparent;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
}

.hero-button:hover,
.action-card:hover,
.capability-card:hover,
.event-card:hover,
.activity-card:hover {
  transform: translateY(-2px);
}

.hero-button.primary {
  background: linear-gradient(135deg, var(--home-accent), var(--home-accent-strong));
  color: white;
  box-shadow: 0 14px 28px rgba(11, 114, 231, 0.24);
}

.hero-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  border-color: rgba(255, 255, 255, 0.16);
}

.home-hero.guest .hero-button.secondary {
  background: var(--home-hero-guest-secondary-bg);
  border-color: var(--home-hero-guest-secondary-border);
  color: var(--home-hero-guest-secondary-text);
}

.home-hero.member .hero-button.secondary {
  background: rgba(15, 23, 42, 0.03);
  border-color: var(--home-border);
  color: var(--home-text);
}

.hero-button.ghost {
  background: transparent;
  color: inherit;
  border-color: rgba(255, 255, 255, 0.16);
}

.home-hero.member .hero-button.ghost {
  border-color: var(--home-border);
  color: var(--home-text);
}

.hero-note {
  margin: 14px 0 0;
  color: var(--home-muted);
  font-size: 0.95rem;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.preview-card {
  border-radius: 28px;
  padding: 22px;
  border: 1px solid var(--home-border);
  background: var(--home-surface);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.preview-card.primary {
  flex: 1;
}

.preview-copy strong,
.support-box strong,
.summary-board strong,
.preview-card strong {
  display: block;
  margin-top: 6px;
  font-size: 1.45rem;
  line-height: 1.2;
}

.preview-copy p,
.support-box p,
.preview-card p {
  margin: 10px 0 0;
  line-height: 1.65;
  color: var(--home-muted);
}

.home-hero.guest .preview-copy p,
.home-hero.guest .preview-card p,
.home-hero.guest .inline-link {
  color: rgba(255, 255, 255, 0.84);
}

.member-overview {
  display: grid;
  gap: 12px;
  margin-top: 10px;
}

.member-overview-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.home-hero.member .member-overview-row {
  background: rgba(15, 23, 42, 0.03);
}

.member-overview-row span {
  font-weight: 700;
}

.member-overview-row strong {
  text-align: right;
  color: inherit;
}

.member-focus {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--home-border);
}

.inline-link,
.panel-link {
  color: var(--home-accent);
  font-weight: 700;
  text-decoration: none;
}

.content-section {
  margin-top: 24px;
  padding: 28px;
  border-radius: 30px;
  border: 1px solid var(--home-border);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--home-shadow);
}

.content-section.two-column,
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.section-head {
  max-width: 720px;
  margin-bottom: 22px;
}

.section-head.left {
  margin-bottom: 18px;
}

.section-head.compact {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  max-width: none;
}

.section-head h2 {
  margin: 8px 0 0;
  font-size: clamp(1.7rem, 3vw, 2.5rem);
  line-height: 1.1;
}

.section-head p {
  margin: 10px 0 0;
  color: var(--home-muted);
  line-height: 1.65;
}

.section-kicker {
  color: var(--home-accent);
  margin: 0;
}

.capability-grid,
.support-points,
.action-grid {
  display: grid;
  gap: 18px;
}

.capability-grid,
.action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.quick-actions-panel .action-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.capability-card,
.event-card,
.activity-card,
.action-card,
.support-box,
.empty-card {
  border-radius: 24px;
  border: 1px solid var(--home-border);
  background: var(--home-panel);
  padding: 20px;
}

.capability-card {
  display: flex;
  flex-direction: column;
}

.capability-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.capability-title-group {
  min-width: 0;
}

.capability-visual {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42), 0 12px 22px rgba(15, 23, 42, 0.08);
}

.capability-visual svg {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.capability-visual.schedule {
  color: #0b72e7;
  background: linear-gradient(145deg, rgba(11, 114, 231, 0.18), rgba(11, 114, 231, 0.05));
}

.capability-visual.roster {
  color: #7c3aed;
  background: linear-gradient(145deg, rgba(124, 58, 237, 0.18), rgba(124, 58, 237, 0.05));
}

.capability-visual.statistics {
  color: #d97706;
  background: linear-gradient(145deg, rgba(217, 119, 6, 0.18), rgba(217, 119, 6, 0.05));
}

.capability-visual.chat {
  color: #0f9a6c;
  background: linear-gradient(145deg, rgba(15, 154, 108, 0.18), rgba(15, 154, 108, 0.05));
}

.capability-card h3,
.event-card h3,
.action-card strong,
.activity-copy strong {
  margin: 10px 0 0;
  font-size: 1.18rem;
}

.action-card strong {
  display: block;
  margin-top: 0;
}

.capability-card h3 {
  margin-top: 0;
}

.capability-card p,
.action-card p,
.event-copy p,
.activity-copy p,
.empty-card {
  margin: 10px 0 0;
  color: var(--home-muted);
  line-height: 1.6;
}

.activity-list,
.event-stack {
  display: grid;
  gap: 14px;
}

.support-point {
  border-radius: 20px;
  border: 1px solid var(--home-border);
  background: rgba(15, 23, 42, 0.02);
  padding: 16px 18px;
  font-weight: 600;
  color: var(--home-text);
}

.support-box {
  margin-top: 18px;
  background: linear-gradient(135deg, rgba(235, 139, 45, 0.09), rgba(11, 114, 231, 0.05));
}

.cta-banner {
  margin-top: 24px;
  padding: 28px;
  border-radius: 30px;
  border: 1px solid rgba(11, 114, 231, 0.14);
  background: linear-gradient(135deg, rgba(11, 114, 231, 0.08), rgba(235, 139, 45, 0.08));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.panel {
  border-radius: 28px;
  border: 1px solid var(--home-border);
  background: rgba(255, 255, 255, 0.84);
  padding: 24px;
}

.event-card,
.activity-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}

.event-date-pill,
.activity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  font-weight: 700;
  background: var(--home-accent-soft);
  color: var(--home-accent);
}

.event-side,
.activity-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  color: var(--home-muted);
}

.event-type {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.event-type::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 18%, transparent);
}

.event-type.practice,
.activity-badge.event {
  background: rgba(16, 185, 129, 0.14);
  color: #0f9f6e;
}

.event-type.game {
  background: rgba(220, 38, 38, 0.11);
  border-color: rgba(220, 38, 38, 0.18);
  color: #b42318;
}

.event-type.meeting,
.activity-badge.team {
  background: rgba(235, 139, 45, 0.14);
  color: #b76515;
}

.event-type.other,
.activity-badge.stats {
  background: rgba(107, 114, 128, 0.12);
  color: #4b5563;
}

.activity-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--home-accent), var(--home-accent-strong));
  color: white;
  font-weight: 800;
}

.action-card {
  text-decoration: none;
  color: inherit;
  background: linear-gradient(180deg, rgba(11, 114, 231, 0.03), transparent), var(--home-panel);
}

.empty-card {
  text-align: center;
  background: rgba(15, 23, 42, 0.02);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes home-background-shift {
  0% {
    background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%;
  }

  50% {
    background-position: 18% 12%, 86% 20%, 42% 82%, 55% 45%;
  }

  100% {
    background-position: 10% 32%, 72% 28%, 56% 68%, 100% 100%;
  }
}

@keyframes home-ambient-drift {
  0% {
    transform: translate3d(0, 0, 0) scale(0.92) rotate(0deg);
    opacity: 0.68;
  }

  50% {
    transform: translate3d(74px, 38px, 0) scale(1.18) rotate(10deg);
    opacity: 1;
  }

  100% {
    transform: translate3d(-58px, 96px, 0) scale(0.98) rotate(-8deg);
    opacity: 0.74;
  }
}

@keyframes home-ribbon-sweep {
  0% {
    transform: translate3d(0, 0, 0) scaleX(0.96) rotate(-6deg);
    opacity: 0.55;
  }

  50% {
    transform: translate3d(36px, 22px, 0) scaleX(1.06) rotate(0deg);
    opacity: 0.9;
  }

  100% {
    transform: translate3d(-28px, 54px, 0) scaleX(1) rotate(7deg);
    opacity: 0.62;
  }
}

@keyframes hero-orb-float {
  0% {
    transform: translate3d(0, 0, 0) scale(0.98);
  }

  50% {
    transform: translate3d(24px, -18px, 0) scale(1.08);
  }

  100% {
    transform: translate3d(-22px, 28px, 0) scale(0.94);
  }
}

@keyframes wordmark-shimmer {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.home-hero,
.content-section {
  animation: rise-in 0.45s ease both;
}

@media (max-width: 1100px) {
  .home-hero,
  .content-section.two-column,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 768px) {
  .home-page {
    padding: 16px 14px 32px;
  }

  .home-wordmark-wrap {
    gap: 10px;
    margin-bottom: 14px;
  }

  .home-wordmark-line {
    width: 52px;
  }

  .home-wordmark {
    padding: 0;
  }

  .home-wordmark span {
    letter-spacing: 0.03em;
  }

  .home-page::before {
    width: 360px;
    height: 360px;
    left: -190px;
  }

  .home-page::after {
    width: 320px;
    height: 320px;
    right: -170px;
    top: 220px;
  }

  .home-shell::before {
    width: 360px;
    height: 220px;
    left: -40px;
    top: 26px;
  }

  .home-shell::after {
    width: 340px;
    height: 240px;
    right: -80px;
    top: 320px;
  }

  .home-hero,
  .content-section,
  .panel,
  .cta-banner {
    padding: 22px;
    border-radius: 24px;
    grid-template-columns: 1fr;
  }

  .home-hero.member {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .hero-copy {
    min-width: 0;
  }

  .hero-copy h1 {
    max-width: none;
    font-size: clamp(1.5rem, 3vw, 2.5rem);
  }

  .hero-side {
    min-width: 0;
  }

  .hero-actions,
  .cta-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-button {
    width: 100%;
  }

  .capability-grid,
  .action-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions-panel .action-grid {
    grid-template-columns: 1fr;
  }

  .section-head.compact {
    flex-direction: column;
  }

  .cta-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .event-card,
  .activity-card {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .event-side,
  .activity-side {
    align-items: flex-start;
  }

  .member-overview-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .member-overview-row strong {
    text-align: left;
  }

  .preview-card {
    padding: 18px;
  }

  .member-focus {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid var(--home-border);
  }
}

@media (max-width: 480px) {
  .home-page {
    padding: 12px 12px 24px;
  }

  .home-shell {
    max-width: 100%;
  }

  .home-hero,
  .content-section,
  .panel,
  .cta-banner {
    padding: 18px;
    border-radius: 20px;
  }

  .home-wordmark span {
    font-size: clamp(1.2rem, 2.5vw, 1.8rem);
  }

  .hero-copy h1 {
    font-size: clamp(1.3rem, 2.8vw, 2rem);
    line-height: 1.1;
  }

  .home-hero.guest .hero-copy h1 {
    font-size: clamp(1.25rem, 2.8vw, 1.9rem);
  }

  .hero-description {
    font-size: 0.95rem;
    line-height: 1.6;
    margin-top: 14px;
  }

  .hero-button {
    min-height: 42px;
    padding: 0 14px;
    font-size: 0.95rem;
  }

  .preview-card {
    padding: 16px;
    border-radius: 16px;
  }

  .preview-copy strong,
  .preview-card strong {
    font-size: 1.25rem;
    margin-top: 5px;
  }

  .member-overview {
    gap: 8px;
    margin-top: 8px;
  }

  .member-overview-row {
    padding: 10px 12px;
    border-radius: 14px;
    gap: 12px;
    font-size: 0.9rem;
  }

  .member-focus {
    margin-top: 16px;
    padding-top: 16px;
  }

  .member-focus .preview-label {
    font-size: 0.72rem;
    margin-bottom: 4px;
  }

  .section-head {
    margin-bottom: 14px;
  }

  .section-head h2 {
    font-size: clamp(1.3rem, 3.2vw, 1.8rem);
  }

  .capability-grid {
    gap: 12px;
  }

  .capability-card {
    padding: 16px;
    border-radius: 14px;
  }

  .dashboard-grid,
  .action-grid {
    gap: 10px;
  }

  .event-card,
  .activity-card {
    padding: 14px;
    border-radius: 14px;
    gap: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-page,
  .home-page::before,
  .home-page::after,
  .home-shell::before,
  .home-shell::after,
  .home-wordmark span,
  .home-hero::before,
  .home-hero::after {
    animation: none !important;
  }
}

</style>

<style>
html.dark-mode .home-page,
body.dark-mode .home-page {
  --home-bg: linear-gradient(180deg, #0f172a 0%, #111827 45%, #182235 100%);
  --home-surface: rgba(15, 23, 42, 0.84);
  --home-panel: rgba(15, 23, 42, 0.86);
  --home-border: rgba(148, 163, 184, 0.18);
  --home-text: #e5edf8;
  --home-muted: #9fb0c8;
  --home-accent: #60a5fa;
  --home-accent-strong: #3b82f6;
  --home-accent-soft: rgba(96, 165, 250, 0.14);
  --home-warm: #f6ad55;
  --home-warm-soft: rgba(246, 173, 85, 0.14);
  --home-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
  --home-ambient-blue: rgba(96, 165, 250, 0.18);
  --home-ambient-blue-soft: rgba(96, 165, 250, 0.04);
  --home-ambient-warm: rgba(246, 173, 85, 0.14);
  --home-ambient-warm-soft: rgba(246, 173, 85, 0.03);
  --home-ambient-mint: rgba(52, 211, 153, 0.16);
  --home-ambient-mint-soft: rgba(52, 211, 153, 0.03);
  --home-hero-guest-text: #ffffff;
  --home-hero-guest-bg:
    radial-gradient(circle at 92% -6%, rgba(96, 165, 250, 0.22), transparent 34%),
    radial-gradient(circle at 8% 104%, rgba(52, 211, 153, 0.16), transparent 38%),
    linear-gradient(135deg, #09111f 0%, #0d1d36 54%, #13243f 100%);
  --home-hero-guest-border: rgba(125, 169, 224, 0.24);
  --home-hero-guest-shadow: 0 30px 80px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --home-hero-guest-description: rgba(226, 232, 240, 0.84);
  --home-hero-guest-orb-a: rgba(96, 165, 250, 0.1);
  --home-hero-guest-orb-b: rgba(247, 186, 104, 0.08);
  --home-hero-guest-secondary-bg: rgba(148, 163, 184, 0.13);
  --home-hero-guest-secondary-border: rgba(203, 213, 225, 0.2);
  --home-hero-guest-secondary-text: #f8fbff;
}

html.dark-mode .home-page .content-section,
html.dark-mode .home-page .panel,
html.dark-mode .home-page .capability-card,
html.dark-mode .home-page .event-card,
html.dark-mode .home-page .activity-card,
html.dark-mode .home-page .action-card,
html.dark-mode .home-page .support-box,
html.dark-mode .home-page .support-point,
html.dark-mode .home-page .empty-card,
body.dark-mode .home-page .content-section,
body.dark-mode .home-page .panel,
body.dark-mode .home-page .capability-card,
body.dark-mode .home-page .event-card,
body.dark-mode .home-page .activity-card,
body.dark-mode .home-page .action-card,
body.dark-mode .home-page .support-box,
body.dark-mode .home-page .support-point,
body.dark-mode .home-page .empty-card {
  background-color: var(--home-panel);
}

html.dark-mode .home-page .home-wordmark-line,
body.dark-mode .home-page .home-wordmark-line {
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.34), transparent);
}

html.dark-mode .home-page .home-wordmark,
body.dark-mode .home-page .home-wordmark {
  background: transparent;
  box-shadow: none;
}

html.dark-mode .home-page .home-wordmark span,
body.dark-mode .home-page .home-wordmark span {
  background: linear-gradient(120deg, #7ab7ff 0%, #f6c36d 46%, #5de0af 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
}

html.dark-mode .home-page .capability-visual,
body.dark-mode .home-page .capability-visual {
  border-color: rgba(148, 163, 184, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 22px rgba(0, 0, 0, 0.22);
}

html.dark-mode .home-page .capability-visual.schedule,
body.dark-mode .home-page .capability-visual.schedule {
  color: #7ab7ff;
  background: linear-gradient(145deg, rgba(96, 165, 250, 0.2), rgba(96, 165, 250, 0.06));
}

html.dark-mode .home-page .capability-visual.roster,
body.dark-mode .home-page .capability-visual.roster {
  color: #b794ff;
  background: linear-gradient(145deg, rgba(167, 139, 250, 0.2), rgba(167, 139, 250, 0.05));
}

html.dark-mode .home-page .capability-visual.statistics,
body.dark-mode .home-page .capability-visual.statistics {
  color: #f6c36d;
  background: linear-gradient(145deg, rgba(246, 173, 85, 0.2), rgba(246, 173, 85, 0.05));
}

html.dark-mode .home-page .capability-visual.chat,
body.dark-mode .home-page .capability-visual.chat {
  color: #5de0af;
  background: linear-gradient(145deg, rgba(52, 211, 153, 0.2), rgba(52, 211, 153, 0.05));
}

html.dark-mode .home-page .home-hero.member,
body.dark-mode .home-page .home-hero.member {
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.14), transparent 34%),
    radial-gradient(circle at left bottom, rgba(246, 173, 85, 0.12), transparent 38%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.9));
}

html.dark-mode .home-page .home-hero.member::before,
body.dark-mode .home-page .home-hero.member::before {
  background: rgba(96, 165, 250, 0.12);
}

html.dark-mode .home-page .home-hero.member::after,
body.dark-mode .home-page .home-hero.member::after {
  background: rgba(246, 173, 85, 0.08);
}

html.dark-mode .home-page .home-hero.guest,
body.dark-mode .home-page .home-hero.guest {
  border-color: var(--home-hero-guest-border);
  background: var(--home-hero-guest-bg);
  box-shadow: var(--home-hero-guest-shadow);
}

html.dark-mode .home-page .hero-button.secondary,
html.dark-mode .home-page .hero-button.ghost,
body.dark-mode .home-page .hero-button.secondary,
body.dark-mode .home-page .hero-button.ghost {
  background: rgba(255, 255, 255, 0.03);
  border-color: var(--home-border);
}

html.dark-mode .home-page .home-hero.guest .hero-button.secondary,
body.dark-mode .home-page .home-hero.guest .hero-button.secondary {
  background: var(--home-hero-guest-secondary-bg);
  border-color: var(--home-hero-guest-secondary-border);
  color: var(--home-hero-guest-secondary-text);
}

html.dark-mode .home-page .member-overview-row,
body.dark-mode .home-page .member-overview-row {
  background: rgba(255, 255, 255, 0.03);
}

html.dark-mode .home-page .member-focus,
body.dark-mode .home-page .member-focus {
  border-top-color: var(--home-border);
}

html.dark-mode .home-page .event-type.game,
body.dark-mode .home-page .event-type.game {
  background: rgba(248, 113, 113, 0.14);
  border-color: rgba(248, 113, 113, 0.24);
  color: #fca5a5;
}

html.dark-mode .home-page .cta-banner,
body.dark-mode .home-page .cta-banner {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.12), rgba(246, 173, 85, 0.08));
}

.home-page.dark {
  --home-bg: linear-gradient(180deg, #070d1a 0%, #0b1222 48%, #111827 100%);
  --home-surface: rgba(15, 23, 42, 0.88);
  --home-panel: rgba(15, 23, 42, 0.9);
  --home-border: rgba(148, 163, 184, 0.2);
  --home-text: #eef4ff;
  --home-muted: #a9b8cf;
  --home-accent: #6fb2ff;
  --home-accent-strong: #4b8fff;
  --home-accent-soft: rgba(111, 178, 255, 0.16);
  --home-warm: #f7ba68;
  --home-warm-soft: rgba(247, 186, 104, 0.14);
  --home-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
  --home-ambient-blue: rgba(74, 144, 226, 0.16);
  --home-ambient-blue-soft: rgba(74, 144, 226, 0.035);
  --home-ambient-warm: rgba(247, 186, 104, 0.1);
  --home-ambient-warm-soft: rgba(247, 186, 104, 0.025);
  --home-ambient-mint: rgba(52, 211, 153, 0.12);
  --home-ambient-mint-soft: rgba(52, 211, 153, 0.025);
  --home-hero-guest-text: #ffffff;
  --home-hero-guest-bg:
    radial-gradient(circle at 92% -6%, rgba(111, 178, 255, 0.23), transparent 34%),
    radial-gradient(circle at 8% 104%, rgba(93, 224, 175, 0.15), transparent 38%),
    linear-gradient(135deg, #08111f 0%, #0d1d36 54%, #13243f 100%);
  --home-hero-guest-border: rgba(148, 163, 184, 0.24);
  --home-hero-guest-shadow: 0 30px 80px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --home-hero-guest-description: rgba(226, 232, 240, 0.86);
  --home-hero-guest-orb-a: rgba(111, 178, 255, 0.1);
  --home-hero-guest-orb-b: rgba(247, 186, 104, 0.08);
  --home-hero-guest-secondary-bg: rgba(148, 163, 184, 0.13);
  --home-hero-guest-secondary-border: rgba(203, 213, 225, 0.2);
  --home-hero-guest-secondary-text: #f8fbff;
  background:
    radial-gradient(circle at 16% 12%, rgba(74, 144, 226, 0.18) 0%, transparent 24%),
    radial-gradient(circle at 84% 14%, rgba(247, 186, 104, 0.12) 0%, transparent 22%),
    radial-gradient(circle at 50% 82%, rgba(52, 211, 153, 0.1) 0%, transparent 26%),
    var(--home-bg);
}

.home-page.dark .content-section,
.home-page.dark .panel,
.home-page.dark .capability-card,
.home-page.dark .event-card,
.home-page.dark .activity-card,
.home-page.dark .action-card,
.home-page.dark .support-box,
.home-page.dark .support-point,
.home-page.dark .empty-card {
  background-color: var(--home-panel);
}

.home-page.dark .home-wordmark-line {
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.42), transparent);
}

.home-page.dark .home-wordmark span {
  background: linear-gradient(120deg, #7ab7ff 0%, #f7c978 46%, #5de0af 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: 0 0 30px rgba(111, 178, 255, 0.22);
}

.home-page.dark .home-shell::before {
  background: radial-gradient(ellipse at center, rgba(52, 211, 153, 0.12) 0%, transparent 72%);
  opacity: 0.62;
}

.home-page.dark .home-shell::after {
  background: radial-gradient(ellipse at center, rgba(111, 178, 255, 0.14) 0%, transparent 70%);
  opacity: 0.58;
}

.home-page.dark .home-hero.guest {
  border-color: var(--home-hero-guest-border);
  box-shadow: var(--home-hero-guest-shadow);
  background: var(--home-hero-guest-bg);
}

.home-page.dark .home-hero.guest::before {
  background: var(--home-hero-guest-orb-a);
  box-shadow: 0 0 90px rgba(111, 178, 255, 0.12);
}

.home-page.dark .home-hero.guest::after {
  background: var(--home-hero-guest-orb-b);
  box-shadow: 0 0 80px rgba(111, 178, 255, 0.12);
}

.home-page.dark .home-hero.member {
  background:
    radial-gradient(circle at top right, rgba(111, 178, 255, 0.14), transparent 34%),
    radial-gradient(circle at left bottom, rgba(247, 186, 104, 0.1), transparent 38%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.9));
}

.home-page.dark .hero-button.secondary,
.home-page.dark .hero-button.ghost {
  background: rgba(15, 23, 42, 0.46);
  border-color: rgba(148, 163, 184, 0.24);
  color: #eef4ff;
}

.home-page.dark .home-hero.guest .hero-button.secondary {
  background: var(--home-hero-guest-secondary-bg);
  border-color: var(--home-hero-guest-secondary-border);
  color: var(--home-hero-guest-secondary-text);
}

.home-page.dark .member-overview-row {
  background: rgba(255, 255, 255, 0.03);
}

.home-page.dark .member-focus {
  border-top-color: var(--home-border);
}

.home-page.dark .cta-banner {
  background: linear-gradient(135deg, rgba(111, 178, 255, 0.13), rgba(247, 186, 104, 0.08));
}
</style>
