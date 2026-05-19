<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { leaveCurrentTeam, removeUserAvatar, uploadUserAvatar } from '@/services/teamApi'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const loading = ref(true)
const team = ref(null)
const passwordLoading = ref(false)
const passwordMessage = ref('')
const passwordError = ref('')
const avatarLoading = ref(false)
const avatarMessage = ref('')
const avatarError = ref('')
const avatarInput = ref(null)
const teamActionLoading = ref(false)
const teamActionError = ref('')

const profileCopy = computed(() => {
  if (locale.value === 'en') {
    return {
      member: 'Member',
      hidden: 'Hidden',
      noTeamCode: 'No team code',
      avatarAlt: 'Profile photo',
      uploading: 'Uploading...',
      changeAvatar: 'Change profile photo',
      removeAvatar: 'Remove profile photo',
      secureInfo: 'Secure information',
      hiddenData: 'Hidden user data',
      email: 'Email',
      password: 'Password',
      passwordHidden: 'Password cannot be viewed',
      teamCode: 'Team code',
      hide: 'Hide',
      show: 'Show',
      sending: 'Sending...',
      changePassword: 'Change password',
      teamMembership: 'Team membership',
      leaveCurrentTeam: 'Leave current team',
      leaving: 'Leaving...',
      leaveTeam: 'Leave team',
      resetEmailSent: 'Password reset email has been sent.',
      resetEmailError: 'Failed to send password reset email.',
      selectImage: 'Choose an image file.',
      imageTooLarge: 'Image must be smaller than 2 MB.',
      avatarUpdated: 'Profile photo updated successfully.',
      avatarUpdateError: 'Failed to update profile photo.',
      avatarRemoved: 'Profile photo removed successfully.',
      avatarRemoveError: 'Failed to remove profile photo.',
      mainCoachLeaveDescription: 'If another coach is on the team, ownership will be transferred automatically when you leave. If no other coach is available, the action will be blocked.',
      coachLeaveDescription: 'When you leave the team, you will lose coach access to this team.',
      playerLeaveDescription: 'When you leave the team, you will be removed from the roster and team chat.',
      leaveMainCoachConfirm: 'Leave team "{team}"? If another coach is available, ownership will be transferred automatically.',
      leaveMainCoachConfirmFallback: 'Leave this team? If another coach is available, ownership will be transferred automatically.',
      leaveConfirm: 'Leave team "{team}"?',
      leaveConfirmFallback: 'Leave this team?',
      leaveSuccess: 'You left the team successfully.',
      leaveError: 'Failed to leave the team.'
    }
  }

  return {
    member: 'Dalībnieks',
    hidden: 'Paslēpts',
    noTeamCode: 'Komandas koda nav',
    avatarAlt: 'Profila attēls',
    uploading: 'Augšupielādē...',
    changeAvatar: 'Mainīt profila attēlu',
    removeAvatar: 'Noņemt profila attēlu',
    secureInfo: 'Droša informācija',
    hiddenData: 'Slēptie lietotāja dati',
    email: 'E-pasts',
    password: 'Parole',
    passwordHidden: 'Paroli nevar apskatīt',
    teamCode: 'Komandas kods',
    hide: 'Paslēpt',
    show: 'Parādīt',
    sending: 'Sūta...',
    changePassword: 'Mainīt paroli',
    teamMembership: 'Dalība komandā',
    leaveCurrentTeam: 'Pamest pašreizējo komandu',
    leaving: 'Iziet...',
    leaveTeam: 'Pamest komandu',
    resetEmailSent: 'Paroles atiestatīšanas e-pasts ir nosūtīts.',
    resetEmailError: 'Neizdevās nosūtīt paroles atiestatīšanas e-pastu.',
    selectImage: 'Izvēlieties attēla failu.',
    imageTooLarge: 'Attēlam jābūt mazākam par 2 MB.',
    avatarUpdated: 'Profila attēls veiksmīgi atjaunināts.',
    avatarUpdateError: 'Neizdevās atjaunināt profila attēlu.',
    avatarRemoved: 'Profila attēls veiksmīgi noņemts.',
    avatarRemoveError: 'Neizdevās noņemt profila attēlu.',
    mainCoachLeaveDescription: 'Ja komandā ir cits treneris, īpašumtiesības pēc iziešanas tiks nodotas automātiski. Ja cita trenera nav, darbība tiks bloķēta.',
    coachLeaveDescription: 'Izejot no komandas, jūs zaudēsiet trenera piekļuvi šai komandai, līdz pievienosieties komandai vēlreiz.',
    playerLeaveDescription: 'Izejot no komandas, jūs tiksiet noņemts no sastāva un komandas čata, līdz pievienosieties komandai vēlreiz.',
    leaveMainCoachConfirm: 'Pamest komandu "{team}"? Ja ir pieejams cits treneris, īpašumtiesības tiks nodotas automātiski.',
    leaveMainCoachConfirmFallback: 'Pamest šo komandu? Ja ir pieejams cits treneris, īpašumtiesības tiks nodotas automātiski.',
    leaveConfirm: 'Pamest komandu "{team}"?',
    leaveConfirmFallback: 'Pamest šo komandu?',
    leaveSuccess: 'Jūs veiksmīgi pametāt komandu.',
    leaveError: 'Neizdevās pamest komandu.'
  }
})

