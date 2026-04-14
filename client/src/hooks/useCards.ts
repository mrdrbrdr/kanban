import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CardWithProgress, CreateCardPayload, UpdateCardPayload } from '@kanban/shared';

export function useCards(boardId: string | undefined) {
  return useQuery({
    queryKey: ['boards', boardId, 'cards'],
    queryFn: () => api.get<CardWithProgress[]>(`/boards/${boardId}/cards`),
    enabled: !!boardId,
    refetchInterval: 3000,
  });
}

export function useCreateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCardPayload) =>
      api.post(`/boards/${boardId}/cards`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards', boardId, 'cards'] }),
  });
}

export function useUpdateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCardPayload & { id: string }) =>
      api.patch(`/cards/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards', boardId, 'cards'] }),
  });
}

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards', boardId, 'cards'] }),
  });
}
