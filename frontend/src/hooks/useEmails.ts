import { useQuery } from '@tanstack/react-query'
import { getEmails, getEmail } from '../lib/api'

export function useEmails(tool?: string, search?: string) {
  return useQuery({
    queryKey: ['emails', tool, search],
    queryFn: () => getEmails(tool, search),
    staleTime: 30_000,
  })
}

export function useEmail(id: string | null) {
  return useQuery({
    queryKey: ['email', id],
    queryFn: () => getEmail(id!),
    enabled: !!id,
  })
}
