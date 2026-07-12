import type messages from '../../messages/id.json'

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages
  }
}
