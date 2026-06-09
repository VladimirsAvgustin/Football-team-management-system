import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { useAuthStore } from './auth'
import { getCurrentLocale, getLocalizedFallback, withLocaleHeaders } from '../utils/apiLocale'

// Determine API base URL dynamically based on hostname
const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '')
  }

  const hostname = window.location.hostname
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  
  if (import.meta.env.DEV && isLocalhost) {
    return 'http://localhost:3000'
  }
  
  return window.location.origin
}

const API_BASE_URL = getApiBaseUrl()
const CHAT_ATTACHMENT_API_PREFIX = '/api/chat/attachments/'
const CHAT_ATTACHMENT_LEGACY_PREFIX = '/uploads/chat/'
const attachmentObjectUrlPromises = new Map()

const getAttachmentLabel = () => getLocalizedFallback('Attachment', 'Pielikums')

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error || new Error(getLocalizedFallback('Failed to read file', 'Neizdevās nolasīt failu')))
  reader.readAsDataURL(file)
})

const getMessagePreview = (message) => {
  if (message?.message) return message.message
  return message?.attachment_name || message?.attachmentName || getAttachmentLabel()
}

const toApiUrl = (pathOrUrl) => {
  const value = String(pathOrUrl || '').trim()
  if (/^https?:\/\//i.test(value)) return value
  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`
}

const normalizeAttachmentPath = (attachmentUrl) => {
  const value = String(attachmentUrl || '').trim()

  if (value.startsWith(CHAT_ATTACHMENT_API_PREFIX)) {
    return value
  }

  if (value.startsWith(CHAT_ATTACHMENT_LEGACY_PREFIX)) {
    const fileName = value.slice(CHAT_ATTACHMENT_LEGACY_PREFIX.length).split(/[?#]/)[0]
    return `${CHAT_ATTACHMENT_API_PREFIX}${encodeURIComponent(fileName)}`
  }

  return value
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    socket: null,
    currentRoom: null,
    messages: [],
    rooms: [],
    typingUsers: [],
    isConnected: false,
    isTyping: false,
    // Direct Messages
    currentDM: null,
    dmMessages: [],
    dmConversations: [],
    allUsers: [],
    attachmentObjectUrls: {}
  }),

  getters: {
    sortedMessages: (state) => {
      return [...state.messages].sort((a, b) => 
        new Date(a.createdAt || a.created_at) - new Date(b.createdAt || b.created_at)
      )
    },
    
    unreadCount: (state) => {
      // Calculate unread messages 
      return state.rooms.reduce((count, room) => count + (room.unread || 0), 0)
    }
  },

  actions: {
    // Initialize Socket.io connection
    connect() {
      const authStore = useAuthStore()
      
      if (!authStore.token || this.isConnected) {
        return
      }

      this.socket = io(API_BASE_URL, {
        auth: {
          token: authStore.token,
          locale: getCurrentLocale()
        },
        transports: ['websocket', 'polling']
      })

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('Socket.io connected')
        this.isConnected = true
        this.socket.emit('set_locale', getCurrentLocale())
      })

      this.socket.on('disconnect', () => {
        console.log('Socket.io disconnected')
        this.isConnected = false
      })

      this.socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error)
      })

      // Message event handlers
      this.socket.on('new_message', (message) => {
        if (this.currentRoom && message.roomId === this.currentRoom.id) {
          this.messages.push(message)
          this.scrollToBottom()
        }
        
        // Update last message in rooms list
        const roomIndex = this.rooms.findIndex(r => r.id === message.roomId)
        if (roomIndex !== -1) {
          this.rooms[roomIndex].last_message = getMessagePreview(message)
          this.rooms[roomIndex].last_message_time = message.createdAt
        }
      })

      this.socket.on('message_deleted', ({ messageId, roomId }) => {
        const normalizedRoomId = Number(roomId)

        if (this.currentRoom && normalizedRoomId === Number(this.currentRoom.id)) {
          this.messages = this.messages.filter(message => Number(message.id) !== Number(messageId))
        }

        const roomIndex = this.rooms.findIndex(room => Number(room.id) === normalizedRoomId)
        if (roomIndex !== -1 && this.currentRoom && normalizedRoomId === Number(this.currentRoom.id)) {
          const lastMessage = this.sortedMessages[this.sortedMessages.length - 1]
          this.rooms[roomIndex].last_message = lastMessage ? getMessagePreview(lastMessage) : ''
          this.rooms[roomIndex].last_message_time = lastMessage?.createdAt || lastMessage?.created_at || null
        }
      })

      this.socket.on('user_joined', (data) => {
        console.log(data.message)
      })

      this.socket.on('user_left', (data) => {
        console.log(data.message)
      })

      this.socket.on('user_typing', (data) => {
        if (!this.typingUsers.includes(data.username)) {
          this.typingUsers.push(data.username)
        }
      })

      this.socket.on('user_stop_typing', (data) => {
        const index = this.typingUsers.indexOf(data.username)
        if (index > -1) {
          this.typingUsers.splice(index, 1)
        }
      })

      this.socket.on('message_error', (error) => {
        console.error('Message error:', error)
        alert(error?.error || getLocalizedFallback('Failed to send message', 'Neizdevās nosūtīt ziņojumu'))
      })

      // Direct Message event handlers
      this.socket.on('new_dm', (dmData) => {
        console.log('Received new_dm event:', dmData)
        if (this.currentDM && dmData.sender_id === this.currentDM.userId) {
          this.dmMessages.push(dmData)
          this.scrollToBottom()
          // Mark as read immediately if chat is open
          this.markDMAsRead(dmData.sender_id)
        }
        
        // Update or add to conversations list
        const convIndex = this.dmConversations.findIndex(c => c.user_id === dmData.sender_id)
        if (convIndex !== -1) {
          this.dmConversations[convIndex].last_message = getMessagePreview(dmData)
          this.dmConversations[convIndex].last_message_time = dmData.created_at
          if (!this.currentDM || this.currentDM.userId !== dmData.sender_id) {
            this.dmConversations[convIndex].unread_count++
          }
        } else {
          // Refresh conversations if new user
          console.log('New conversation, refreshing list...')
          this.fetchDMConversations()
        }
      })

      this.socket.on('dm_sent', (dmData) => {
        console.log('Received dm_sent event:', dmData)
        // Add sent message to current DM view
        if (this.currentDM && dmData.receiver_id === this.currentDM.userId) {
          this.dmMessages.push(dmData)
          this.scrollToBottom()
        }
        
        // Update or add to conversations list for sender
        const convIndex = this.dmConversations.findIndex(c => c.user_id === dmData.receiver_id)
        if (convIndex !== -1) {
          this.dmConversations[convIndex].last_message = getMessagePreview(dmData)
          this.dmConversations[convIndex].last_message_time = dmData.created_at
        } else {
          // Refresh conversations if new conversation
          console.log('New conversation for sender, refreshing list...')
          this.fetchDMConversations()
        }
      })

      this.socket.on('dm_error', (error) => {
        console.error('DM error:', error)
        alert(error?.error || getLocalizedFallback('Failed to send direct message', 'Neizdevās nosūtīt tiešo ziņojumu'))
      })
    },

    // Disconnect Socket.io
    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
    },

    // Join a chat room
    async joinRoom(roomId) {
      if (!this.socket || !roomId) return

      // Leave current room if any
      if (this.currentRoom) {
        this.leaveRoom()
      }

      try {
        // Fetch room details
        const response = await fetch(`${API_BASE_URL}/api/chat/room/${roomId}/messages`, {
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })

        if (!response.ok) {
          throw new Error(getLocalizedFallback('Failed to load messages', 'Neizdevās ielādēt ziņojumus'))
        }

        const messages = await response.json()
        this.messages = messages
        this.currentRoom = this.rooms.find(r => r.id === roomId)
        
        // If currentRoom is not found, create a temporary room object
        if (!this.currentRoom) {
          this.currentRoom = {
            id: roomId,
            name: `${getLocalizedFallback('Room', 'Istaba')} ${roomId}`
          }
        }
        
        console.log(`Joining room ${roomId}, loaded ${messages.length} messages`)
        
        // Join room via socket
        this.socket.emit('join_room', roomId)
        
      } catch (error) {
        console.error('Error joining room:', error)
      }
    },

    // Leave current room
    leaveRoom() {
      if (this.socket && this.currentRoom) {
        this.socket.emit('leave_room', this.currentRoom.id)
        this.currentRoom = null
        this.messages = []
        this.typingUsers = []
      }
    },

    // Send a message
    sendMessage(message, attachment = null, replyTo = null) {
      const text = typeof message === 'string' ? message.trim() : ''
      if (!this.socket || !this.currentRoom || (!text && !attachment)) {
        return
      }

      this.socket.emit('send_message', {
        roomId: this.currentRoom.id,
        message: text,
        attachment,
        replyTo: replyTo?.id ? { id: replyTo.id } : null
      })

      // Stop typing indicator
      this.stopTyping()
    },

    deleteMessage(messageId) {
      if (!this.socket || !messageId) {
        return
      }

      this.socket.emit('delete_message', { messageId })
    },

    async uploadAttachment(file) {
      if (!file) return null

      const data = await fileToDataUrl(file)
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: withLocaleHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore().token}`
        }),
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          data
        })
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || getLocalizedFallback('Failed to upload file', 'Neizdevās augšupielādēt failu'))
      }

      return payload
    },

    getAttachmentObjectUrl(attachmentUrl) {
      const attachmentPath = normalizeAttachmentPath(attachmentUrl)
      return this.attachmentObjectUrls[attachmentPath] || ''
    },

    async loadAttachmentObjectUrl(attachmentUrl) {
      const attachmentPath = normalizeAttachmentPath(attachmentUrl)
      if (!attachmentPath) return ''

      if (this.attachmentObjectUrls[attachmentPath]) {
        return this.attachmentObjectUrls[attachmentPath]
      }

      if (attachmentObjectUrlPromises.has(attachmentPath)) {
        return attachmentObjectUrlPromises.get(attachmentPath)
      }

      const promise = (async () => {
        const response = await fetch(toApiUrl(attachmentPath), {
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })

        if (!response.ok) {
          throw new Error(getLocalizedFallback('Failed to load file', 'Neizdevās ielādēt failu'))
        }

        const objectUrl = URL.createObjectURL(await response.blob())
        this.attachmentObjectUrls[attachmentPath] = objectUrl
        return objectUrl
      })().finally(() => {
        attachmentObjectUrlPromises.delete(attachmentPath)
      })

      attachmentObjectUrlPromises.set(attachmentPath, promise)
      return promise
    },

    // Typing indicators
    startTyping() {
      if (!this.socket || !this.currentRoom || this.isTyping) return

      this.isTyping = true
      this.socket.emit('typing', { roomId: this.currentRoom.id })
    },

    stopTyping() {
      if (!this.socket || !this.currentRoom || !this.isTyping) return

      this.isTyping = false
      this.socket.emit('stop_typing', { roomId: this.currentRoom.id })
    },

    // Fetch all chat rooms
    async fetchRooms() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })

        if (!response.ok) {
          throw new Error(getLocalizedFallback('Failed to load chats', 'Neizdevās ielādēt čatus'))
        }

        this.rooms = await response.json()
        console.log('Fetched rooms:', this.rooms.length, this.rooms)
      } catch (error) {
        console.error('Error fetching rooms:', error)
      }
    },

    // Get or create room for a team
    async getTeamRoom(teamId) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/team/${teamId}/room`, {
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })

        if (!response.ok) {
          throw new Error(getLocalizedFallback('Failed to open team chat', 'Neizdevās atvērt komandas čatu'))
        }

        const room = await response.json()
        
        // Add to rooms list if not already there
        if (!this.rooms.find(r => r.id === room.id)) {
          this.rooms.push(room)
        }

        return room
      } catch (error) {
        console.error('Error getting team room:', error)
        return null
      }
    },

    // Scroll to bottom of messages
    scrollToBottom() {
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container')
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 100)
    },

    // ========== Direct Message Methods ==========

    // Fetch team members for DM (only users from the same team)
    async fetchAllUsers() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/team-members`, {
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })

        if (!response.ok) {
          throw new Error(getLocalizedFallback('Failed to load team members', 'Neizdevās ielādēt komandas dalībniekus'))
        }

        this.allUsers = await response.json()
        console.log('Fetched team members:', this.allUsers.length)
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    },

    // Fetch DM conversations
    async fetchDMConversations() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/dm-conversations`, {
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })

        if (!response.ok) {
          throw new Error(getLocalizedFallback('Failed to load direct conversations', 'Neizdevās ielādēt tiešās sarunas'))
        }

        this.dmConversations = await response.json()
        console.log('Fetched DM conversations:', this.dmConversations.length)
      } catch (error) {
        console.error('Error fetching DM conversations:', error)
      }
    },

    // Open DM with a user
    async openDM(userId, username) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/dm/${userId}`, {
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })

        if (!response.ok) {
          throw new Error(getLocalizedFallback('Failed to load direct messages', 'Neizdevās ielādēt tiešos ziņojumus'))
        }

        this.dmMessages = await response.json()
        this.currentDM = { userId, username }
        this.currentRoom = null // Close any team chat room
        
        // Mark messages as read
        await this.markDMAsRead(userId)
        
      } catch (error) {
        console.error('Error opening DM:', error)
      }
    },

    // Send direct message
    sendDM(receiverId, message, attachment = null) {
      const text = typeof message === 'string' ? message.trim() : ''
      console.log('sendDM called:', { receiverId, message: text, hasAttachment: !!attachment, socketConnected: !!this.socket, isConnected: this.isConnected })
      
      if (!this.socket) {
        console.error('Socket not connected, cannot send DM')
        return
      }
      
      if (!text && !attachment) {
        console.error('Message is empty')
        return
      }

      console.log('Emitting send_dm event...')
      this.socket.emit('send_dm', {
        receiverId,
        message: text,
        attachment
      })
    },

    // Mark DMs as read
    async markDMAsRead(userId) {
      try {
        await fetch(`${API_BASE_URL}/api/chat/dm/mark-read/${userId}`, {
          method: 'POST',
          headers: withLocaleHeaders({
            'Authorization': `Bearer ${useAuthStore().token}`
          })
        })
        
        // Update local conversation unread count
        const conv = this.dmConversations.find(c => c.user_id === userId)
        if (conv) {
          conv.unread_count = 0
        }
      } catch (error) {
        console.error('Error marking DMs as read:', error)
      }
    },

    // Close DM
    closeDM() {
      this.currentDM = null
      this.dmMessages = []
    }
  }
})
