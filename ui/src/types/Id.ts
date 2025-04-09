export interface IdMessage {
  author: string
  content: string
}

export interface NewMessage {
  id: string
  author: string
  content: string
}

export interface SignIdMessage {
  Sign: number[]
}

// Ids consists of a map of counterparty to an array of messages
export interface Ids {
  [counterparty: string]: IdMessage[]
}
