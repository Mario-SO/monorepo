import type { AppProps } from 'next/app'
import React, { useEffect, useCallback } from 'react'
import Head from 'next/head'
import { PWAPrompt } from 'components/domain/app/pwa-prompt'
import 'assets/css/index.scss'
import { Session as SessionType } from 'types/Session'
import { SEO } from 'components/domain/seo'
import { Web3Provider } from 'context/web3'
import { AppContext } from 'context/app-context'
import { AccountContextProvider } from 'context/account-context-provider'
import DevaBot from 'lib/components/ai/overlay'
import { RecoilRoot, atom, useRecoilState, useRecoilValue, selector } from 'recoil'
import { useSessionData } from 'services/event-data'
import { NotificationCard } from 'components/domain/app/dc7/profile/notifications'
import { useAccountContext } from 'context/account-context'
import { ZupassProvider } from 'context/zupass'
import { SessionCard } from 'components/domain/app/dc7/sessions'
import { Speaker as SpeakerType } from 'types/Speaker'
import router, { useRouter } from 'next/router'
import { Toaster } from 'lib/components/ui/toaster'
import { usePathname } from 'next/navigation'
import { DataProvider } from 'context/data'
import { init } from '@socialgouv/matomo-next'

const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = process.env.PUBLIC_MATOMO_SITE_ID || '38'
let matomoAdded = false

export const selectedEventTabAtom = atom<'venue' | 'information' | 'contact' | 'directions'>({
  key: 'selectedEventTab',
  default: 'venue',
})

// This selector is used to get the full speaker object from the selectedSpeakerAtom - useful for /speakers pages where the full object is needed - this can be impartial if the speaker was linked from a session (where the speakers don't recursively have the session objects)
export const selectedSpeakerSelector = selector({
  key: 'selectedSpeakerSelector',
  get: ({ get }) => {
    const selectedSpeakerPotentiallyPartial = get(selectedSpeakerAtom)
    const allSpeakers = get(speakersAtom)

    if (!selectedSpeakerPotentiallyPartial) return null

    return allSpeakers?.find(speaker => speaker.id === selectedSpeakerPotentiallyPartial?.id) || null
  },
})

export const selectedSessionAtom = atom<SessionType | null>({
  key: 'selectedSession',
  default: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('selectedSession') || 'null') : null,
  effects: [
    ({ onSet }) => {
      onSet(newValue => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedSession', JSON.stringify(newValue))
        }
      })
    },
  ],
})

export const sessionTimelineViewAtom = atom<boolean>({
  key: 'sessionTimelineView',
  default: false,
})

export const sessionFilterOpenAtom = atom<boolean>({
  key: 'sessionFilterOpen',
  default: false,
})

export const initialFilterState = {
  text: '',
  attending: false,
  favorited: false,
  type: {},
  track: {},
  expertise: {},
  day: {},
  room: {},
  cls: {},
  other: {},
}

export const sessionFilterAtom = atom<any>({
  key: 'sessionFilter',
  default: initialFilterState,
  effects: [
    ({ onSet }) => {
      onSet(newValue => {
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams()

          Object.entries(newValue).forEach(([key, value]: any) => {
            // Skip if it's the default value
            // @ts-ignore
            if (JSON.stringify(value) === JSON.stringify(initialFilterState[key])) return

            // Handle different value types
            if (typeof value === 'object' && Object.keys(value).length > 0) {
              // For objects (like type, track, expertise), use keys that are true
              const activeKeys = Object.entries(value)
                .filter(([_, isActive]) => isActive)
                .map(([k]) => encodeURIComponent(k))
              if (activeKeys.length) searchParams.set(key, activeKeys.join(','))
            } else if (typeof value === 'boolean' && value) {
              // For boolean flags (like attending, favorited), just include if true
              searchParams.set(key, '1')
            } else if (value) {
              // For simple values (like text, letter), include if non-empty
              searchParams.set(key, encodeURIComponent(value))
            }
          })

          const { pathname } = window.location
          const query = searchParams.toString() ? `${searchParams.toString()}` : ''
          router.replace({ pathname, query }, undefined, { shallow: true })
        }
      })
    },
  ],
})

export const speakerFilterOpenAtom = atom<boolean>({
  key: 'speakerFilterOpen',
  default: false,
})