const user = computed(() => auth.user)

const fullName = computed(() => {
  if (!user.value) return ''
  return `${user.value.name || ''} ${user.value.surname || ''}`.trim()
})

const initials = computed(() => {
  if (!fullName.value) return '?'
  return fullName.value
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const roleVariant = computed(() => {
  return user.value?.role === 'Coach' ? 'coach' : 'player'
})

const roleLabel = computed(() => {
  const role = String(user.value?.role || '').toLowerCase()
  if (role === 'coach') return t('profile.coach')
  if (role === 'player') return t('profile.player')
  if (role === 'admin') return t('admin.admin')
  return profileCopy.value.member
})

const isCoach = computed(() => {
  return typeof user.value?.role === 'string' && user.value.role.toLowerCase() === 'coach'
})

const isMainCoach = computed(() => {
  return isCoach.value && Number(team.value?.coach_id) === Number(user.value?.id)
})

const maskedEmail = computed(() => {
  const email = user.value?.email
  if (!email || !email.includes('@')) return profileCopy.value.hidden

  return email
})

const maskedTeamCode = computed(() => {
  const code = team.value?.team_code
  if (!code) return profileCopy.value.noTeamCode

  return code
})

const loadProfile = async () => {
  loading.value = true

  try {
    if (auth.token) {
      await auth.fetchUser()
    }

    const response = await fetch('/api/auth/my-team', {
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    if (response.ok) {
      const data = await response.json()
      team.value = data.team || data
    } else {
      team.value = null
    }
  } catch (error) {
    console.error('Error loading profile:', error)
    team.value = null
  } finally {
    loading.value = false
  }
}

const sendPasswordReset = async () => {
  passwordLoading.value = true
  passwordMessage.value = ''
  passwordError.value = ''

  try {
    const response = await axios.post('/api/auth/forgot-password', {
      email: user.value?.email
    })

    passwordMessage.value = response.data.message || profileCopy.value.resetEmailSent
  } catch (error) {
    passwordError.value = error.response?.data?.error || profileCopy.value.resetEmailError
  } finally {
    passwordLoading.value = false
  }
}

const syncUserAvatar = (avatar) => {
  auth.user = {
    ...(auth.user || {}),
    avatar: avatar || null
  }
  localStorage.setItem('user', JSON.stringify(auth.user))
}

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) return

  avatarMessage.value = ''
  avatarError.value = ''

  if (!file.type.startsWith('image/')) {
    avatarError.value = profileCopy.value.selectImage
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = profileCopy.value.imageTooLarge
    return
  }

  avatarLoading.value = true

  try {
    const avatar = await uploadUserAvatar(file)
    syncUserAvatar(avatar)
    avatarMessage.value = profileCopy.value.avatarUpdated
  } catch (error) {
    console.error('Error uploading avatar:', error)
    avatarError.value = error.response?.data?.error || profileCopy.value.avatarUpdateError
  } finally {
    avatarLoading.value = false
  }
}

const deleteAvatar = async () => {
  avatarMessage.value = ''
  avatarError.value = ''
  avatarLoading.value = true

  try {
    await removeUserAvatar()
    syncUserAvatar(null)
    avatarMessage.value = profileCopy.value.avatarRemoved
  } catch (error) {
    console.error('Error deleting avatar:', error)
    avatarError.value = error.response?.data?.error || profileCopy.value.avatarRemoveError
  } finally {
    avatarLoading.value = false
  }
}

const handleLogout = () => {
  auth.logout()
}

const leaveTeamDescription = computed(() => {
  if (!team.value?.id) return ''

  if (isMainCoach.value) {
    return profileCopy.value.mainCoachLeaveDescription
  }

  if (isCoach.value) {
    return profileCopy.value.coachLeaveDescription
  }

  return profileCopy.value.playerLeaveDescription
})

const leaveTeamConfirmText = computed(() => {
  const teamName = team.value?.name

  if (isMainCoach.value) {
    return teamName
      ? profileCopy.value.leaveMainCoachConfirm.replace('{team}', teamName)
      : profileCopy.value.leaveMainCoachConfirmFallback
  }

  return teamName ? profileCopy.value.leaveConfirm.replace('{team}', teamName) : profileCopy.value.leaveConfirmFallback
})

const handleLeaveTeam = async () => {
  if (!team.value?.id || teamActionLoading.value) return

  teamActionError.value = ''

  if (!window.confirm(leaveTeamConfirmText.value)) {
    return
  }

  teamActionLoading.value = true

  try {
    const result = await leaveCurrentTeam()
    await auth.fetchUser()
    team.value = null

    window.alert(result.message || profileCopy.value.leaveSuccess)
    await router.push('/')
  } catch (error) {
    console.error('Error leaving team:', error)
    teamActionError.value = error.response?.data?.error || profileCopy.value.leaveError
  } finally {
    teamActionLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-page">
    <div v-if="loading" class="profile-loading">
      <div class="profile-spinner"></div>
      <p>{{ $t('profile.loadingProfile') }}</p>
    </div>

    <div v-else class="profile-layout">
      <section class="profile-hero">
        <div class="profile-identity">
          <div class="profile-avatar" :class="`profile-avatar--${roleVariant}`">
            <img v-if="user?.avatar" :src="user.avatar" :alt="fullName || profileCopy.avatarAlt" class="profile-avatar-image">
            <template v-else>{{ initials }}</template>
          </div>

          <div class="profile-copy">
            <span class="profile-role" :class="`profile-role--${roleVariant}`">
              {{ roleLabel }}
            </span>
            <h1>{{ fullName || t('profile.profile') }}</h1>
            <p>{{ team?.name || t('profile.noTeamYet') }}</p>
            <div class="profile-avatar-tools">
              <button type="button" class="profile-btn profile-btn--ghost" :disabled="avatarLoading" @click="triggerAvatarUpload">
                {{ avatarLoading ? profileCopy.uploading : profileCopy.changeAvatar }}
              </button>
              <button
                v-if="user?.avatar"
                type="button"
                class="profile-btn profile-btn--ghost danger"
                :disabled="avatarLoading"
                @click="deleteAvatar"
              >
                {{ profileCopy.removeAvatar }}
              </button>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="profile-hidden-input"
              @change="handleAvatarUpload"
            >
          </div>
        </div>

        <button type="button" class="profile-btn profile-btn--logout" @click="handleLogout">
          {{ $t('profile.logout') }}
        </button>
      </section>

      <p v-if="avatarMessage" class="profile-status profile-status--success">
        {{ avatarMessage }}
      </p>
      <p v-if="avatarError" class="profile-status profile-status--error">
        {{ avatarError }}
      </p>

      <section class="profile-secure">
        <div class="profile-secure-head">
          <p class="profile-kicker">{{ profileCopy.secureInfo }}</p>
          <h2>{{ profileCopy.hiddenData }}</h2>
        </div>

        <div class="profile-secure-list">
          <article class="profile-secure-row">
            <div class="profile-row-copy">
              <span class="profile-row-label">{{ profileCopy.email }}</span>
              <strong>{{ maskedEmail }}</strong>
            </div>
          </article>

          <article class="profile-secure-row">
            <div class="profile-row-copy">
              <span class="profile-row-label">{{ profileCopy.password }}</span>
              <strong>********</strong>
            </div>
            <button
              type="button"
              class="profile-btn profile-btn--primary"
              :disabled="passwordLoading || !user?.email"
              @click="sendPasswordReset"
            >
              {{ passwordLoading ? profileCopy.sending : profileCopy.changePassword }}
            </button>
          </article>

          <article class="profile-secure-row">
            <div class="profile-row-copy">
              <span class="profile-row-label">{{ profileCopy.teamCode }}</span>
              <strong>{{ maskedTeamCode }}</strong>
            </div>
          </article>
        </div>

        <p v-if="passwordMessage" class="profile-status profile-status--success">
          {{ passwordMessage }}
        </p>
        <p v-if="passwordError" class="profile-status profile-status--error">
          {{ passwordError }}
        </p>
      </section>

      <section v-if="team?.id" class="profile-secure profile-danger-zone">
        <div class="profile-secure-head">
          <p class="profile-kicker">{{ profileCopy.teamMembership }}</p>
          <h2>{{ profileCopy.leaveCurrentTeam }}</h2>
        </div>

        <p class="profile-danger-copy">
          {{ leaveTeamDescription }}
        </p>

        <div class="profile-danger-actions">
          <button
            type="button"
            class="profile-btn profile-btn--ghost danger"
            :disabled="teamActionLoading"
            @click="handleLeaveTeam"
          >
            {{ teamActionLoading ? profileCopy.leaving : profileCopy.leaveTeam }}
          </button>
        </div>

        <p v-if="teamActionError" class="profile-status profile-status--error">
          {{ teamActionError }}
        </p>
      </section>
    </div>
  </div>
</template>

<style>
.profile-page {
  --profile-surface: var(--card-bg);
  --profile-border: var(--border-color);
  --profile-text: var(--text-color);
  --profile-muted: var(--text-secondary);
  --profile-blue: #0b72e7;
  --profile-blue-strong: #0857b8;
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.12), transparent 30%),
    var(--background-color);
  color: var(--profile-text);
}

.dark-mode .profile-page {
  --profile-blue: #69b3ff;
  --profile-blue-strong: #2e7fe0;
  background:
    radial-gradient(circle at top left, rgba(105, 179, 255, 0.18), transparent 34%),
    var(--background-color);
}

.profile-layout {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 18px;
}

.profile-loading {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--profile-muted);
}

.profile-spinner {
  width: 42px;
  height: 42px;
  border: 3px solid rgba(11, 114, 231, 0.16);
  border-top-color: var(--profile-blue);
  border-radius: 50%;
  animation: profile-spin 0.85s linear infinite;
}

@keyframes profile-spin {
  to {
    transform: rotate(360deg);
  }
}

.profile-hero,
.profile-secure {
  background: var(--profile-surface);
  border: 1px solid var(--profile-border);
  border-radius: 28px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.profile-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(11, 114, 231, 0.14), transparent 72%), var(--profile-surface);
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.profile-avatar {
  width: 86px;
  height: 86px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  font-size: 1.9rem;
  font-weight: 800;
  box-shadow: 0 14px 30px rgba(11, 114, 231, 0.2);
}

.profile-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}

