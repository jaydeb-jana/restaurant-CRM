import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@api/axiosInstance';
import { Order } from '@/types';

export const useOrders = () => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await axiosInstance.get('/db/orders') as any;
      return response.filter((o: any) => 
        ["pending", "preparing", "ready", "served"].includes(o.status)
      ).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string, status: Order['status'] }) => {
      return await axiosInstance.put(`/db/orders/${orderId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
};
