<template>
  <div class="schedule-page">
    <div class="schedule-container">
      <section class="schedule-hero">
        <div class="hero-main">
          <div class="schedule-header">
            <div class="header-left">
              <p class="header-eyebrow">{{ scheduleCopy.teamCalendar }}</p>
              <h1>{{ $t('schedule.title') }}</h1>
              <p class="header-subtitle">{{ upcomingCount }} {{ upcomingCount !== 1 ? $t('schedule.upcomingEvents') : $t('schedule.upcomingEvent') }}</p>
            </div>
            <div class="header-actions">
              <button v-if="isCoach" @click="showStats = true; fetchAttendanceStats()" class="header-btn stats-btn">
                {{ $t('schedule.stats') }}
              </button>
              <button v-if="isCoach" @click="openAddModal()" class="header-btn add-btn">
                {{ $t('schedule.newEvent') }}
              </button>
            </div>
          </div>
        </div>
        <div class="hero-controls">
          <div class="view-toggle">
            <button @click="viewMode = 'week'" :class="{ active: viewMode === 'week' }" :title="$t('schedule.weekView')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M10 4v18"/></svg>
            </button>
            <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }" :title="$t('schedule.listView')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            </button>
          </div>
        </div>
      </section>

      <div class="schedule-surface">
        <!-- Week view -->
        <div v-if="viewMode === 'week'" class="week-view">
          <div class="week-navigation">
            <div class="week-navigation-main">
              <button @click="changeWeek(-1)" class="nav-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div ref="datePickerRef" class="week-title">
                <button @click.stop="toggleDatePicker" type="button" class="week-title-btn" :class="{ active: showDatePicker }">
                  <span class="week-title-text">{{ currentWeekRange }}</span>
                  <svg class="week-title-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                <div v-if="showDatePicker" class="date-picker-popover" @click.stop>
                  <div class="date-picker-header">
                    <button @click="changeDatePickerMonth(-1)" type="button" class="date-picker-nav-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <div class="date-picker-month">{{ datePickerMonthLabel }}</div>
                    <button @click="changeDatePickerMonth(1)" type="button" class="date-picker-nav-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </div>

                  <div class="date-picker-weekdays">
                    <span v-for="(weekday, index) in datePickerWeekdayLabels" :key="index" class="date-picker-weekday">
                      {{ weekday }}
                    </span>
                  </div>

                  <div class="date-picker-grid">
                    <button
                      v-for="day in datePickerDays"
                      :key="day.key"
                      type="button"
                      class="date-picker-day"
                      :class="{
                        'outside-month': day.isOutsideMonth,
                        today: day.isToday,
                        selected: day.isSelected
                      }"
                      @click="selectPickerDate(day.date)"
                    >
                      {{ day.label }}
                    </button>
                  </div>
                </div>
              </div>
              <button @click="changeWeek(1)" class="nav-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <button @click="goToCurrentWeek" class="today-btn" :disabled="isCurrentWeek">
              {{ $t('schedule.today') }}
            </button>
          </div>

          <div class="calendar-grid">
            <div v-for="day in daysOfWeek" :key="day.date" class="day-column" :class="{ 'today': day.isToday, 'has-events': day.events.length > 0 }">
              <div class="day-header">
                <div class="day-name">{{ day.dayName }}</div>
                <div class="day-number" :class="{ 'today-number': day.isToday }">{{ day.date.format('D') }}</div>
              </div>
              
              <div class="day-events">
                <div 
                  v-for="event in day.events" 
                  :key="event.id" 
                  class="event-card"
                  :class="[event.event_type, { 'past-event': !isEventUpcoming(event) }]"
                  @click="selectEvent(event)"
                >
                  <div class="event-color-bar"></div>
                  <div class="event-card-body">
                    <div class="event-card-time">{{ formatTime(event.event_time) }}</div>
                    <div class="event-card-title">{{ event.event_name }}</div>
                    <div class="event-card-location" v-if="event.location">{{ event.location }}</div>
                  </div>
                </div>
                
                <div 
                  v-if="isCoach" 
                  class="add-event-cell"
                  @click="openAddModal(day.date.format('YYYY-MM-DD'))"
                >
                  <span>+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- List view -->
        <div v-if="viewMode === 'list'" class="list-view">
          <div class="list-toolbar">
            <div class="filter-chips">
              <button 
                v-for="filter in eventFilters" 
                :key="filter.value" 
                @click="typeFilter = typeFilter === filter.value ? '' : filter.value"
                :class="['filter-chip', filter.value, { active: typeFilter === filter.value }]"
              >
                {{ filter.icon }} {{ filter.label }}
              </button>
            </div>
            <div class="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input v-model="searchQuery" :placeholder="$t('schedule.searchEvents')" />
            </div>
          </div>
          
          <div v-if="filteredEvents.length === 0" class="empty-state">
            <div class="empty-icon"></div>
            <p>{{ $t('schedule.noEventsFound') }}</p>
          </div>

          <div class="events-list" v-else>
            <template v-for="(group, label) in groupedEvents" :key="label">
              <div class="date-group-label">{{ label }}</div>
              <div 
                v-for="event in group" 
                :key="event.id" 
                class="list-event-card"
                :class="[event.event_type, { 'past-event': !isEventUpcoming(event) }]"
                @click="selectEvent(event)"
              >
                <div class="list-event-color"></div>
                <div class="list-event-time">
                  <span class="time-text">{{ formatTime(event.event_time) }}</span>
                </div>
                <div class="list-event-info">
                  <div class="list-event-title">{{ event.event_name }}</div>
                  <div class="list-event-meta">
                    <span v-if="event.location"> {{ event.location }}</span>
                  </div>
                </div>
                <div class="list-event-badge" :class="event.event_type">
                  {{ getEventIcon(event.event_type) }} {{ getEventTypeLabel(event.event_type) }}
                </div>
                <div v-if="isCoach" class="list-event-actions">
                  <button
                    @click.stop="startEdit(event)"
                    class="action-icon"
                    type="button"
                    :aria-label="$t('buttons.edit')"
                    :title="$t('buttons.edit')"
                  >
                    <svg class="action-svg" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    @click.stop="deleteEvent(event)"
                    class="action-icon delete"
                    type="button"
                    :aria-label="$t('buttons.delete')"
                    :title="$t('buttons.delete')"
                  >
                    <svg class="action-svg" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5" />
                      <path d="M14 11v5" />
                    </svg>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for adding/editing -->
    <div v-if="showEventModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>{{ modalMode === 'add' ? $t('schedule.addEvent') : $t('schedule.editEvent') }}</h3>
        
        <div v-if="error" class="modal-error">{{ error }}</div>
        
        <div class="modal-form">
          <div class="form-row">
            <label>{{ $t('schedule.eventTitle') }}</label>
            <input v-model="currentEvent.event_name" :placeholder="$t('schedule.practice') + ', ' + $t('schedule.game') + ', ' + $t('schedule.other')" />
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventDate') }}</label>
            <input v-model="currentEvent.event_date" type="date" />
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventTime') }}</label>
            <input v-model="currentEvent.event_time" type="time" />
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventType') }}</label>
            <select v-model="currentEvent.event_type">
              <option value="practice">{{ $t('schedule.practice') }}</option>
              <option value="game">{{ $t('schedule.game') }}</option>
              <option value="meeting">{{ $t('schedule.meeting') }}</option>
              <option value="other">{{ $t('schedule.other') }}</option>
            </select>
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventLocation') }}</label>
            <input v-model="currentEvent.location" :placeholder="$t('schedule.eventLocation') + '?'" />
          </div>

          <div class="form-row">
            <label>{{ $t('schedule.eventDescription') }}</label>
            <textarea
              v-model="currentEvent.description"
              rows="4"
              :placeholder="$t('schedule.eventDescriptionPlaceholder')"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button @click="closeModal">{{ $t('schedule.cancel') }}</button>
            <button @click="modalMode === 'add' ? addEvent() : saveEdit()" class="save">
              {{ modalMode === 'add' ? $t('schedule.add') : $t('schedule.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Event details -->
    <div v-if="selectedEvent" class="event-detail-overlay" @click.self="selectedEvent = null">
      <div class="event-detail-content" :class="selectedEvent.event_type">
        <button class="close-detail" @click="selectedEvent = null">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        <!-- Type badge -->
        <div class="event-type-badge" :class="selectedEvent.event_type">
          <span class="type-icon">{{ getEventIcon(selectedEvent.event_type) }}</span>
          <span>{{ getEventTypeLabel(selectedEvent.event_type) }}</span>
        </div>
        
        <!-- Main info -->
        <div class="event-detail-main">
          <h2 class="event-title">{{ selectedEvent.event_name }}</h2>
          
          <div class="event-meta-grid">
            <div class="meta-item">
              <div class="meta-content">
                <span class="meta-label">{{ $t('schedule.date') }}</span>
                <span class="meta-value">{{ dayjs(selectedEvent.event_date).format('dddd, D MMMM YYYY') }}</span>
              </div>
            </div>
            
            <div class="meta-item">
              <div class="meta-content">
                <span class="meta-label">{{ $t('schedule.time') }}</span>
                <span class="meta-value">{{ selectedEvent.event_time }}</span>
              </div>
            </div>
            
            <div class="meta-item full-width">
              <div class="meta-content">
                <span class="meta-label">{{ $t('schedule.location') }}</span>
                <span class="meta-value">{{ selectedEvent.location || $t('schedule.notSpecified') }}</span>
              </div>
            </div>
          </div>

          <div v-if="selectedEvent.description" class="event-description">
            <span class="meta-label">{{ $t('schedule.eventDescription') }}</span>
            <p>{{ selectedEvent.description }}</p>
          </div>
          
          <!-- Countdown or status -->
          <div class="event-countdown" v-if="isEventUpcoming(selectedEvent)">
            <span class="countdown-label"> {{ $t('schedule.startsIn') }}</span>
            <span class="countdown-value">{{ getTimeUntilEvent(selectedEvent) }}</span>
          </div>
          <div class="event-countdown past" v-else>
            <span class="countdown-label">✓ {{ $t('schedule.eventCompleted') }}</span>
          </div>
        </div>
        
        <!-- Player's own attendance before event start -->
        <div v-if="isPracticeEvent(selectedEvent) && isPlayer && isEventUpcoming(selectedEvent)" class="attendance-section">
          <h3>{{ $t('schedule.yourResponse') }}</h3>
          <div class="attendance-choice">
            <button 
              @click="setMyAttendance('present')" 
              :class="{ active: myAttendanceStatus === 'present' }"
              class="attend-btn yes"
            >
              <span class="btn-icon">✓</span>
              <span class="btn-text">{{ $t('schedule.illBeThere') }}</span>
            </button>
            <button 
              @click="openDeclineModal()" 
              :class="{ active: myAttendanceStatus === 'absent' || myAttendanceStatus === 'excused' }"
              class="attend-btn no"
            >
              <span class="btn-icon">✗</span>
              <span class="btn-text">{{ $t('schedule.cantMakeIt') }}</span>
            </button>
          </div>
          <div v-if="myAttendanceStatus && myAttendanceStatus !== 'present'" class="my-reason-card">
            <span class="reason-icon"></span>
            <span>{{ myAttendanceNotes || $t('schedule.noReasonProvided') }}</span>
          </div>
        </div>

        <!-- Show attendance status if event passed -->
        <div v-if="isPracticeEvent(selectedEvent) && isPlayer && !isEventUpcoming(selectedEvent)" class="attendance-section past">
          <h3>{{ $t('schedule.yourAttendance') }}</h3>
          <div class="attendance-result" :class="myAttendanceStatus || 'unmarked'">
            <span class="result-icon">{{ getStatusIcon(myAttendanceStatus) }}</span>
            <span class="result-text">{{ getStatusDisplayText(myAttendanceStatus) }}</span>
          </div>
        </div>
        
        <!-- Coach view: all player responses -->
        <div v-if="isPracticeEvent(selectedEvent) && isCoach" class="attendance-section coach">
          <h3>{{ $t('schedule.teamResponses') }}</h3>
          <div class="attendance-stats-bar">
            <div class="stat-segment yes" :style="{ width: getAttendancePercent('present') + '%' }">
              <span v-if="attendanceSummary.present > 0">{{ attendanceSummary.present }}</span>
            </div>
            <div class="stat-segment no" :style="{ width: getAttendancePercent('absent') + '%' }">
              <span v-if="attendanceSummary.absent > 0">{{ attendanceSummary.absent }}</span>
            </div>
            <div class="stat-segment pending" :style="{ width: getAttendancePercent('unmarked') + '%' }">
              <span v-if="attendanceSummary.unmarked > 0">{{ attendanceSummary.unmarked }}</span>
            </div>
          </div>
          <div class="stats-legend">
            <span class="legend-item yes">✓ {{ $t('schedule.attending') }} ({{ attendanceSummary.present }})</span>
            <span class="legend-item no">✗ {{ $t('schedule.cantAttend') }} ({{ attendanceSummary.absent }})</span>
            <span class="legend-item pending">? {{ $t('schedule.noResponse') }} ({{ attendanceSummary.unmarked }})</span>
          </div>
          
          <div class="attendees-grid">
            <div v-for="player in sortedEventAttendanceList" :key="player.user_id" class="attendee-card" :class="player.status || 'unmarked'">
              <div class="attendee-avatar">
                <img v-if="player.avatar" :src="player.avatar" :alt="player.username" class="person-avatar-image">
                <template v-else>{{ getInitials(player.username) }}</template>
              </div>
              <div class="attendee-details">
                <div class="attendee-name">{{ player.username }}</div>
                <div class="attendee-status">{{ getStatusDisplayText(player.status) }}</div>
              </div>
              <div class="status-indicator" :class="player.status || 'unmarked'">
                {{ getStatusIcon(player.status) }}
              </div>
              <div v-if="player.notes" class="attendee-note">
                {{ player.notes }}
              </div>
            </div>
          </div>
        </div>

        <!-- Player's own game lineup response -->
        <div v-if="isGameEvent(selectedEvent) && isPlayer && selectedLineupEntry && isEventUpcoming(selectedEvent)" class="attendance-section">
          <h3>{{ $t('schedule.yourGameResponse') }}</h3>
          <div class="attendance-choice">
            <button
              @click="setMyLineupResponse('confirmed')"
              :class="{ active: selectedLineupEntry.status === 'confirmed' }"
              class="attend-btn yes"
            >
              <span class="btn-icon">✓</span>
              <span class="btn-text">{{ $t('schedule.gameWillPlay') }}</span>
            </button>
            <button
              @click="openDeclineModal()"
              :class="{ active: selectedLineupEntry.status === 'declined' }"
              class="attend-btn no"
            >
              <span class="btn-icon">×</span>
              <span class="btn-text">{{ $t('schedule.gameCantPlay') }}</span>
            </button>
          </div>
          <div v-if="selectedLineupEntry.status === 'declined'" class="my-reason-card">
            <span class="reason-icon"></span>
            <span>{{ selectedLineupEntry.notes || $t('schedule.noReasonProvided') }}</span>
          </div>
        </div>

        <div v-if="isGameEvent(selectedEvent) && isPlayer && selectedLineupEntry && !isEventUpcoming(selectedEvent)" class="attendance-section past">
          <h3>{{ $t('schedule.yourGameResponse') }}</h3>
          <div class="attendance-result" :class="selectedLineupEntry.status || 'selected'">
            <span class="result-icon">{{ getLineupStatusIcon(selectedLineupEntry.status) }}</span>
            <span class="result-text">{{ getLineupStatusText(selectedLineupEntry.status) }}</span>
          </div>
        </div>

        <div v-if="isGameEvent(selectedEvent) && isPlayer && !selectedLineupEntry" class="attendance-section">
          <h3>{{ $t('schedule.gameLineup') }}</h3>
          <div class="lineup-empty-note">{{ $t('schedule.notInLineup') }}</div>
        </div>

        <!-- Coach view: game lineup -->
        <div v-if="isGameEvent(selectedEvent) && isCoach" class="attendance-section coach lineup-section">
          <div class="lineup-header">
            <div>
              <h3>{{ $t('schedule.gameLineup') }}</h3>
              <p>{{ $t('schedule.lineupSelectedCount', { count: lineupEditIds.length }) }}</p>
            </div>
            <button type="button" class="lineup-save-btn" :disabled="lineupSaving" @click="saveGameLineup">
              {{ lineupSaving ? $t('schedule.savingLineup') : $t('schedule.saveLineup') }}
            </button>
          </div>

          <div v-if="lineupMessage" class="lineup-message">{{ lineupMessage }}</div>

          <div class="lineup-builder">
            <label
              v-for="player in gameLineupList"
              :key="player.user_id"
              class="lineup-player-toggle"
              :class="{ selected: isPlayerInLineupDraft(player.user_id) }"
            >
              <input
                type="checkbox"
                :checked="isPlayerInLineupDraft(player.user_id)"
                @change="toggleLineupDraft(player.user_id)"
              >
              <span class="lineup-player-avatar">
                <img v-if="player.avatar" :src="player.avatar" :alt="player.username" class="person-avatar-image">
                <template v-else>{{ getInitials(player.username) }}</template>
              </span>
              <span class="lineup-player-name">{{ player.username }}</span>
            </label>
          </div>

          <div v-if="selectedLineupPlayers.length" class="lineup-responses">
            <div class="attendance-stats-bar">
              <div class="stat-segment yes" :style="{ width: getLineupPercent('confirmed') + '%' }">
                <span v-if="lineupSummary.confirmed > 0">{{ lineupSummary.confirmed }}</span>
              </div>
              <div class="stat-segment no" :style="{ width: getLineupPercent('declined') + '%' }">
                <span v-if="lineupSummary.declined > 0">{{ lineupSummary.declined }}</span>
              </div>
              <div class="stat-segment pending" :style="{ width: getLineupPercent('selected') + '%' }">
                <span v-if="lineupSummary.pending > 0">{{ lineupSummary.pending }}</span>
              </div>
            </div>
            <div class="stats-legend">
              <span class="legend-item yes">✓ {{ $t('schedule.gameConfirmed') }} ({{ lineupSummary.confirmed }})</span>
              <span class="legend-item no">× {{ $t('schedule.gameDeclined') }} ({{ lineupSummary.declined }})</span>
              <span class="legend-item pending">? {{ $t('schedule.noResponse') }} ({{ lineupSummary.pending }})</span>
            </div>

            <div class="attendees-grid">
              <div v-for="player in sortedSelectedLineupPlayers" :key="player.user_id" class="attendee-card" :class="player.status || 'selected'">
                <div class="attendee-avatar">
                  <img v-if="player.avatar" :src="player.avatar" :alt="player.username" class="person-avatar-image">
                  <template v-else>{{ getInitials(player.username) }}</template>
                </div>
                <div class="attendee-details">
                  <div class="attendee-name">{{ player.username }}</div>
                  <div class="attendee-status">{{ getLineupStatusText(player.status) }}</div>
                </div>
                <div class="status-indicator" :class="player.status || 'selected'">
                  {{ getLineupStatusIcon(player.status) }}
                </div>
                <div v-if="player.notes" class="attendee-note">
                  {{ player.notes }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="lineup-empty-note">
            {{ lineupEditIds.length ? $t('schedule.lineupDraftReady') : $t('schedule.noLineupSelected') }}
          </div>
        </div>
        
        <!-- Coach buttons -->
        <div v-if="isCoach" class="event-detail-actions">
          <button @click="startEdit(selectedEvent)" class="edit-btn">
            <span></span> {{ $t('buttons.edit') }}
          </button>
          <button @click="deleteEvent(selectedEvent)" class="delete-btn">
            <span></span> {{ $t('buttons.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Decline attendance modal -->
    <div v-if="showDeclineModal" class="modal-overlay" @click.self="showDeclineModal = false">
      <div class="modal-content decline-modal">
        <h3>{{ declineModalTitle }}</h3>
        <textarea 
          v-model="declineReason"
          :placeholder="declineModalPlaceholder"
          rows="4"
        ></textarea>
        <div class="modal-actions">
          <button @click="showDeclineModal = false" class="modal-btn cancel-btn">{{ $t('buttons.cancel') }}</button>
          <button @click="submitDecline" class="modal-btn confirm-btn" :disabled="!declineReason.trim()">{{ $t('buttons.confirm') }}</button>
        </div>
      </div>
    </div>
    
    <!-- Statistikas modālais logs -->
    <div v-if="showStats" class="modal-overlay" @click.self="closeStatsModal">
      <div class="modal-content stats-modal">
        <div class="stats-modal-header">
          <div class="stats-modal-copy">
            <h3>{{ $t('schedule.attendanceStats') }}</h3>
            <p class="stats-modal-subtitle">
              {{ $t('schedule.playersShown', { visible: filteredAttendanceStats.length, total: attendanceStats.length }) }}
            </p>
          </div>
          <button type="button" class="stats-modal-close" :aria-label="$t('buttons.close')" @click="closeStatsModal">
            ×
          </button>
        </div>

        <div class="stats-overview">
          <article class="stats-overview-card">
            <span class="stats-overview-label">{{ $t('schedule.playersTracked') }}</span>
            <strong class="stats-overview-value">{{ attendanceStats.length }}</strong>
          </article>
          <article class="stats-overview-card">
            <span class="stats-overview-label">{{ $t('schedule.practiceSessions') }}</span>
            <strong class="stats-overview-value">{{ totalPracticesCount }}</strong>
          </article>
          <article class="stats-overview-card">
            <span class="stats-overview-label">{{ $t('schedule.averageRate') }}</span>
            <strong class="stats-overview-value">{{ averageAttendanceRate }}%</strong>
          </article>
          <article class="stats-overview-card">
            <span class="stats-overview-label">{{ $t('schedule.bestRate') }}</span>
            <strong class="stats-overview-value">{{ bestAttendanceRate }}%</strong>
          </article>
        </div>

        <div class="stats-toolbar">
          <label class="stats-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input v-model="statsSearchQuery" :placeholder="$t('schedule.searchPlayers')" />
          </label>
          <span class="stats-toolbar-note">
            {{ $t('schedule.playersShown', { visible: filteredAttendanceStats.length, total: attendanceStats.length }) }}
          </span>
        </div>

        <div v-if="filteredAttendanceStats.length" class="stats-table-shell">
          <table class="stats-table">
            <thead>
              <tr>
                <th>{{ $t('schedule.player') }}</th>
                <th>{{ $t('schedule.attended') }}</th>
                <th>{{ $t('schedule.missed') }}</th>
                <th>{{ $t('schedule.noResponse') }}</th>
                <th>{{ $t('schedule.rate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in filteredAttendanceStats" :key="stat.user_id">
                <td>
                  <div class="player-cell">
                    <div class="player-avatar-sm">
                      <img v-if="stat.avatar" :src="stat.avatar" :alt="stat.username" class="person-avatar-image">
                      <template v-else>{{ getInitials(stat.username) }}</template>
                    </div>
                    <div class="player-copy">
                      <span class="player-name">{{ stat.username }}</span>
                      <small class="player-meta">
                        {{ stat.present_count + stat.absent_count + (stat.late_count || 0) }} / {{ stat.total_practices }}
                      </small>
                    </div>
                  </div>
                </td>
                <td class="stats-number stat-present">{{ stat.present_count }}</td>
                <td class="stats-number stat-absent">{{ stat.absent_count }}</td>
                <td class="stats-number stat-unmarked">{{ getUnmarkedStatsCount(stat) }}</td>
                <td>
                  <div class="rate-bar">
                    <div class="rate-track">
                      <div class="rate-fill" :style="{ width: `${stat.attendance_rate}%` }"></div>
                    </div>
                    <span class="rate-value">{{ stat.attendance_rate }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="stats-empty">
          {{ $t('schedule.noStatsMatch') }}
        </div>

        <div class="modal-actions stats-modal-actions">
          <button @click="closeStatsModal" class="modal-btn cancel-btn">{{ $t('buttons.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import axios from 'axios'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/lv'
import { useAuthStore } from '../stores/auth'
import { normalizeRole } from '../utils/teamAccess'

const { t, locale } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const teamId = ref(route.params.id || route.params.teamId)
const events = ref([])
const teamPlayers = ref([])
const error = ref(null)
const viewMode = ref('week') // 'week' or 'list'
const typeFilter = ref('')
const searchQuery = ref('')
const currentWeek = ref(dayjs())
const showDatePicker = ref(false)
const datePickerMonth = ref(currentWeek.value.startOf('month'))
const datePickerRef = ref(null)
const scheduleCopy = computed(() => (
  locale.value === 'lv'
    ? {
        teamCalendar: 'Komandas kalendārs',
        noUpcoming: 'Nav gaidāmu notikumu',
        calendarEmpty: 'Kalendārs pašlaik ir tukšs.',
        weekPlanner: 'Nedēļas plānotājs',
        eventList: 'Notikumu saraksts',
        loadingDataError: 'Neizdevās ielādēt datus',
        timeConflict: 'Šajā datumā un laikā jau ir notikums',
        addError: 'Kļūda, pievienojot notikumu',
        editError: 'Kļūda, rediģējot notikumu',
        deleteConfirm: 'Vai tiešām vēlaties dzēst šo notikumu?',
        deleteError: 'Kļūda, dzēšot notikumu',
        defaultLocation: 'Sporta zāle',
        confirmed: 'apstiprināts',
        notConfirmed: 'nav apstiprināts',
        declined: 'atteikts',
        day: (count) => count === 1 ? 'diena' : 'dienas',
        hour: (count) => count === 1 ? 'stunda' : 'stundas',
        minute: (count) => count === 1 ? 'minūte' : 'minūtes',
        eventTypes: {
          practice: 'Treniņš',
          game: 'Spēle',
          meeting: 'Sapulce',
          other: 'Notikums'
        }
      }
    : {
        teamCalendar: 'Team calendar',
        noUpcoming: 'No upcoming events',
        calendarEmpty: 'The calendar is currently empty.',
        weekPlanner: 'Week planner',
        eventList: 'Event list',
        loadingDataError: 'Could not load data',
        timeConflict: 'There is already an event at this date and time',
        addError: 'Error adding event',
        editError: 'Error editing event',
        deleteConfirm: 'Delete this event?',
        deleteError: 'Error deleting event',
        defaultLocation: 'Sports hall',
        confirmed: 'confirmed',
        notConfirmed: 'not confirmed',
        declined: 'declined',
        day: (count) => count === 1 ? 'day' : 'days',
        hour: (count) => count === 1 ? 'hour' : 'hours',
        minute: (count) => count === 1 ? 'minute' : 'minutes',
        eventTypes: {
          practice: 'Practice',
          game: 'Game',
          meeting: 'Meeting',
          other: 'Event'
        }
      }
))

watch(locale, (value) => {
  dayjs.locale(value === 'lv' ? 'lv' : 'en')
}, { immediate: true })

const calendarLocale = computed(() => (locale.value === 'lv' ? 'lv-LV' : 'en-US'))
const weekdayLabels = computed(() => (
  locale.value === 'lv'
    ? ['P.', 'O.', 'T.', 'C.', 'Pk.', 'S.', 'Sv.']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
))

const getWeekStart = (value) => {
  const date = dayjs(value).startOf('day')
  return date.subtract((date.day() + 6) % 7, 'day')
}

const getWeekEnd = (value) => getWeekStart(value).add(6, 'day')

const formatLocalizedDate = (value, options) =>
  new Intl.DateTimeFormat(calendarLocale.value, options).format(dayjs(value).toDate())

const formatPickerMonthLabel = (value) => {
  const monthName = formatLocalizedDate(value, { month: 'long' })
  const year = dayjs(value).year()
  return locale.value === 'lv' ? `${year}. g. ${monthName}` : `${monthName} ${year}`
}

const isCurrentWeek = computed(() => getWeekStart(currentWeek.value).isSame(getWeekStart(dayjs()), 'day'))

// Event type filters for list view
const eventFilters = computed(() => [
  { value: 'practice', label: t('schedule.practice'), icon: '' },
  { value: 'game', label: t('schedule.game'), icon: '' },
  { value: 'meeting', label: t('schedule.meeting'), icon: '' },
])

// Tuvāko notikumu skaits
const upcomingCount = computed(() => {
  const now = dayjs()
  return events.value.filter(e => dayjs(`${e.event_date} ${e.event_time}`).isAfter(now)).length
})

const totalEvents = computed(() => events.value.length)

const thisWeekCount = computed(() => {
  const start = getWeekStart(currentWeek.value)
  const end = getWeekEnd(currentWeek.value)

  return events.value.filter((event) => {
    const stamp = dayjs(`${event.event_date} ${event.event_time}`)
    return (stamp.isAfter(start) || stamp.isSame(start)) && (stamp.isBefore(end) || stamp.isSame(end))
  }).length
})

const nextEvent = computed(() => {
  const now = dayjs()

  return [...events.value]
    .filter((event) => dayjs(`${event.event_date} ${event.event_time}`).isAfter(now))
    .sort((a, b) => dayjs(`${a.event_date} ${a.event_time}`).valueOf() - dayjs(`${b.event_date} ${b.event_time}`).valueOf())[0] || null
})

const nextEventTitle = computed(() => nextEvent.value?.event_name || scheduleCopy.value.noUpcoming)
const nextEventMeta = computed(() => {
  if (!nextEvent.value) {
    return scheduleCopy.value.calendarEmpty
  }

  const dateText = formatLocalizedDate(nextEvent.value.event_date, { day: 'numeric', month: 'short', year: 'numeric' })
  const timePrefix = locale.value === 'lv' ? 'plkst.' : 'at'
  return `${dateText} ${timePrefix} ${formatTime(nextEvent.value.event_time)}`
})

const currentViewLabel = computed(() => viewMode.value === 'week' ? scheduleCopy.value.weekPlanner : scheduleCopy.value.eventList)

// Format time (e.g. "18:00" -> "6:00 PM" or keep 24h)
const formatTime = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':')
  return `${h}:${m}`
}

const compareScheduleEvents = (a, b) =>
  dayjs(`${a.event_date} ${a.event_time || '23:59'}`).valueOf() -
  dayjs(`${b.event_date} ${b.event_time || '23:59'}`).valueOf()

// Grouped events for list view (by date)
const groupedEvents = computed(() => {
  const groups = {}
  for (const event of filteredEvents.value) {
    const label = formatLocalizedDate(event.event_date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    if (!groups[label]) groups[label] = []
    groups[label].push(event)
  }

  Object.values(groups).forEach((group) => group.sort(compareScheduleEvents))

  return groups
})

// Modals
const showEventModal = ref(false)
const modalMode = ref('add') // 'add' or 'edit'
const currentEvent = ref({
  event_name: '',
  event_date: dayjs().format('YYYY-MM-DD'),
  event_time: '18:00',
  event_type: 'practice',
  location: '',
  description: ''
})
const selectedEvent = ref(null)

// User role
const userRole = computed(() => normalizeRole(auth.user?.role))
const isCoach = computed(() => userRole.value === 'coach')
const isPlayer = computed(() => userRole.value === 'player')

// Data loading
const fetchData = async () => {
  try {
    const [eventsRes, playersRes] = await Promise.all([
      axios.get(`/api/teams/${teamId.value}/schedule`),
      axios.get(`/api/teams/${teamId.value}/players`)
    ])
    events.value = eventsRes.data
    teamPlayers.value = playersRes.data
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = scheduleCopy.value.loadingDataError
  }
}

// Week view
const daysOfWeek = computed(() => {
  const startOfWeek = getWeekStart(currentWeek.value)
  return Array.from({ length: 7 }, (_, i) => {
    const day = startOfWeek.add(i, 'day')
    return {
      date: day,
      dayName: weekdayLabels.value[i],
      isToday: day.isSame(dayjs(), 'day'),
      events: events.value
        .filter((e) => dayjs(e.event_date).isSame(day, 'day'))
        .sort(compareScheduleEvents)
    }
  })
})

const currentWeekRange = computed(() => {
  const start = getWeekStart(currentWeek.value)
  const end = getWeekEnd(currentWeek.value)
  return `${formatLocalizedDate(start, { day: 'numeric', month: 'short' })} - ${formatLocalizedDate(end, { day: 'numeric', month: 'short' })}`
})

const datePickerWeekdayLabels = computed(() => weekdayLabels.value)

const datePickerMonthLabel = computed(() => formatPickerMonthLabel(datePickerMonth.value))

const datePickerDays = computed(() => {
  const monthStart = datePickerMonth.value.startOf('month')
  const calendarStart = getWeekStart(monthStart)
  const leadingDays = (monthStart.day() + 6) % 7
  const totalCells = Math.ceil((leadingDays + monthStart.daysInMonth()) / 7) * 7

  return Array.from({ length: totalCells }, (_, index) => {
    const date = calendarStart.add(index, 'day')
    return {
      key: date.format('YYYY-MM-DD'),
      date,
      label: date.date(),
      isOutsideMonth: date.month() !== monthStart.month(),
      isToday: date.isSame(dayjs(), 'day'),
      isSelected: date.isSame(currentWeek.value, 'day')
    }
  })
})

const changeWeek = (weeks) => {
  currentWeek.value = currentWeek.value.add(weeks, 'week')
  showDatePicker.value = false
}

const goToCurrentWeek = () => {
  if (isCurrentWeek.value) return
  currentWeek.value = dayjs()
  datePickerMonth.value = currentWeek.value.startOf('month')
  showDatePicker.value = false
}

const toggleDatePicker = () => {
  if (!showDatePicker.value) {
    datePickerMonth.value = currentWeek.value.startOf('month')
  }
  showDatePicker.value = !showDatePicker.value
}

const changeDatePickerMonth = (months) => {
  datePickerMonth.value = datePickerMonth.value.add(months, 'month').startOf('month')
}

const selectPickerDate = (date) => {
  currentWeek.value = dayjs(date)
  datePickerMonth.value = dayjs(date).startOf('month')
  showDatePicker.value = false
}

const closeDatePicker = () => {
  showDatePicker.value = false
}

const handleDocumentClick = (event) => {
  if (!showDatePicker.value || !datePickerRef.value) return
  if (!datePickerRef.value.contains(event.target)) {
    closeDatePicker()
  }
}

const handleEscapeKey = (event) => {
  if (event.key === 'Escape') {
    closeDatePicker()
  }
}

// List view
const filteredEvents = computed(() => {
  let result = [...events.value]
  
  if (typeFilter.value) {
    result = result.filter(e => e.event_type === typeFilter.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(e => 
      String(e.event_name || '').toLowerCase().includes(query) ||
      String(e.location || '').toLowerCase().includes(query) ||
      String(e.description || '').toLowerCase().includes(query)
    )
  }
  
  return result.sort((a, b) => {
    return compareScheduleEvents(a, b)
  })
})

// Event management
const openAddModal = (date) => {
  modalMode.value = 'add'
  error.value = null
  currentEvent.value = {
    event_name: '',
    event_date: date || dayjs().format('YYYY-MM-DD'),
    event_time: '18:00',
    event_type: 'practice',
    location: '',
    description: ''
  }
  showEventModal.value = true
}

const selectEvent = (event) => {
  selectedEvent.value = event
}

const closeModal = () => {
  showEventModal.value = false
}

const hasTimeConflict = (date, time, excludeId = null) => {
  return events.value.some(e => {
    if (excludeId && e.id === excludeId) return false
    return e.event_date === date && e.event_time === time
  })
}

const addEvent = async () => {
  if (hasTimeConflict(currentEvent.value.event_date, currentEvent.value.event_time)) {
    error.value = scheduleCopy.value.timeConflict
    return
  }
  try {
    const res = await axios.post(`/api/teams/${teamId.value}/schedule`, currentEvent.value)
    events.value.push(res.data)
    closeModal()
    error.value = null
    quickAddText.value = ''
  } catch (err) {
    console.error(err)
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = scheduleCopy.value.addError
    }
  }
}

const startEdit = (event) => {
  modalMode.value = 'edit'
  error.value = null
  currentEvent.value = { ...event }
  selectedEvent.value = null
  showEventModal.value = true
}

const saveEdit = async () => {
  if (hasTimeConflict(currentEvent.value.event_date, currentEvent.value.event_time, currentEvent.value.id)) {
    error.value = scheduleCopy.value.timeConflict
    return
  }
  try {
    const res = await axios.put(
      `/api/teams/${teamId.value}/schedule/${currentEvent.value.id}`,
      currentEvent.value
    )
    const index = events.value.findIndex(e => e.id === currentEvent.value.id)
    if (index !== -1) {
      events.value[index] = { ...currentEvent.value }
    }
    closeModal()
    error.value = null
  } catch (err) {
    console.error(err)
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = scheduleCopy.value.editError
    }
  }
}

const deleteEvent = async (event) => {
  if (!confirm(scheduleCopy.value.deleteConfirm)) return
  
  try {
    await axios.delete(`/api/teams/${teamId.value}/schedule/${event.id}`)
    events.value = events.value.filter(e => e.id !== event.id)
    if (selectedEvent.value && selectedEvent.value.id === event.id) {
      selectedEvent.value = null
    }
  } catch (err) {
    console.error(err)
    error.value = scheduleCopy.value.deleteError
  }
}

// Quick add (simple parsing)
const parseAndAddEvent = () => {
  const text = quickAddText.value.toLowerCase()
  const event = {
    event_name: quickAddText.value.split(' ')[0], // Pirmais vārds kā nosaukums
    event_date: dayjs().format('YYYY-MM-DD'), // Noklusējums - šodien
    event_time: '18:00', // Noklusējums
    event_type: text.includes('game') ? 'game' : 'practice',
    location: scheduleCopy.value.defaultLocation,
    description: ''
  }

  // Simple date parsing
  if (text.includes('tomorrow')) {
    event.event_date = dayjs().add(1, 'day').format('YYYY-MM-DD')
  } else if (text.includes('day after tomorrow')) {
    event.event_date = dayjs().add(2, 'day').format('YYYY-MM-DD')
  }

  // Time parsing
  const timeMatch = text.match(/(\d{1,2}):?(\d{2})?/)
  if (timeMatch) {
    event.event_time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`
  }

  currentEvent.value = event
  addEvent()
}

// Attendance status (placeholder)
const getAttendanceStatus = (playerId) => {
  const statuses = [scheduleCopy.value.confirmed, scheduleCopy.value.notConfirmed, scheduleCopy.value.declined]
  return statuses[Math.floor(Math.random() * statuses.length)]
}

const showStats = ref(false)
const attendanceStats = ref([])
const statsSearchQuery = ref('')
const eventAttendanceList = ref([])

// Decline modal
const showDeclineModal = ref(false)
const declineReason = ref('')

// Current user's attendance for selected event
const myAttendanceStatus = ref(null)
const myAttendanceNotes = ref('')

const gameLineupList = ref([])
const lineupEditIds = ref([])
const lineupSaving = ref(false)
const lineupMessage = ref('')

const getEventDateTime = (event) => {
  if (!event?.event_date) return null
  return dayjs(`${event.event_date} ${event.event_time || '23:59'}`)
}

const isPracticeEvent = (event) => String(event?.event_type || '').toLowerCase() === 'practice'
const isGameEvent = (event) => String(event?.event_type || '').toLowerCase() === 'game'

const declineModalTitle = computed(() =>
  isGameEvent(selectedEvent.value) ? t('schedule.whyCantPlay') : t('schedule.whyCantAttend')
)

const declineModalPlaceholder = computed(() =>
  isGameEvent(selectedEvent.value) ? t('schedule.describeGameReason') : t('schedule.describeReason')
)

// Check if event is upcoming (can still RSVP)
const isEventUpcoming = (event) => {
  const eventDateTime = getEventDateTime(event)
  return eventDateTime?.isValid() && eventDateTime.isAfter(dayjs())
}

// Get initials
const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Get event icon
const getEventIcon = (type) => {
  const icons = {
    practice: '',
    game: '',
    meeting: '',
    other: ''
  }
  return icons[type] || icons.other
}

// Get event type label
const getEventTypeLabel = (type) => {
  const labels = {
    practice: scheduleCopy.value.eventTypes.practice,
    game: scheduleCopy.value.eventTypes.game,
    meeting: scheduleCopy.value.eventTypes.meeting,
    other: scheduleCopy.value.eventTypes.other
  }
  return labels[type] || labels.other
}

// Get time until event
const getTimeUntilEvent = (event) => {
  const eventDateTime = getEventDateTime(event)
  if (!eventDateTime?.isValid()) return ''

  const now = dayjs()
  const diffDays = eventDateTime.diff(now, 'day')
  const diffHours = eventDateTime.diff(now, 'hour') % 24
  
  if (diffDays > 0) {
    return `${diffDays} ${scheduleCopy.value.day(diffDays)}`
  } else if (diffHours > 0) {
    return `${diffHours} ${scheduleCopy.value.hour(diffHours)}`
  } else {
    const diffMinutes = eventDateTime.diff(now, 'minute')
    return `${diffMinutes} ${scheduleCopy.value.minute(diffMinutes)}`
  }
}

// Status display text
const getStatusDisplayText = (status) => {
  const texts = {
    present: t('schedule.willAttend'),
    absent: t('schedule.cantMakeIt'),
    excused: t('schedule.excused'),
    late: t('schedule.willBeLate'),
    unmarked: t('schedule.noResponse')
  }
  return texts[status] || texts.unmarked
}

// Get status icon
const getStatusIcon = (status) => {
  const icons = {
    present: '✓',
    absent: '✗',
    excused: '✗',
    late: '⏰',
    unmarked: '?'
  }
  return icons[status] || icons.unmarked
}

// Get attendance percentage for the bar
const getAttendancePercent = (type) => {
  const total = eventAttendanceList.value.length
  if (total === 0) return 0
  
  let count = 0
  if (type === 'present') {
    count = attendanceSummary.value.present
  } else if (type === 'absent') {
    count = attendanceSummary.value.absent
  } else {
    count = attendanceSummary.value.unmarked
  }
  
  return Math.round((count / total) * 100)
}

// Fetch attendance for selected event
const fetchEventAttendance = async (eventId) => {
  if (!eventId) return
  
  try {
    const res = await axios.get(`/api/teams/${teamId.value}/events/${eventId}/attendance/full`)
    eventAttendanceList.value = res.data
    
    // Find current user's attendance
    const myAttendance = res.data.find(a => a.user_id === auth.user?.id)
    myAttendanceStatus.value = myAttendance?.status || null
    myAttendanceNotes.value = myAttendance?.notes || ''
  } catch (err) {
    console.error('Error fetching event attendance:', err)
  }
}

// Attendance summary for coaches
const attendanceSummary = computed(() => {
  const present = eventAttendanceList.value.filter(a => a.status === 'present').length
  const absent = eventAttendanceList.value.filter(a => a.status === 'absent' || a.status === 'excused').length
  const unmarked = eventAttendanceList.value.filter(a => !a.status || a.status === 'unmarked').length
  return { present, absent, unmarked }
})

const getAttendanceSortGroup = (status) => {
  if (status === 'present') return 0
  if (status === 'absent' || status === 'excused') return 1
  return 2
}

const sortedEventAttendanceList = computed(() =>
  [...eventAttendanceList.value].sort((a, b) => {
    const groupDiff = getAttendanceSortGroup(a.status) - getAttendanceSortGroup(b.status)

    if (groupDiff !== 0) {
      return groupDiff
    }

    return String(a.username || '').localeCompare(String(b.username || ''))
  })
)

const selectedLineupPlayers = computed(() =>
  gameLineupList.value.filter((player) => Number(player.in_lineup) === 1)
)

const selectedLineupEntry = computed(() =>
  selectedLineupPlayers.value.find((player) => Number(player.user_id) === Number(auth.user?.id)) || null
)

const lineupSummary = computed(() => {
  const confirmed = selectedLineupPlayers.value.filter((player) => player.status === 'confirmed').length
  const declined = selectedLineupPlayers.value.filter((player) => player.status === 'declined').length
  const pending = selectedLineupPlayers.value.filter((player) => !player.status || player.status === 'selected').length

  return { confirmed, declined, pending }
})

const getLineupSortGroup = (status) => {
  if (status === 'confirmed') return 0
  if (status === 'declined') return 1
  return 2
}

const sortedSelectedLineupPlayers = computed(() =>
  [...selectedLineupPlayers.value].sort((a, b) => {
    const groupDiff = getLineupSortGroup(a.status) - getLineupSortGroup(b.status)

    if (groupDiff !== 0) {
      return groupDiff
    }

    return String(a.username || '').localeCompare(String(b.username || ''))
  })
)

const isPlayerInLineupDraft = (playerId) =>
  lineupEditIds.value.some((id) => Number(id) === Number(playerId))

const toggleLineupDraft = (playerId) => {
  if (isPlayerInLineupDraft(playerId)) {
    lineupEditIds.value = lineupEditIds.value.filter((id) => Number(id) !== Number(playerId))
    return
  }

  lineupEditIds.value = [...lineupEditIds.value, playerId]
}

const getLineupPercent = (type) => {
  const total = selectedLineupPlayers.value.length
  if (total === 0) return 0

  const count = type === 'confirmed'
    ? lineupSummary.value.confirmed
    : type === 'declined'
      ? lineupSummary.value.declined
      : lineupSummary.value.pending

  return Math.round((count / total) * 100)
}

const getLineupStatusText = (status) => {
  const texts = {
    confirmed: t('schedule.lineupConfirmed'),
    declined: t('schedule.lineupDeclined'),
    selected: t('schedule.awaitingResponse')
  }

  return texts[status] || texts.selected
}

const getLineupStatusIcon = (status) => {
  const icons = {
    confirmed: '✓',
    declined: '×',
    selected: '?'
  }

  return icons[status] || icons.selected
}

const fetchGameLineup = async (eventId) => {
  if (!eventId) return

  try {
    const res = await axios.get(`/api/teams/${teamId.value}/events/${eventId}/lineup/full`)
    const players = Array.isArray(res.data) ? res.data : []
    const savedIds = players
      .filter((player) => Number(player.in_lineup) === 1)
      .map((player) => player.user_id)

    gameLineupList.value = players
    lineupMessage.value = ''

    if (savedIds.length) {
      lineupEditIds.value = savedIds
      return
    }

    const suggestedRes = await axios.get(`/api/teams/${teamId.value}/events/${eventId}/lineup/suggested`)
    const playerIds = Array.isArray(suggestedRes.data?.playerIds) ? suggestedRes.data.playerIds : []
    const availableIds = new Set(players.map((player) => Number(player.user_id)))
    lineupEditIds.value = playerIds.filter((id) => availableIds.has(Number(id)))

    if (lineupEditIds.value.length) {
      lineupMessage.value = t('schedule.previousLineupLoaded')
    }
  } catch (err) {
    console.error('Error fetching game lineup:', err)
  }
}

const saveGameLineup = async () => {
  if (!selectedEvent.value || !isGameEvent(selectedEvent.value)) return

  lineupSaving.value = true
  lineupMessage.value = ''

  try {
    const res = await axios.post(`/api/teams/${teamId.value}/events/${selectedEvent.value.id}/lineup/bulk`, {
      playerIds: lineupEditIds.value
    })
    gameLineupList.value = Array.isArray(res.data?.players) ? res.data.players : gameLineupList.value
    lineupEditIds.value = selectedLineupPlayers.value.map((player) => player.user_id)
    lineupMessage.value = t('schedule.lineupSaved')
  } catch (err) {
    console.error('Error saving game lineup:', err)
    lineupMessage.value = err.response?.data?.error || t('schedule.lineupSaveError')
  } finally {
    lineupSaving.value = false
  }
}

const setMyLineupResponse = async (status, notes = null) => {
  if (!selectedEvent.value || !isGameEvent(selectedEvent.value)) return

  try {
    await axios.post(`/api/teams/${teamId.value}/events/${selectedEvent.value.id}/lineup/response`, {
      user_id: auth.user.id,
      status,
      notes
    })
    await fetchGameLineup(selectedEvent.value.id)
  } catch (err) {
    console.error('Error setting lineup response:', err)
  }
}

// Set my attendance (for players)
const setMyAttendance = async (status) => {
  if (!selectedEvent.value) return
  
  try {
    await axios.post(`/api/teams/${teamId.value}/events/${selectedEvent.value.id}/attendance`, {
      user_id: auth.user.id,
      status: status,
      notes: null
    })
    myAttendanceStatus.value = status
    myAttendanceNotes.value = ''
    await fetchEventAttendance(selectedEvent.value.id)
  } catch (err) {
    console.error('Error setting attendance:', err)
  }
}

// Open decline modal
const openDeclineModal = () => {
  declineReason.value = ''
  showDeclineModal.value = true
}

// Submit decline
const submitDecline = async () => {
  if (!selectedEvent.value || !declineReason.value.trim()) return
  
  const notes = declineReason.value.trim()

  if (isGameEvent(selectedEvent.value)) {
    await setMyLineupResponse('declined', notes)
    showDeclineModal.value = false
    declineReason.value = ''
    return
  }
  
  try {
    await axios.post(`/api/teams/${teamId.value}/events/${selectedEvent.value.id}/attendance`, {
      user_id: auth.user.id,
      status: 'excused',
      notes: notes
    })
    myAttendanceStatus.value = 'excused'
    myAttendanceNotes.value = notes
    showDeclineModal.value = false
    await fetchEventAttendance(selectedEvent.value.id)
  } catch (err) {
    console.error('Error setting attendance:', err)
  }
}

// Fetch team attendance stats (practices only)
const fetchAttendanceStats = async () => {
  try {
    const res = await axios.get(`/api/teams/${teamId.value}/attendance/stats`)
    attendanceStats.value = res.data
  } catch (err) {
    console.error('Kļūda, ielādējot apmeklējuma statistiku:', err)
  }
}

// Watch for selected event changes
watch(selectedEvent, (newEvent) => {
  if (newEvent) {
    if (isPracticeEvent(newEvent)) {
      fetchEventAttendance(newEvent.id)
    } else {
      eventAttendanceList.value = []
      myAttendanceStatus.value = null
      myAttendanceNotes.value = ''
    }

    if (isGameEvent(newEvent)) {
      fetchGameLineup(newEvent.id)
    } else {
      gameLineupList.value = []
      lineupEditIds.value = []
      lineupMessage.value = ''
    }
  }
})

watch(viewMode, (mode) => {
  if (mode !== 'week') {
    closeDatePicker()
  }
})

// Load attendance data
const fetchAttendances = async () => {
  await fetchAttendanceStats()
}

// Check if player is attending event
const isPlayerAttending = (playerId, eventId) => {
  return eventAttendanceList.value.some(a => 
    a.user_id === playerId && a.status === 'present'
  )
}

// Toggle attendance status
const toggleAttendance = async (playerId, eventId) => {
  const isAttending = isPlayerAttending(playerId, eventId)
  
  try {
    await axios.post(`/api/teams/${teamId.value}/events/${eventId}/attendance`, {
      user_id: playerId,
      status: isAttending ? 'absent' : 'present',
      notes: null
    })
    await fetchEventAttendance(eventId)
  } catch (err) {
    console.error('Error updating attendance:', err)
  }
}

// Statistikas metodes
const totalPracticesCount = computed(() => 
  events.value.filter(e => e.event_type === 'practice').length
)

const sortedAttendanceStats = computed(() =>
  [...attendanceStats.value].sort((a, b) => {
    const rateDiff = (Number(b.attendance_rate) || 0) - (Number(a.attendance_rate) || 0)

    if (rateDiff !== 0) {
      return rateDiff
    }

    const presentDiff = (Number(b.present_count) || 0) - (Number(a.present_count) || 0)

    if (presentDiff !== 0) {
      return presentDiff
    }

    return String(a.username || '').localeCompare(String(b.username || ''))
  })
)

const filteredAttendanceStats = computed(() => {
  const query = statsSearchQuery.value.trim().toLowerCase()

  if (!query) {
    return sortedAttendanceStats.value
  }

  return sortedAttendanceStats.value.filter((stat) =>
    String(stat.username || '').toLowerCase().includes(query)
  )
})

const getUnmarkedStatsCount = (stat) => {
  if (stat.unmarked_count !== undefined && stat.unmarked_count !== null) {
    return Number(stat.unmarked_count) || 0
  }

  const total = Number(stat.total_practices) || 0
  const marked = (
    (Number(stat.present_count) || 0) +
    (Number(stat.absent_count) || 0) +
    (Number(stat.late_count) || 0)
  )

  return Math.max(total - marked, 0)
}

const averageAttendanceRate = computed(() => {
  if (!attendanceStats.value.length) {
    return 0
  }

  const totalRate = attendanceStats.value.reduce(
    (sum, stat) => sum + (Number(stat.attendance_rate) || 0),
    0
  )

  return Math.round(totalRate / attendanceStats.value.length)
})

const bestAttendanceRate = computed(() =>
  attendanceStats.value.reduce((max, stat) => Math.max(max, Number(stat.attendance_rate) || 0), 0)
)

const closeStatsModal = () => {
  showStats.value = false
  statsSearchQuery.value = ''
}

// Update mounted to load attendance
onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscapeKey)
  await fetchData()
  await fetchAttendances()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscapeKey)
})

</script>

<style scoped>
/* ==================== LAYOUT ==================== */
.schedule-page {
  --page-bg: var(--background-color);
  --page-surface: var(--card-bg);
  --page-border: var(--border-color);
  --page-text: var(--text-color);
  --page-muted: var(--text-secondary);
  --page-accent: #0b72e7;
  --page-accent-soft: rgba(11, 114, 231, 0.14);
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 20%),
    var(--page-bg);
  color: var(--page-text);
}

.dark-mode .schedule-page {
  --page-accent: #6fb2ff;
  --page-accent-soft: rgba(74, 144, 226, 0.22);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.2), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    var(--page-bg);
}

.schedule-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ==================== HEADER ==================== */
.schedule-hero,
.stats-card,
.schedule-surface {
  background: var(--page-surface);
  border: 1px solid var(--page-border);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.schedule-hero {
  display: grid;
  grid-template-columns: 1.2fr 320px;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-radius: 28px;
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 65%), var(--page-surface);
}

.hero-main {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.header-eyebrow,
.summary-label,
.stats-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
  color: var(--page-muted);
  margin: 0;
}

.header-left h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.5vw, 2.5rem);
  font-weight: 700;
  color: var(--page-text);
}

.header-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--page-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: flex-start;
  flex: 0 0 auto;
}

.header-btn {
  padding: 5px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 0 0 auto;
}

.stats-btn {
  margin-right: 0;
}



.stats-btn {
  background: rgba(11, 114, 231, 0.08);
  color: var(--page-accent);
  border-color: rgba(11, 114, 231, 0.18);
}

.stats-btn:hover {
  background: rgba(11, 114, 231, 0.14);
}

.add-btn {
  background: linear-gradient(135deg, #0b72e7 0%, #0f4dbf 100%);
  color: white;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(11, 114, 231, 0.28);
}

.hero-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.view-toggle {
  display: flex;
  background: rgba(127, 127, 127, 0.08);
  border-radius: 999px;
  padding: 2px;
  flex: 0 0 auto;
}

.view-toggle button {
  padding: 4px 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  color: var(--page-muted);
  display: flex;
  align-items: center;
  transition: all 0.2s;
  font-size: 11px;
}

.view-toggle button.active {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.team-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.team-nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.95rem;
  border-radius: 999px;
  border: 1px solid var(--page-border);
  background: var(--page-surface);
  color: var(--page-muted);
  text-decoration: none;
  font-weight: 700;
}

.team-nav-link.active {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-summary-card {
  border: 1px solid var(--page-border);
  border-radius: 22px;
  padding: 1rem 1.1rem;
  background: var(--page-surface);
}

.hero-summary-card.soft {
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 70%), var(--page-surface);
}

.hero-summary-card strong {
  display: block;
  margin: 0.35rem 0;
  font-size: 1.1rem;
}

.hero-summary-card p {
  margin: 0;
  color: var(--page-muted);
}

.schedule-stats-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stats-card {
  border-radius: 22px;
  padding: 1.15rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stats-card strong {
  font-size: 2rem;
  line-height: 1;
}

.stats-card small {
  color: var(--page-muted);
}

.schedule-surface {
  margin-top: 1rem;
  border-radius: 26px;
  padding: 1.25rem;
}

/* ==================== WEEK VIEW ==================== */
.week-view {
  margin-top: 4px;
}

.week-navigation {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.week-navigation-main {
  display: flex;
  align-items: center;
  gap: 20px;
  grid-column: 2;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(127, 127, 127, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--page-muted);
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.week-title {
  position: relative;
  display: flex;
  justify-content: center;
}

.week-title-btn {
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: color 0.2s;
}

.week-title-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--page-text);
}

.week-title-btn:hover .week-title-text,
.week-title-btn.active .week-title-text {
  color: var(--page-accent);
}

.week-title-caret {
  color: var(--page-muted);
  transition: transform 0.2s, color 0.2s;
}

.week-title-btn.active .week-title-caret {
  color: var(--page-accent);
  transform: rotate(180deg);
}

.date-picker-popover {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--page-border);
  background: var(--page-surface);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
  z-index: 30;
}

.date-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.date-picker-month {
  font-size: 20px;
  font-weight: 600;
  color: var(--page-text);
  text-align: center;
}

.date-picker-nav-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--page-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.date-picker-nav-btn:hover {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.date-picker-weekdays,
.date-picker-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.date-picker-weekdays {
  gap: 8px;
  margin-bottom: 12px;
}

.date-picker-weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--page-muted);
}

.date-picker-grid {
  gap: 6px;
}

.date-picker-day {
  aspect-ratio: 1;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--page-text);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.date-picker-day:hover {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.date-picker-day.outside-month {
  color: var(--page-muted);
  opacity: 0.7;
}

.date-picker-day.today {
  box-shadow: 0 0 0 1.5px rgba(11, 114, 231, 0.35);
}

.date-picker-day.selected {
  background: var(--page-accent);
  color: white;
  box-shadow: none;
}

.date-picker-day.selected:hover {
  color: white;
}

.today-btn {
  grid-column: 3;
  justify-self: end;
  padding: 4px 12px;
  border: 1.5px solid var(--page-accent);
  border-radius: 6px;
  background: transparent;
  color: var(--page-accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.today-btn:hover {
  background: var(--page-accent);
  color: white;
}

.today-btn:disabled {
  border-color: rgba(127, 127, 127, 0.24);
  color: var(--page-muted);
  cursor: default;
  background: rgba(127, 127, 127, 0.08);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  min-height: 65vh;
}

.day-column {
  background: var(--page-surface);
  border-radius: 14px;
  border: 1px solid var(--page-border);
  overflow: hidden;
  transition: all 0.2s;
}

.day-column.today {
  border-color: var(--page-accent);
  box-shadow: 0 0 0 1px var(--page-accent);
}

.day-column.has-events {
  background: linear-gradient(180deg, rgba(11, 114, 231, 0.04), transparent 30%), var(--page-surface);
}

.day-header {
  padding: 12px 10px;
  text-align: center;
  border-bottom: 1px solid rgba(127, 127, 127, 0.12);
}

.day-name {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.day-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--page-text);
}

.day-number.today-number {
  width: 36px;
  height: 36px;
  line-height: 36px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--page-accent);
  color: white;
}

.day-events {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Event cards in week view */
.event-card {
  display: flex;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  background: white;
  border: 1px solid #f0f0f0;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.event-card.past-event {
  opacity: 0.5;
}

.event-color-bar {
  width: 4px;
  flex-shrink: 0;
}

.event-card.practice .event-color-bar { background: #10b981; }
.event-card.game .event-color-bar { background: #3b82f6; }
.event-card.meeting .event-color-bar { background: #f59e0b; }
.event-card.other .event-color-bar { background: #8b5cf6; }

.event-card-body {
  padding: 8px 10px;
  min-width: 0;
  flex: 1;
}

.event-card-time {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 2px;
}

.event-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-card-location {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-event-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 8px;
  border: 1.5px dashed #e5e7eb;
  color: #d1d5db;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-event-cell:hover {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.04);
}

/* ==================== LIST VIEW ==================== */
.list-view {
  margin-top: 4px;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-chips {
  display: flex;
  gap: 8px;
}

.filter-chip {
  padding: 7px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.filter-chip.active.practice { border-color: #10b981; background: #ecfdf5; color: #065f46; }
.filter-chip.active.game { border-color: #3b82f6; background: #eff6ff; color: #1e40af; }
.filter-chip.active.meeting { border-color: #f59e0b; background: #fffbeb; color: #92400e; }

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  background: var(--card-bg, white);
  min-width: 220px;
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: #667eea;
}

.search-box svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-box input {
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: var(--text-color);
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.date-group-label {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 20px 0 8px;
  padding-left: 4px;
}

.date-group-label:first-child {
  margin-top: 0;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-event-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: var(--card-bg, white);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s;
}

.list-event-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.list-event-card.past-event {
  opacity: 0.5;
}

.list-event-color {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.list-event-card.practice .list-event-color { background: #10b981; }
.list-event-card.game .list-event-color { background: #3b82f6; }
.list-event-card.meeting .list-event-color { background: #f59e0b; }
.list-event-card.other .list-event-color { background: #8b5cf6; }

.list-event-time {
  min-width: 50px;
  text-align: center;
}

.time-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-color);
}

.list-event-info {
  flex: 1;
  min-width: 0;
}

.list-event-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 2px;
}

.list-event-meta {
  font-size: 13px;
  color: #9ca3af;
}

.list-event-badge {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.list-event-badge.practice { background: #ecfdf5; color: #065f46; }
.list-event-badge.game { background: #eff6ff; color: #1e40af; }
.list-event-badge.meeting { background: #fffbeb; color: #92400e; }
.list-event-badge.other { background: #f5f3ff; color: #5b21b6; }

.list-event-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.list-event-card:hover .list-event-actions {
  opacity: 1;
}

.action-icon {
  width: 32px;
  height: 32px;
  border: 1px solid #d8dee8;
  background: #ffffff;
  border-radius: 8px;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s;
}

.action-icon:hover {
  background: #eef4ff;
  border-color: #b8c8e3;
  color: #0b72e7;
  transform: translateY(-1px);
}

.action-icon.delete {
  color: #b91c1c;
}

.action-icon.delete:hover {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #dc2626;
}

.action-svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ==================== ADD/EDIT MODAL ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-content {
  background: var(--card-bg, white);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: min(90vh, 760px);
  overflow-y: auto;
  padding: 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.25s ease;
}

.modal-content h3 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
}

.modal-error {
  background: #fee2e2;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 14px;
  border: 1px solid #fca5a5;
}

.dark-mode .modal-error {
  background: rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.3);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.form-row input,
.form-row select,
.form-row textarea {
  padding: 10px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-color);
  background: var(--card-bg, white);
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-row input:focus,
.form-row select:focus,
.form-row textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-row textarea {
  min-height: 104px;
  line-height: 1.5;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.form-actions button {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid;
}

.form-actions button:first-child {
  background: transparent;
  border-color: #d1d5db;
  color: #6b7280;
}

.form-actions button:first-child:hover {
  background: #f3f4f6;
}

.form-actions .save {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.form-actions .save:hover {
  background: #5a6fd6;
}

/* ==================== EVENT DETAIL OVERLAY ==================== */
.event-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.15s ease;
}

.event-detail-content {
  background: var(--card-bg, white);
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  animation: slideUp 0.3s ease;
  border-top: 4px solid #6366f1;
}

.event-detail-content.practice { border-top-color: #10b981; }
.event-detail-content.game { border-top-color: #3b82f6; }
.event-detail-content.meeting { border-top-color: #f59e0b; }
.event-detail-content.other { border-top-color: #8b5cf6; }

.close-detail {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #f3f4f6;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.close-detail:hover {
  background: #e5e7eb;
  color: #374151;
  transform: rotate(90deg);
}

.event-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin: 20px 24px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.event-type-badge.practice { background: #d1fae5; color: #065f46; }
.event-type-badge.game { background: #dbeafe; color: #1e40af; }
.event-type-badge.meeting { background: #fef3c7; color: #92400e; }
.event-type-badge.other { background: #ede9fe; color: #5b21b6; }

.type-icon { font-size: 14px; }

.event-detail-main {
  padding: 16px 24px 20px;
}

.event-detail-main .event-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color, #111827);
  margin: 0 0 20px;
  line-height: 1.2;
}

.event-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.event-description {
  margin-top: 12px;
  padding: 14px;
  background: #f9fafb;
  border-radius: 12px;
  color: var(--text-color, #111827);
}

.event-description p {
  margin: 6px 0 0;
  color: var(--text-color, #111827);
  line-height: 1.6;
  white-space: pre-wrap;
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.meta-item.full-width {
  grid-column: 1 / -1;
}

.meta-icon {
  font-size: 18px;
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.meta-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 600;
}

.meta-value {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.event-countdown {
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
}

.event-countdown.past {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  justify-content: center;
}

.countdown-label {
  font-size: 13px;
  opacity: 0.9;
}

.countdown-value {
  font-size: 18px;
  font-weight: 700;
}

/* ==================== ATTENDANCE ==================== */
.attendance-section {
  padding: 20px 24px;
  border-top: 1px solid #f3f4f6;
}

.attendance-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.attendance-choice {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.attend-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  background: var(--card-bg, white);
  cursor: pointer;
  transition: all 0.2s;
}

.attend-btn .btn-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  transition: all 0.2s;
}

.attend-btn .btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.attend-btn.yes:hover, .attend-btn.yes.active {
  border-color: #10b981;
  background: #ecfdf5;
}

.attend-btn.yes:hover .btn-icon, .attend-btn.yes.active .btn-icon {
  background: #10b981;
  color: white;
}

.attend-btn.yes.active .btn-text { color: #065f46; }

.attend-btn.no:hover, .attend-btn.no.active {
  border-color: #ef4444;
  background: #fef2f2;
}

.attend-btn.no:hover .btn-icon, .attend-btn.no.active .btn-icon {
  background: #ef4444;
  color: white;
}

.attend-btn.no.active .btn-text { color: #991b1b; }

.my-reason-card {
  margin-top: 12px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #92400e;
}

.attendance-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
}

.attendance-result.present { background: #ecfdf5; color: #065f46; }
.attendance-result.absent, .attendance-result.excused { background: #fef2f2; color: #991b1b; }
.attendance-result.unmarked { background: #f3f4f6; color: #6b7280; }
.attendance-result.confirmed { background: #ecfdf5; color: #065f46; }
.attendance-result.declined { background: #fef2f2; color: #991b1b; }
.attendance-result.selected { background: #f3f4f6; color: #6b7280; }

.result-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

/* Coach attendance bar */
.attendance-stats-bar {
  display: flex;
  height: 28px;
  border-radius: 14px;
  overflow: hidden;
  background: #f3f4f6;
  margin-bottom: 12px;
}

.stat-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  transition: width 0.3s ease;
  min-width: 0;
}

.stat-segment.yes { background: linear-gradient(135deg, #10b981, #059669); }
.stat-segment.no { background: linear-gradient(135deg, #ef4444, #dc2626); }
.stat-segment.pending { background: linear-gradient(135deg, #9ca3af, #6b7280); }

.stats-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.legend-item { font-size: 12px; color: #6b7280; }
.legend-item.yes { color: #059669; }
.legend-item.no { color: #dc2626; }

.attendees-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.attendee-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 10px;
  border-left: 3px solid #e5e7eb;
}

.attendee-card.present { border-left-color: #10b981; }
.attendee-card.absent, .attendee-card.excused { border-left-color: #ef4444; }
.attendee-card.unmarked { border-left-color: #9ca3af; }
.attendee-card.confirmed { border-left-color: #10b981; }
.attendee-card.declined { border-left-color: #ef4444; }
.attendee-card.selected { border-left-color: #9ca3af; }

.attendee-card .attendee-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.attendee-details { min-width: 0; }

.attendee-card .attendee-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color, #111827);
}

.attendee-status {
  font-size: 12px;
  color: #6b7280;
}

.status-indicator {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.status-indicator.present { background: #d1fae5; color: #065f46; }
.status-indicator.absent, .status-indicator.excused { background: #fee2e2; color: #991b1b; }
.status-indicator.unmarked { background: #f3f4f6; color: #6b7280; }
.status-indicator.confirmed { background: #d1fae5; color: #065f46; }
.status-indicator.declined { background: #fee2e2; color: #991b1b; }
.status-indicator.selected { background: #f3f4f6; color: #6b7280; }

.lineup-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lineup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.lineup-header h3 {
  margin-bottom: 4px;
}

.lineup-header p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.lineup-save-btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  background: #0b72e7;
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.lineup-save-btn:hover {
  background: #095bb8;
}

.lineup-save-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.lineup-message,
.lineup-empty-note {
  padding: 12px 14px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
}

.lineup-builder {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
}

.lineup-player-toggle {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.lineup-player-toggle.selected {
  border-color: #0b72e7;
  background: #eff6ff;
}

.lineup-player-toggle input {
  width: 16px;
  height: 16px;
  accent-color: #0b72e7;
}

.lineup-player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #0b72e7, #10b981);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.lineup-player-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #111827);
}

.lineup-responses {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attendee-note {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #6b7280;
  padding: 6px 10px;
  background: white;
  border-radius: 6px;
  font-style: italic;
}

/* Event detail actions */
.event-detail-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid #f3f4f6;
}

.event-detail-actions button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn { background: #f3f4f6; color: #374151; }
.edit-btn:hover { background: #e5e7eb; }
.delete-btn { background: #fef2f2; color: #dc2626; }
.delete-btn:hover { background: #fee2e2; }

/* ==================== DECLINE MODAL ==================== */
.decline-modal {
  max-width: 450px;
}

.decline-modal h3 {
  margin-bottom: 20px;
  font-size: 1.1rem;
}

.decline-modal textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  resize: vertical;
  margin-bottom: 15px;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-color, #333);
  background: var(--card-bg, #fff);
}

.decline-modal textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid;
}

.modal-btn.cancel-btn {
  background: transparent;
  border-color: #d1d5db;
  color: #6b7280;
}

.modal-btn.cancel-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.modal-btn.confirm-btn {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.modal-btn.confirm-btn:hover {
  background: #5a6fd6;
}

.modal-btn.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== STATS MODAL ==================== */
.stats-modal {
  width: min(960px, calc(100vw - 32px));
  max-width: 960px;
  max-height: min(88vh, 860px);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.stats-modal h3 {
  margin: 0;
}

.stats-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.stats-modal-copy {
  min-width: 0;
}

.stats-modal-subtitle {
  margin: 6px 0 0;
  color: var(--page-muted);
  font-size: 13px;
}

.stats-modal-close {
  width: 38px;
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #f8fafc;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.stats-modal-close:hover {
  background: #eef2f7;
  color: #111827;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stats-overview-card {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.stats-overview-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--page-muted);
}

.stats-overview-value {
  display: block;
  margin-top: 8px;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--page-text);
}

.stats-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.stats-search {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: var(--page-muted);
}

.stats-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--page-text);
}

.stats-search input::placeholder {
  color: var(--page-muted);
}

.stats-toolbar-note {
  font-size: 13px;
  color: var(--page-muted);
  white-space: nowrap;
}

.stats-table-shell {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: auto;
  max-height: min(58vh, 560px);
  background: var(--card-bg, white);
}

.stats-table {
  width: 100%;
  min-width: 780px;
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.stats-table th,
.stats-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.stats-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
}

.stats-table th:nth-child(1),
.stats-table td:nth-child(1) {
  width: 40%;
}

.stats-table th:nth-child(2),
.stats-table th:nth-child(3),
.stats-table th:nth-child(4),
.stats-table td:nth-child(2),
.stats-table td:nth-child(3),
.stats-table td:nth-child(4) {
  width: 12%;
  text-align: center;
}

.stats-table th:nth-child(5),
.stats-table td:nth-child(5) {
  width: 24%;
}

.stats-table tbody tr:hover td {
  background: rgba(11, 114, 231, 0.03);
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.player-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
}

.person-avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.player-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-weight: 600;
  color: var(--page-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-meta {
  color: var(--page-muted);
  font-size: 12px;
}

.stats-number {
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-present { color: #059669; }
.stat-absent { color: #dc2626; }
.stat-unmarked { color: var(--page-muted); }

.rate-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.rate-track {
  flex: 1;
  min-width: 80px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.rate-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: inherit;
  transition: width 0.3s;
}

.rate-value {
  font-weight: 600;
  font-size: 13px;
  min-width: 42px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.stats-empty {
  border-radius: 16px;
  border: 1px dashed #d1d5db;
  background: #f8fafc;
  padding: 28px 20px;
  text-align: center;
  color: var(--page-muted);
}

.stats-modal-actions {
  margin-top: auto;
}

/* ==================== DARK MODE ==================== */
.dark-mode .schedule-header { border-bottom-color: #2d2d2d; }

.dark-mode .header-btn.stats-btn {
  background: #2d2d2d;
  color: #e5e7eb;
}

.dark-mode .header-btn.stats-btn:hover {
  background: #3d3d3d;
}

.dark-mode .view-toggle {
  background: #2d2d2d;
}

.dark-mode .view-toggle button {
  color: #6b7280;
}

.dark-mode .view-toggle button.active {
  background: #3d3d3d;
  color: #f0f0f0;
  box-shadow: none;
}

.dark-mode .nav-btn {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .nav-btn:hover {
  background: #3d3d3d;
}

.dark-mode .week-title-text {
  color: #f0f0f0;
}

.dark-mode .date-picker-popover {
  background: #1e1e1e;
  border-color: #2d2d2d;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.dark-mode .date-picker-nav-btn {
  color: #f0f0f0;
}

.dark-mode .date-picker-nav-btn:hover {
  background: #2d2d2d;
}

.dark-mode .date-picker-day.today {
  box-shadow: 0 0 0 1.5px rgba(129, 140, 248, 0.45);
}

.dark-mode .today-btn {
  border-color: #667eea;
  color: #818cf8;
}

.dark-mode .today-btn:disabled {
  border-color: #3d3d3d;
  color: #6b7280;
  background: #2d2d2d;
}

.dark-mode .day-column {
  background: #1e1e1e;
  border-color: #2d2d2d;
}

.dark-mode .day-column.today {
  border-color: #667eea;
  box-shadow: 0 0 0 1px #667eea;
}

.dark-mode .day-header {
  border-bottom-color: #2d2d2d;
}

.dark-mode .event-card {
  background: #2d2d2d;
  border-color: #3d3d3d;
}

.dark-mode .add-event-cell {
  border-color: #3d3d3d;
  color: #4d4d4d;
}

.dark-mode .add-event-cell:hover {
  border-color: #667eea;
  color: #667eea;
}

.dark-mode .filter-chip {
  border-color: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .filter-chip:hover {
  background: #2d2d2d;
}

.dark-mode .filter-chip.active.practice { background: rgba(16,185,129,0.15); border-color: #10b981; color: #6ee7b7; }
.dark-mode .filter-chip.active.game { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #93c5fd; }
.dark-mode .filter-chip.active.meeting { background: rgba(245,158,11,0.15); border-color: #f59e0b; color: #fcd34d; }

.dark-mode .search-box {
  border-color: #3d3d3d;
  background: #2d2d2d;
}

.dark-mode .list-event-card {
  background: #1e1e1e;
  border-color: #2d2d2d;
}

.dark-mode .list-event-card:hover {
  border-color: #3d3d3d;
}

.dark-mode .list-event-badge.practice { background: rgba(16,185,129,0.15); color: #6ee7b7; }
.dark-mode .list-event-badge.game { background: rgba(59,130,246,0.15); color: #93c5fd; }
.dark-mode .list-event-badge.meeting { background: rgba(245,158,11,0.15); color: #fcd34d; }
.dark-mode .list-event-badge.other { background: rgba(139,92,246,0.15); color: #c4b5fd; }

.dark-mode .action-icon {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
}

.dark-mode .action-icon:hover {
  background: rgba(96, 165, 250, 0.16);
  border-color: rgba(147, 197, 253, 0.34);
  color: #93c5fd;
}

.dark-mode .action-icon.delete {
  color: #fca5a5;
}

.dark-mode .action-icon.delete:hover {
  background: rgba(248, 113, 113, 0.16);
  border-color: rgba(252, 165, 165, 0.34);
  color: #fecaca;
}

.dark-mode .modal-content {
  background: #1e1e1e;
}

.dark-mode .form-row input,
.dark-mode .form-row select,
.dark-mode .form-row textarea {
  background: #2d2d2d;
  border-color: #3d3d3d;
  color: #f0f0f0;
}

.dark-mode .form-actions button:first-child {
  border-color: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .form-actions button:first-child:hover {
  background: #2d2d2d;
}

.dark-mode .event-detail-content {
  background: #1e1e1e;
}

.dark-mode .close-detail {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .close-detail:hover {
  background: #3d3d3d;
  color: #f0f0f0;
}

.dark-mode .meta-item {
  background: #2d2d2d;
}

.dark-mode .event-description {
  background: #2d2d2d;
}

.dark-mode .event-description p {
  color: #f0f0f0;
}

.dark-mode .meta-icon {
  background: #3d3d3d;
}

.dark-mode .meta-value {
  color: #e5e7eb;
}

.dark-mode .attendance-section {
  border-top-color: #2d2d2d;
}

.dark-mode .attendance-section h3 {
  color: #e5e7eb;
}

.dark-mode .attend-btn {
  border-color: #3d3d3d;
  background: #2d2d2d;
}

.dark-mode .attend-btn .btn-icon {
  background: #3d3d3d;
}

.dark-mode .attend-btn .btn-text {
  color: #9ca3af;
}

.dark-mode .attend-btn.yes:hover,
.dark-mode .attend-btn.yes.active {
  background: rgba(16, 185, 129, 0.15);
}

.dark-mode .attend-btn.no:hover,
.dark-mode .attend-btn.no.active {
  background: rgba(239, 68, 68, 0.15);
}

.dark-mode .my-reason-card {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.dark-mode .attendance-result.unmarked {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .attendance-result.selected {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .attendee-card {
  background: #2d2d2d;
}

.dark-mode .attendee-card .attendee-name {
  color: #f0f0f0;
}

.dark-mode .attendee-note {
  background: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .lineup-header p {
  color: #9ca3af;
}

.dark-mode .lineup-message,
.dark-mode .lineup-empty-note,
.dark-mode .lineup-player-toggle.selected {
  background: rgba(11, 114, 231, 0.16);
  border-color: rgba(111, 178, 255, 0.45);
  color: #93c5fd;
}

.dark-mode .lineup-player-toggle {
  background: #2d2d2d;
  border-color: #3d3d3d;
}

.dark-mode .event-detail-actions {
  border-top-color: #2d2d2d;
}

.dark-mode .edit-btn {
  background: #2d2d2d;
  color: #e5e7eb;
}

.dark-mode .edit-btn:hover {
  background: #3d3d3d;
}

.dark-mode .delete-btn {
  background: rgba(239, 68, 68, 0.15);
}

.dark-mode .decline-modal textarea {
  background: #2d2d2d;
  border-color: #3d3d3d;
  color: var(--text-color);
}

.dark-mode .modal-btn.cancel-btn {
  border-color: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .modal-btn.cancel-btn:hover {
  background: #2d2d2d;
}

.dark-mode .stats-modal th {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .stats-overview-card,
.dark-mode .stats-search,
.dark-mode .stats-table-shell,
.dark-mode .stats-empty {
  background: #1b2432;
  border-color: #2d3748;
}

.dark-mode .stats-modal-close {
  background: #1b2432;
  border-color: #2d3748;
  color: #cbd5e1;
}

.dark-mode .stats-modal-close:hover {
  background: #243041;
  color: #f8fafc;
}

.dark-mode .stats-table th,
.dark-mode .stats-table td {
  border-bottom-color: #2d2d2d;
}

.dark-mode .stats-table tbody tr:hover td {
  background: rgba(111, 178, 255, 0.08);
}

.dark-mode .player-meta,
.dark-mode .stats-modal-subtitle,
.dark-mode .stats-overview-label,
.dark-mode .stats-toolbar-note,
.dark-mode .stats-search {
  color: #9ca3af;
}

.dark-mode .stats-search input {
  color: #e5e7eb;
}

.dark-mode .stats-search input::placeholder {
  color: #7b8797;
}

.dark-mode .rate-track {
  background: #2d3748;
}

.dark-mode .date-group-label {
  color: #6b7280;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1024px) {
  .calendar-grid {
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  
  .day-column {
    border-radius: 10px;
  }
  
  .event-card-body {
    padding: 6px 8px;
  }
}

@media (max-width: 768px) {
  .schedule-container {
    padding: 16px;
  }
  
  .schedule-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .week-navigation {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .week-navigation-main {
    justify-content: center;
  }

  .week-title {
    flex-direction: column;
    justify-content: center;
  }

  .date-picker-popover {
    position: static;
    left: auto;
    transform: none;
    width: min(100vw - 48px, 320px);
    margin-top: 12px;
  }

  .today-btn {
    justify-self: center;
    align-self: center;
  }
  
  .calendar-grid {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 8px;
  }
  
  .day-column {
    display: flex;
    flex-direction: row;
    align-items: stretch;
  }
  
  .day-header {
    min-width: 70px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-bottom: none;
    border-right: 1px solid #f3f4f6;
  }
  
  .day-events {
    flex-direction: row;
    flex-wrap: wrap;
    flex: 1;
  }
  
  .event-meta-grid {
    grid-template-columns: 1fr;
  }
  
  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-chips {
    overflow-x: auto;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .list-event-card {
    flex-wrap: wrap;
  }
  
  .list-event-actions {
    opacity: 1;
  }

  .stats-modal {
    width: calc(100vw - 24px);
    max-height: 90vh;
    padding: 18px;
    gap: 14px;
  }

  .stats-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-toolbar-note {
    white-space: normal;
  }
}
</style>