.profile-avatar--coach,
.profile-role--coach {
  background: linear-gradient(135deg, #0b72e7, #0857b8);
}

.profile-avatar--player,
.profile-role--player {
  background: linear-gradient(135deg, #18a0fb, #0b72e7);
}

.profile-copy {
  min-width: 0;
}

.profile-copy h1 {
  margin: 10px 0 4px;
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  line-height: 1.05;
}

.profile-copy p {
  margin: 0;
  color: var(--profile-muted);
  font-size: 1rem;
}

.profile-avatar-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.profile-role {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.profile-secure {
  padding: 24px;
}

.profile-danger-zone {
  border-color: rgba(182, 52, 73, 0.18);
  background:
    linear-gradient(135deg, rgba(182, 52, 73, 0.08), transparent 68%),
    var(--profile-surface);
}

.profile-danger-copy {
  margin: 16px 0 0;
  color: var(--profile-muted);
  line-height: 1.55;
}

.profile-danger-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 18px;
}

.profile-secure-head h2 {
  margin: 6px 0 0;
  font-size: 1.6rem;
}

.profile-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
  color: var(--profile-muted);
}

.profile-secure-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.profile-secure-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(11, 114, 231, 0.05);
  border: 1px solid rgba(11, 114, 231, 0.08);
}

