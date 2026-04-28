import { create } from 'zustand'
import apiClient from '@/api/axios'

interface SkillTag {
  id: number
  name: string
  category: string
  developer_count: number
}

interface SkillStore {
  skills: SkillTag[]
  loading: boolean
  fetchSkills: () => Promise<void>
  addSkill: (skill: SkillTag) => void
  updateSkill: (id: number, skill: SkillTag) => void
  deleteSkill: (id: number) => void
}

export const useSkillStore = create<SkillStore>((set) => ({
  skills: [],
  loading: false,

  fetchSkills: async () => {
    set({ loading: true })
    try {
      const response = await apiClient.get('/skills')
      const data = response.data
      if (Array.isArray(data)) {
        set({ skills: data, loading: false })
      } else if (data.items) {
        set({ skills: data.items, loading: false })
      } else {
        set({ skills: [], loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  addSkill: (skill) => set((state) => ({ skills: [...state.skills, skill] })),

  updateSkill: (id, updatedSkill) => set((state) => ({
    skills: state.skills.map((s) => (s.id === id ? updatedSkill : s)),
  })),

  deleteSkill: (id) => set((state) => ({
    skills: state.skills.filter((s) => s.id !== id),
  })),
}))
