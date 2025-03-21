// Allows translations nested in objects for easier management
export function flattenMessages(nestedMessages: any, prefix = '') {
  return Object.keys(nestedMessages).reduce((messages: any, key) => {
    let value = nestedMessages[key]
    let prefixedKey = prefix ? `${prefix}_${key}` : key

    if (typeof value === 'string') {
      messages[prefixedKey] = value
    } else {
      Object.assign(messages, flattenMessages(value, prefixedKey))
    }

    return messages
  }, {})
}

export async function getMessages(locale: string, dontFlatten?: boolean) {
  return {};
}