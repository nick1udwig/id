import { create } from 'zustand'
import { NewMessage, Ids } from '../types/Id'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface IdStore {
  ids: Ids
  addMessage: (msg: NewMessage) => void
  get: () => IdStore
  set: (partial: IdStore | Partial<IdStore>) => void
}

const useIdStore = create<IdStore>()(
  persist(
    (set, get) => ({
      ids: { "New Id": [] },
      addMessage: (msg: NewMessage) => {
        const { ids } = get()
        const { id, author, content } = msg
        if (!ids[id]) {
          ids[id] = []
        }
        ids[id].push({ author, content })
        set({ ids })
      },

      get,
      set,
    }),
    {
      name: 'id', // unique name
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
)

export default useIdStore