export const initialSpeakerFilterState = {
  ...initialFilterState,
  letter: '',
}

export const speakerFilterAtom = atom<any>({
  key: 'speakerFilter',
  default: initialSpeakerFilterState,
  effects: [
    ({ onSet }) => {
      onSet(newValue => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('speakerFilter', JSON.stringify(newValue))
        }
      })
    },
  ],
})

// Short on time so just doing global state here.. extract later
export const selectedSpeakerAtom = atom<SpeakerType | null>({
  key: 'selectedSpeaker',
  default: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('selectedSpeaker') || 'null') : null,
  // effects: [
  //   ({ onSet }) => {
  //     onSet(newValue => {
  //       if (typeof window !== 'undefined') {
  //         localStorage.setItem('selectedSpeaker', JSON.stringify(newValue))
  //       }
  //     })
  //   },
  // ],
})

// This selector is used to get the full session object from the selectedSessionAtom - useful for /sessions pages where the full object is needed - this can be impartial if the session was linked from a speaker (where the sessions don't recursively have the speaker objects)
export const selectedSessionSelector = selector({
  key: 'selectedSessionSelector',
  get: ({ get }) => {
    const selectedSessionPotentiallyPartial = get(selectedSessionAtom)
    const allSessions = get(sessionsAtom)

    if (!selectedSessionPotentiallyPartial) return null

    return allSessions?.find(session => session.sourceId === selectedSessionPotentiallyPartial?.sourceId) || null
  },
})

export const devaBotVisibleAtom = atom<boolean | string>({
  key: 'devaBotVisible',
  default: false,
})

export const sessionIdAtom = atom<string | null>({
  key: 'sessionId',
  default: null,
})

export const speakersAtom = atom<SpeakerType[] | null>({
  key: 'speakers',
  default: null,
})

export const sessionsAtom = atom<SessionType[] | null>({
  key: 'sessions',
  default: null,
})

export const roomsAtom = atom<any[] | null>({
  key: 'rooms',
  default: null,
})

export const notificationsAtom = atom<any[]>({
  key: 'notifications',
  default: [],
})

export const notificationsCountSelector = selector({
  key: 'notificationsCountSelector',
  get: ({ get }) => {
    if (typeof window === 'undefined') return 0

    const notifications = get(notificationsAtom)
    const seenNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]')
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    return notifications.filter(notification => {
      const notificationDate = new Date(notification.sendAt)
      return notificationDate >= threeDaysAgo && !seenNotifications.includes(notification.id)
    }).length
  },
})

export const markAllAsRead = (notifications: any[]) => {
  const notificationIds = notifications.map(notification => notification.id)
  localStorage.setItem('seenNotifications', JSON.stringify(notificationIds))
  // Optionally, you can update the Recoil state to trigger a re-render
  // setNotifications([...notifications]);
}

const seenNotificationsAtom = atom<Set<string>>({
  key: 'seenNotificationsAtom',
  default:
    typeof window !== 'undefined' ? new Set(JSON.parse(localStorage.getItem('seenNotifications') || '[]')) : new Set(),
})

export const useSeenNotifications = () => {
  const [notifications, setNotifications] = useRecoilState(notificationsAtom)
  const notificationsCount = useRecoilValue(notificationsCountSelector)
  const [seenNotifications, setSeenNotifications] = useRecoilState(seenNotificationsAtom)

  const syncWithLocalStorage = useCallback(() => {
    const storedNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]')
    setSeenNotifications(new Set(storedNotifications))
  }, [setSeenNotifications])

  useEffect(() => {
    // Initial sync
    syncWithLocalStorage()

    // Listen for storage events
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'seenNotifications') {
        syncWithLocalStorage()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [syncWithLocalStorage])

  const markAllAsRead = useCallback(() => {
    setSeenNotifications(() => {
      const updated = new Set([...notifications.map(n => n.id)])
      localStorage.setItem('seenNotifications', JSON.stringify(Array.from(updated)))
      return updated
    })

    setNotifications([...notifications])
  }, [notifications, setSeenNotifications])

  return { seenNotifications, markAllAsRead, notificationsCount }
}