.dark-mode .profile-secure-row {
  background: rgba(105, 179, 255, 0.08);
  border-color: rgba(105, 179, 255, 0.12);
}

.profile-row-copy {
  display: grid;
  gap: 3px;
}

.profile-row-label {
  font-size: 0.8rem;
  color: var(--profile-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.profile-row-copy strong {
  font-size: 1.02rem;
  color: var(--profile-text);
}

.profile-row-copy small {
  color: var(--profile-muted);
  font-size: 0.86rem;
}

.profile-page .profile-btn {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  outline: none;
  border-radius: 16px;
  padding: 12px 18px;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.profile-page .profile-btn:hover {
  transform: translateY(-1px);
}

.profile-page .profile-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
}

.profile-btn--primary {
  color: white;
  background: linear-gradient(135deg, var(--profile-blue), var(--profile-blue-strong));
  box-shadow: 0 14px 28px rgba(11, 114, 231, 0.24);
}

.profile-btn--ghost {
  color: var(--profile-blue-strong);
  background: rgba(11, 114, 231, 0.08);
  border: 1px solid rgba(11, 114, 231, 0.16);
}

.dark-mode .profile-btn--ghost {
  color: #dbeeff;
  background: rgba(105, 179, 255, 0.14);
  border-color: rgba(105, 179, 255, 0.18);
}

.profile-btn--ghost.danger {
  color: #b63449;
  background: rgba(182, 52, 73, 0.08);
  border-color: rgba(182, 52, 73, 0.18);
}

.profile-btn--logout {
  color: #b63449;
  background: rgba(182, 52, 73, 0.08);
  border: 1px solid rgba(182, 52, 73, 0.18);
}

.profile-status {
  margin: 14px 0 0;
  padding: 14px 16px;
  border-radius: 16px;
  font-weight: 600;
}

.profile-status--success {
  color: #157347;
  background: rgba(21, 115, 71, 0.12);
}

.profile-status--error {
  color: #c53939;
  background: rgba(197, 57, 57, 0.12);
}

.profile-hidden-input {
  display: none;
}

@media (max-width: 720px) {
  .profile-layout {
    padding: 16px;
  }

  .profile-hero,
  .profile-secure-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-identity {
    width: 100%;
  }

  .profile-page .profile-btn {
    width: 100%;
  }
}
</style>
