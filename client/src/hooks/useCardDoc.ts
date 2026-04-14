import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface CardDocResponse {
  content: string;
}

export function useCardDoc(cardId: string | undefined) {
  return useQuery({
    queryKey: ['cards', cardId, 'doc'],
    queryFn: () => api.get<CardDocResponse>(`/cards/${cardId}/doc`),
    enabled: !!cardId,
    refetchInterval: 3000,
  });
}

export function useUpdateCardDoc(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.put<CardDocResponse>(`/cards/${cardId}/doc`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', cardId, 'doc'] });
    },
  });
}
