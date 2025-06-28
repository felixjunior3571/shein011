"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface Notification {
  id: string
  name: string
  action: string
  time: string
  location: string
}

interface OptimizedSocialNotificationsProps {
  maxNotifications?: number
  displayDuration?: number
  intervalRange?: [number, number]
  enableInActiveTab?: boolean
}

export default function OptimizedSocialNotifications({
  maxNotifications = 8, // Reduced from 15
  displayDuration = 4000, // Reduced from 6000
  intervalRange = [15000, 25000], // Increased from [8000, 15000]
  enableInActiveTab = false,
}: OptimizedSocialNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef<boolean>(true)

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden

      if (!enableInActiveTab && document.hidden) {
        // Hide notification when tab becomes inactive
        setIsVisible(false)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enableInActiveTab])

  // Predefined notifications
  const predefinedNotifications: Notification[] = [
    {
      id: "1",
      name: "Maria Silva",
      action: "acabou de solicitar o Cartão SHEIN",
      time: "agora",
      location: "São Paulo, SP",
    },
    {
      id: "2",
      name: "João Santos",
      action: "foi aprovado para R$ 2.500",
      time: "2 min atrás",
      location: "Rio de Janeiro, RJ",
    },
    {
      id: "3",
      name: "Ana Costa",
      action: "recebeu cashback de R$ 45",
      time: "5 min atrás",
      location: "Belo Horizonte, MG",
    },
    {
      id: "4",
      name: "Pedro Lima",
      action: "finalizou compra de R$ 189",
      time: "8 min atrás",
      location: "Brasília, DF",
    },
    {
      id: "5",
      name: "Carla Oliveira",
      action: "foi aprovada para R$ 1.800",
      time: "12 min atrás",
      location: "Salvador, BA",
    },
    {
      id: "6",
      name: "Lucas Ferreira",
      action: "solicitou aumento de limite",
      time: "15 min atrás",
      location: "Fortaleza, CE",
    },
    {
      id: "7",
      name: "Juliana Rocha",
      action: "recebeu o cartão físico",
      time: "18 min atrás",
      location: "Porto Alegre, RS",
    },
    {
      id: "8",
      name: "Rafael Alves",
      action: "foi aprovado para R$ 3.200",
      time: "22 min atrás",
      location: "Recife, PE",
    },
    {
      id: "9",
      name: "Fernanda Dias",
      action: "usou o cartão pela primeira vez",
      time: "25 min atrás",
      location: "Curitiba, PR",
    },
    {
      id: "10",
      name: "Gabriel Souza",
      action: "recebeu cashback de R$ 67",
      time: "28 min atrás",
      location: "Manaus, AM",
    },
  ]

  // Show notification
  const showNotification = (notification: Notification) => {
    // Don't show if tab is inactive and not enabled
    if (!isActiveRef.current && !enableInActiveTab) {
      return
    }

    // Don't show if max notifications reached
    if (notificationCount >= maxNotifications) {
      console.log("📊 Max notifications reached, stopping")
      return
    }

    setCurrentNotification(notification)
    setIsVisible(true)
    setNotificationCount((prev) => prev + 1)

    // Auto hide after duration
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setCurrentNotification(null)
    }, displayDuration)
  }

  // Get random notification
  const getRandomNotification = (): Notification => {
    const availableNotifications = predefinedNotifications.filter(
      (notif) => !notifications.find((shown) => shown.id === notif.id),
    )

    if (availableNotifications.length === 0) {
      // Reset if all notifications were shown
      setNotifications([])
      return predefinedNotifications[Math.floor(Math.random() * predefinedNotifications.length)]
    }

    return availableNotifications[Math.floor(Math.random() * availableNotifications.length)]
  }

  // Schedule next notification
  const scheduleNextNotification = () => {
    if (notificationCount >= maxNotifications) {
      return
    }

    const [minInterval, maxInterval] = intervalRange
    const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval

    intervalRef.current = setTimeout(() => {
      if (isActiveRef.current || enableInActiveTab) {
        const notification = getRandomNotification()
        setNotifications((prev) => [...prev, notification])
        showNotification(notification)
        scheduleNextNotification()
      }
    }, randomInterval)
  }

  // Start notifications
  useEffect(() => {
    // Initial delay before first notification
    const initialDelay = Math.random() * 5000 + 3000 // 3-8 seconds

    const initialTimeout = setTimeout(() => {
      if (isActiveRef.current || enableInActiveTab) {
        const notification = getRandomNotification()
        setNotifications([notification])
        showNotification(notification)
        scheduleNextNotification()
      }
    }, initialDelay)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) clearTimeout(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Manual close
  const handleClose = () => {
    setIsVisible(false)
    setCurrentNotification(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  if (!isVisible || !currentNotification) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div
        className={`bg-white border border-gray-200 rounded-lg shadow-lg p-4 transform transition-all duration-300 ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 font-medium">ATIVIDADE RECENTE</span>
            </div>
            <p className="text-sm text-gray-800 mb-1">
              <span className="font-semibold">{currentNotification.name}</span> {currentNotification.action}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{currentNotification.time}</span>
              <span>{currentNotification.location}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
