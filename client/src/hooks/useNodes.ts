import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  CardNodesResponse,
  CreateNodePayload,
  UpdateNodePayload,
  AddDependencyPayload,
} from '@kanban/shared';

export function useNodes(cardId: string | undefined) {
  return useQuery({
    queryKey: ['cards', cardId, 'nodes'],
    queryFn: () => api.get<CardNodesResponse>(`/cards/${cardId}/nodes`),
    enabled: !!cardId,
    refetchInterval: 3000,
  });
}

export function useCreateNode(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNodePayload) =>
      api.post(`/cards/${cardId}/nodes`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', cardId, 'nodes'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}

export function useUpdateNode(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateNodePayload & { id: string }) =>
      api.patch(`/nodes/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', cardId, 'nodes'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}

export function useDeleteNode(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/nodes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', cardId, 'nodes'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}

export function useAddDependency(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, ...payload }: AddDependencyPayload & { nodeId: string }) =>
      api.post(`/nodes/${nodeId}/dependencies`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', cardId, 'nodes'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}

export function useRemoveDependency(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, depId }: { nodeId: string; depId: string }) =>
      api.delete(`/nodes/${nodeId}/dependencies/${depId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', cardId, 'nodes'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}