// @ts-ignore
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  // @ts-ignore
  window.workbox !== undefined &&
  !window.location.pathname.includes('/room-screens')
) {
  // @ts-ignore
  const wb = window.workbox

  const promptNewVersionAvailable = (event: any) => {
    // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
    // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
    // You may want to customize the UI prompt accordingly.
    if (confirm('New update downloaded, please refresh.')) {
      wb.addEventListener('controlling', (event: any) => {
        window.location.reload()
      })

      // Send a message to the waiting service worker, instructing it to activate.
      wb.messageSkipWaiting()
    } else {
      console.log(
        'User rejected to reload the web app, keep using old version. New version will automatically load when user opens the app next time.'
      )
    }
  }

  wb.addEventListener('waiting', promptNewVersionAvailable)

  // document.addEventListener('visibilitychange', () => {
  //   if (document.visibilityState === 'visible') {
  //     navigator.serviceWorker.getRegistration().then(registration => {
  //       if (registration) {
  //         registration.update()
  //       }
  //     })
  //   }
  // })
}

const withProviders = (Component: React.ComponentType<AppProps>) => {
  return (props: AppProps) => (
    <RecoilRoot>
      <DataProvider>
        <AccountContextProvider>
          <Web3Provider>
            <ZupassProvider>
              <Component {...props} />
            </ZupassProvider>
          </Web3Provider>
        </AccountContextProvider>
      </DataProvider>
    </RecoilRoot>
  )
}

function App({ Component, pageProps }: AppProps) {
  const [devaBotVisible, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const sessions = useSessionData()
  const [notifications, setNotifications] = useRecoilState(notificationsAtom)
  const [rooms, setRooms] = useRecoilState(roomsAtom)
  const accountContext = useAccountContext()
  const { seenNotifications, markAllAsRead, notificationsCount } = useSeenNotifications()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  useEffect(() => {
    if (pageProps.rooms) {
      setRooms(pageProps.rooms)
    }
  }, [pageProps])

  useEffect(() => {
    fetchNotifications()
  }, [accountContext.account])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'}/notifications`,
        { credentials: 'include' }
      )
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="application-name" content="Devcon Passport" />
        <meta name="apple-mobile-web-app-title" content="Devcon Passport" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2B5797" />
        <meta name="msapplication-tap-highlight" content="no" /> */}
        <meta name="theme-color" content="#000000" />

        <SEO />
      </Head>

      <AppContext>
        <PWAPrompt />

        <Component {...pageProps} />

        {sessions && (
          <DevaBot
            botVersion="devcon-app"
            sessions={sessions}
            onToggle={(message: string | boolean) => setDevaBotVisible(message)}
            defaultPrompt={typeof devaBotVisible === 'string' ? devaBotVisible : undefined}
            setDefaultPrompt={() => setDevaBotVisible(true)}
            toggled={!!devaBotVisible}
            notifications={notifications || undefined}
            notificationsCount={notificationsCount}
            markNotificationsAsRead={markAllAsRead}
            SessionComponent={SessionCard}
            renderNotifications={() => {
              const groupNotificationsByDay = (notifications: any[]) => {
                const grouped = notifications.reduce((acc, notification) => {
                  const date = new Date(notification.sendAt)
                  const today = new Date()
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)

                  let key
                  if (date.toDateString() === today.toDateString()) {
                    key = 'Today'
                  } else if (date.toDateString() === yesterday.toDateString()) {
                    key = 'Yesterday'
                  } else {
                    key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  }

                  if (!acc[key]) {
                    acc[key] = []
                  }
                  acc[key].push(notification)
                  return acc
                }, {})

                return Object.entries(grouped).sort(([a], [b]) => {
                  if (a === 'Today') return -1
                  if (b === 'Today') return 1
                  if (a === 'Yesterday') return -1
                  if (b === 'Yesterday') return 1
                  return new Date(b).getTime() - new Date(a).getTime()
                })
              }

              const groupedNotifications = groupNotificationsByDay(notifications)

              return (
                <>
                  {groupedNotifications.map(([date, notificationsForDay]: any) => (
                    <div key={date} className="w-full">
                      <p className="font-semibold my-2">{date}</p>
                      {notificationsForDay.map((notification: any) => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          seen={seenNotifications.has(notification.id)}
                        />
                      ))}
                    </div>
                  ))}
                </>
              )
            }}
          />
        )}
      </AppContext>
      <Toaster />
    </>
  )
}

export default withProviders(App)
