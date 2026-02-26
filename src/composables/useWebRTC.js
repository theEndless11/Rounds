import { ref, nextTick } from 'vue'

export function useWebRTC() {
  const inCall = ref(false)
  const incomingCall = ref(false)
  const incomingOffer = ref(null)
  const callEndedNotice = ref(false)
  const peerConnection = ref(null)
  const localStream = ref(null)
  const remoteStream = ref(null)
  const localVideo = ref(null)
  const remoteVideo = ref(null)
  const callMode = ref('video')
  const callStatus = ref('idle')
  const missedCallInfo = ref(null)
  const ws = ref(null)
  const connectionStatus = ref('disconnected')
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const isOtherUserOnline = ref(false)
  const currentUserId = ref('')
  const chatWithId = ref('')
  
  const pendingIceCandidates = ref([])

const callTimeout = ref(null)
const CALL_TIMEOUT_DURATION = 30000 // 30 seconds

  let presenceSyncInterval = null
  let reconnectTimeout = null

  const createUnifiedChannel = (type, userId1, userId2) => {
    const sortedIds = [userId1, userId2].sort()
    return `${type}-${sortedIds.join('-')}`
  }

  const sendWebSocketMessage = (message) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
      return true
    }
    return false
  }

  const connectWebSocket = (wsUrl) => {
    if (ws.value?.readyState === WebSocket.OPEN) return Promise.resolve()

    return new Promise((resolve, reject) => {
      isOtherUserOnline.value = false
      connectionStatus.value = 'connecting'
      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        connectionStatus.value = 'connected'
        reconnectAttempts.value = 0
        resolve()
      }

      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          // Silent fail
        }
      }

      ws.value.onclose = () => {
        connectionStatus.value = 'disconnected'
        isOtherUserOnline.value = false
        
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++
          const delay = Math.min(1000 * reconnectAttempts.value, 5000)
          reconnectTimeout = setTimeout(() => {
            connectWebSocket(wsUrl).catch(() => {})
          }, delay)
        }
      }

      ws.value.onerror = (error) => {
        connectionStatus.value = 'error'
        isOtherUserOnline.value = false
        reject(error)
      }
    })
  }

  const subscribeToChannels = () => {
    if (!currentUserId.value || !chatWithId.value || ws.value?.readyState !== WebSocket.OPEN) {
      return
    }
    
    const channels = ['chat', 'rtc', 'presence'].map(type => 
      createUnifiedChannel(type, currentUserId.value, chatWithId.value)
    )

    channels.forEach(channelName => {
      const message = {
        type: 'subscribe',
        clientId: currentUserId.value,
        channel: channelName
      }
      sendWebSocketMessage(message)
    })

    const presenceChannel = channels[2]
    
    sendWebSocketMessage({
      type: 'presence-enter',
      clientId: currentUserId.value,
      payload: { presenceChannel }
    })

    setTimeout(() => {
      sendWebSocketMessage({
        type: 'presence-get-members',
        clientId: currentUserId.value,
        payload: { presenceChannel }
      })
    }, 100)

    setupPresenceHeartbeat()
  }

  const setupPresenceHeartbeat = () => {
    if (presenceSyncInterval) clearInterval(presenceSyncInterval)
    
    presenceSyncInterval = setInterval(() => {
      if (ws.value?.readyState === WebSocket.OPEN && currentUserId.value && chatWithId.value) {
        const presenceChannel = createUnifiedChannel('presence', currentUserId.value, chatWithId.value)
        sendWebSocketMessage({
          type: 'presence-get-members',
          clientId: currentUserId.value,
          payload: { presenceChannel }
        })
      }
    }, 30000)
  }

  const handleWebSocketMessage = (message) => {
    const { type, data, clientId, members, payload } = message
    
    switch (type) {
      case 'presence-enter':
        if (String(clientId) === String(chatWithId.value)) {
          isOtherUserOnline.value = true
        }
        break
        
      case 'presence-leave':
        if (String(clientId) === String(chatWithId.value)) {
          isOtherUserOnline.value = false
        }
        break
        
      case 'presence-members':
        if (Array.isArray(members)) {
          const isOnline = members.some(member => 
            String(member) === String(chatWithId.value)
          )
          isOtherUserOnline.value = isOnline
        }
        break

      case 'subscribed':
        break

      case 'offer':
        if (!inCall.value && !incomingCall.value) {
          handleIncomingOffer(data)
        }
        break
        
      case 'answer':
        handleAnswer(data)
        break
        
      case 'ice-candidate':
        handleIceCandidate(data)
        break
        
      case 'call-ended':
        if (inCall.value || incomingCall.value) {
          endCall(false)
        }
        break
        
      case 'call-rejected':
        if (inCall.value || incomingCall.value) {
          handleCallRejected()
        }
        break

      case 'missed-call':
        missedCallInfo.value = data
        if (typeof window !== 'undefined' && window.webrtcMessageHandler) {
          window.webrtcMessageHandler(message)
        }
        break

      case 'message':
      case 'newMessage':
      case 'typing':
      case 'message-seen':
      case 'messageSeenAcknowledgment':
        if (typeof window !== 'undefined' && window.webrtcMessageHandler) {
          window.webrtcMessageHandler(message)
        }
        break

      default:
        if (typeof window !== 'undefined' && window.webrtcMessageHandler) {
          window.webrtcMessageHandler(message)
        }
    }
  }

  const init = (currentUserIdValue, chatWithIdValue, wsUrl = null) => {
    currentUserId.value = currentUserIdValue
    chatWithId.value = chatWithIdValue
    
    if (wsUrl) {
      return connectWebSocket(wsUrl)
    }
    return Promise.resolve()
  }

  let typingDebounce = null
  const sendTypingIndicator = (typing = true) => {
    if (connectionStatus.value !== 'connected') return false
    
    if (typingDebounce) clearTimeout(typingDebounce)
    
    const chatChannel = createUnifiedChannel('chat', currentUserId.value, chatWithId.value)
    const sent = sendWebSocketMessage({
      type: 'typing',
      clientId: currentUserId.value,
      channel: chatChannel,
      payload: {
        typing,
        senderId: currentUserId.value,
        receiverId: chatWithId.value
      }
    })
    
    if (typing) {
      typingDebounce = setTimeout(() => {
        sendTypingIndicator(false)
      }, 2000)
    }
    
    return sent
  }

  const sendChatMessage = (messageData) => {
    if (connectionStatus.value !== 'connected') {
      return false
    }
    
    const chatChannel = createUnifiedChannel('chat', currentUserId.value, chatWithId.value)
    return sendWebSocketMessage({
      type: 'message',
      clientId: currentUserId.value,
      channel: chatChannel,
      payload: { 
        ...messageData, 
        senderId: currentUserId.value, 
        receiverId: chatWithId.value,
        timestamp: Date.now()
      }
    })
  }

  const sendMessageSeen = (messageId) => {
    if (connectionStatus.value !== 'connected') return false
    
    const chatChannel = createUnifiedChannel('chat', currentUserId.value, chatWithId.value)
    return sendWebSocketMessage({
      type: 'message-seen',
      clientId: currentUserId.value,
      channel: chatChannel,
      payload: {
        messageId,
        id: messageId,
        senderId: currentUserId.value,
        receiverId: chatWithId.value,
        timestamp: Date.now()
      }
    })
  }

  const sendCustomMessage = (type, payload, channel = null) => {
    if (connectionStatus.value !== 'connected') return false
    
    const targetChannel = channel || createUnifiedChannel('chat', currentUserId.value, chatWithId.value)
    return sendWebSocketMessage({
      type,
      clientId: currentUserId.value,
      channel: targetChannel,
      payload: { 
        ...payload, 
        senderId: currentUserId.value, 
        receiverId: chatWithId.value,
        timestamp: Date.now()
      }
    })
  }

  const leavePresence = () => {
    if (ws.value && currentUserId.value && chatWithId.value) {
      const presenceChannel = createUnifiedChannel('presence', currentUserId.value, chatWithId.value)
      sendWebSocketMessage({
        type: 'presence-leave',
        clientId: currentUserId.value,
        payload: { presenceChannel }
      })
    }
  }

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const rtcChannel = createUnifiedChannel('rtc', currentUserId.value, chatWithId.value)
        sendWebSocketMessage({
          type: 'rtc-ice-candidate',
          clientId: currentUserId.value,
          channel: rtcChannel,
          payload: {
            from: currentUserId.value,
            to: chatWithId.value,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex
            }
          }
        })
      }
    }

    pc.ontrack = (event) => {
      if (!remoteStream.value) {
        remoteStream.value = new MediaStream()
      }
      
      const existingTrack = remoteStream.value.getTracks().find(t => t.kind === event.track.kind)
      if (existingTrack) {
        remoteStream.value.removeTrack(existingTrack)
      }
      remoteStream.value.addTrack(event.track)
      
      if (remoteVideo.value) {
        if (!remoteVideo.value.srcObject) {
          remoteVideo.value.srcObject = remoteStream.value
        }
        
        remoteVideo.value.muted = false
        remoteVideo.value.play()
          .catch(() => {
            remoteVideo.value.muted = true
            return remoteVideo.value.play()
          })
          .then(() => {
            setTimeout(() => {
              if (remoteVideo.value) {
                remoteVideo.value.muted = false
              }
            }, 500)
          })
          .catch(() => {})
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        pc.restartIce()
      }
    }

    return pc
  }

  const setupCall = async (offerData = null, mode = 'video') => {
    try {
      callMode.value = mode
      inCall.value = true
      
      await nextTick()
      await nextTick()

      peerConnection.value = createPeerConnection()

      const mediaConstraints = mode === 'voice' 
        ? { audio: true, video: false } 
        : { 
            audio: true, 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            } 
          }
      
      localStream.value = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      
      localStream.value.getTracks().forEach(track => {
        peerConnection.value.addTrack(track, localStream.value)
      })

      if (mode === 'video' && localVideo.value && !localVideo.value.srcObject) {
        localVideo.value.srcObject = localStream.value
        localVideo.value.muted = true
        localVideo.value.play().catch(() => {})
      }

      if (offerData) {
        await peerConnection.value.setRemoteDescription(new RTCSessionDescription(offerData))
        
        if (pendingIceCandidates.value.length > 0) {
          for (const candidate of pendingIceCandidates.value) {
            try {
              await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (err) {
              // Silent fail
            }
          }
          pendingIceCandidates.value = []
        }
        
        const answer = await peerConnection.value.createAnswer()
        await peerConnection.value.setLocalDescription(answer)

        const rtcChannel = createUnifiedChannel('rtc', currentUserId.value, chatWithId.value)
        sendWebSocketMessage({
          type: 'rtc-answer',
          clientId: currentUserId.value,
          channel: rtcChannel,
          payload: {
            from: currentUserId.value,
            to: chatWithId.value,
            answer: {
              type: answer.type,
              sdp: answer.sdp
            }
          }
        })
        
        callStatus.value = 'connected'
      } else {
        const offer = await peerConnection.value.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === 'video'
        })
        await peerConnection.value.setLocalDescription(offer)

        const rtcChannel = createUnifiedChannel('rtc', currentUserId.value, chatWithId.value)
        sendWebSocketMessage({
          type: 'rtc-offer',
          clientId: currentUserId.value,
          channel: rtcChannel,
          payload: {
            from: currentUserId.value,
            to: chatWithId.value,
            callType: mode,
            offer: {
              type: offer.type,
              sdp: offer.sdp
            }
          }
        })
      }
    } catch (error) {
      endCall(true)
    }
  }

  const startCall = async (mode = 'video') => {
  callStatus.value = 'ringing'
  await setupCall(null, mode)
  
  // Set timeout for unanswered call
  callTimeout.value = setTimeout(() => {
    if (callStatus.value === 'ringing') {
      // Call was not answered - treat as missed
      missedCallInfo.value = {
        from: currentUserId.value,
        to: chatWithId.value,
        callType: mode,
        timestamp: Date.now()
      }
      endCall(true)
    }
  }, CALL_TIMEOUT_DURATION)
}

  const acceptCall = async () => {
  if (!incomingOffer.value) {
    return
  }
  
  // Clear timeout when call is accepted
  if (callTimeout.value) {
    clearTimeout(callTimeout.value)
    callTimeout.value = null
  }
  
  incomingCall.value = false
  await setupCall(incomingOffer.value, incomingOffer.value.callType || callMode.value)
  incomingOffer.value = null
}

  const rejectCall = () => {
    const rtcChannel = createUnifiedChannel('rtc', currentUserId.value, chatWithId.value)
    
    sendWebSocketMessage({
      type: 'rtc-missed-call',
      clientId: currentUserId.value,
      channel: rtcChannel,
      payload: {
        from: chatWithId.value,
        to: currentUserId.value,
        callType: callMode.value,
        timestamp: Date.now()
      }
    })
    
    sendWebSocketMessage({
      type: 'rtc-call-rejected',
      clientId: currentUserId.value,
      channel: rtcChannel,
      payload: {
        from: currentUserId.value,
        to: chatWithId.value
      }
    })
    
    callStatus.value = 'idle'
    incomingCall.value = false
    incomingOffer.value = null
    pendingIceCandidates.value = []
  }

  const handleCallRejected = () => {
    if (typeof window !== 'undefined' && window.onCallRejected) {
      window.onCallRejected()
    }
    endCall(false)
  }

  const endCall = (sendMessage = true) => {
  // Clear call timeout
  if (callTimeout.value) {
    clearTimeout(callTimeout.value)
    callTimeout.value = null
  }
  
  if (sendMessage && ws.value?.readyState === WebSocket.OPEN) {
      const rtcChannel = createUnifiedChannel('rtc', currentUserId.value, chatWithId.value)
      sendWebSocketMessage({
        type: 'rtc-call-ended',
        clientId: currentUserId.value,
        channel: rtcChannel,
        payload: {
          from: currentUserId.value,
          to: chatWithId.value
        }
      })
    }

    peerConnection.value?.close()
    peerConnection.value = null

    localStream.value?.getTracks().forEach(track => track.stop())
    localStream.value = null

    remoteStream.value?.getTracks().forEach(track => track.stop())
    remoteStream.value = null

    callStatus.value = 'idle'
    inCall.value = false
    incomingCall.value = false
    incomingOffer.value = null
    pendingIceCandidates.value = []

    if (localVideo.value) localVideo.value.srcObject = null
    if (remoteVideo.value) remoteVideo.value.srcObject = null

    callEndedNotice.value = true
    setTimeout(() => callEndedNotice.value = false, 3000)
  }

  const handleIncomingOffer = (data) => {
    const callType = data.callType || 'video'
    callMode.value = callType
    
    incomingOffer.value = {
      type: data.type,
      sdp: data.sdp,
      callType: callType
    }
    
    callStatus.value = 'ringing'
    incomingCall.value = true
  }

  const handleAnswer = async (data) => {
    if (peerConnection.value && peerConnection.value.signalingState !== 'stable') {
      try {
        await peerConnection.value.setRemoteDescription(new RTCSessionDescription({
          type: data.type,
          sdp: data.sdp
        }))
        
        callStatus.value = 'connected'
        
        if (pendingIceCandidates.value.length > 0) {
          for (const candidate of pendingIceCandidates.value) {
            try {
              await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (err) {
              // Silent fail
            }
          }
          pendingIceCandidates.value = []
        }
      } catch (error) {
        // Silent fail
      }
    }
  }

  const handleIceCandidate = async (data) => {
    if (!data.candidate) {
      return
    }
    
    const candidate = {
      candidate: data.candidate,
      sdpMid: data.sdpMid,
      sdpMLineIndex: data.sdpMLineIndex
    }
    
    if (peerConnection.value && peerConnection.value.remoteDescription && peerConnection.value.signalingState !== 'closed') {
      try {
        await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        // Silent fail
      }
    } else {
      pendingIceCandidates.value.push(candidate)
    }
  }

  const getConnectionStatus = () => connectionStatus.value

  const reconnectWebSocket = (wsUrl) => {
    if (ws.value) {
      ws.value.close()
    }
    return connectWebSocket(wsUrl)
  }

  const cleanup = () => {
  if (presenceSyncInterval) clearInterval(presenceSyncInterval)
  if (reconnectTimeout) clearTimeout(reconnectTimeout)
  if (typingDebounce) clearTimeout(typingDebounce)
  if (callTimeout.value) clearTimeout(callTimeout.value)

    leavePresence()
    
    setTimeout(() => {
      ws.value?.close()
      ws.value = null
    }, 100)

    peerConnection.value?.close()
    localStream.value?.getTracks().forEach(track => track.stop())
    remoteStream.value?.getTracks().forEach(track => track.stop())
    
    peerConnection.value = null
    localStream.value = null
    remoteStream.value = null
    inCall.value = false
    incomingCall.value = false
    incomingOffer.value = null
    callEndedNotice.value = false
    callStatus.value = 'idle'
    connectionStatus.value = 'disconnected'
    isOtherUserOnline.value = false
    pendingIceCandidates.value = []
    missedCallInfo.value = null
  }

  return {
    connectionStatus,
    isOtherUserOnline,
    inCall,
    incomingCall,
    incomingOffer,
    callEndedNotice,
    callMode,
    callStatus,
    missedCallInfo,
    peerConnection,
    localStream,
    remoteStream,
    localVideo,
    remoteVideo,
    init,
    connectWebSocket,
    subscribeToChannels,
    sendWebSocketMessage,
    sendTypingIndicator,
    sendChatMessage,
    sendMessageSeen,
    sendCustomMessage,
    leavePresence,
    getConnectionStatus,
    reconnectWebSocket,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleIncomingOffer,
    handleAnswer,
    handleIceCandidate,
    cleanup
  }
}