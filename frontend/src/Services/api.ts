import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import type {
    Ingredient,
    MessageResponse,
    Order,
    OrderPayload,
    OrderResponse,
    OrderStatus,
    Product,
    ProductAddon,
    ProductPayload,
    ProductResponse,
    StockPayload,
} from '../types/domain';

/** Instância única do Axios usada por todas as telas do Pragma. */
const api: AxiosInstance = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('pragma_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        const method = String(response.config?.method || '').toLowerCase();
        const url = String(response.config?.url || '');
        const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);
        const generatesAlert = /\/(orders|ingredients|expenses|store)(\/|$)/.test(url);

        if (isMutation && generatesAlert) {
            window.dispatchEvent(new Event('pragma:notifications-refresh'));
        }
        return response;
    },
    (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            localStorage.removeItem('pragma_token');
            localStorage.removeItem('pragma_user');
            window.dispatchEvent(new Event('pragma:logout'));
        }
        return Promise.reject(error);
    },
);

/** Chamadas HTTP tipadas dos fluxos de pedidos, produtos e estoque. */
export const ordersApi = {
    list: (status?: string) => api.get<Order[]>('/orders', { params: status ? { status } : {} }),
    history: () => api.get<Order[]>('/orders/history'),
    show: (id: number) => api.get<Order>(`/orders/${id}`),
    create: (payload: OrderPayload) => api.post<OrderResponse>('/orders', payload),
    update: (id: number, payload: OrderPayload) => api.put<OrderResponse>(`/orders/${id}`, payload),
    updateStatus: (id: number, status: OrderStatus, reason?: string) =>
        api.patch<OrderResponse>(`/orders/${id}/status`, { status, reason }),
    remove: (id: number) => api.delete<MessageResponse>(`/orders/${id}`),
};

export const productsApi = {
    list: (params?: { category?: string; search?: string }) => api.get<Product[]>('/products', { params }),
    show: (id: number) => api.get<Product>(`/products/${id}`),
    create: (payload: ProductPayload) => api.post<ProductResponse>('/products', payload),
    update: (id: number, payload: ProductPayload) => api.put<ProductResponse>(`/products/${id}`, payload),
    remove: (id: number) => api.delete<MessageResponse>(`/products/${id}`),
    addons: (id: number) => api.get<ProductAddon[]>(`/products/${id}/addons`),
};

export const stockApi = {
    list: (params?: { filter?: string; search?: string }) => api.get<Ingredient[]>('/ingredients', { params }),
    show: (id: number) => api.get<Ingredient>(`/ingredients/${id}`),
    create: (payload: StockPayload) => api.post<{ message: string; ingredient: Ingredient }>('/ingredients', payload),
    update: (id: number, payload: StockPayload) =>
        api.put<{ message: string; ingredient: Ingredient }>(`/ingredients/${id}`, payload),
    remove: (id: number) => api.delete<MessageResponse>(`/ingredients/${id}`),
    restock: (id: number, payload: Partial<StockPayload> & { notes?: string; last_purchase_date?: string }) =>
        api.post<{ message: string; ingredient: Ingredient }>(`/ingredients/${id}/restock`, payload),
};

export default api;
