/** Tipos compartilhados de pedidos, produtos e estoque do Pragma. */

export type OrderStatus =
    | 'pending'
    | 'development'
    | 'preparing'
    | 'ready'
    | 'delivered'
    | 'cancelled'
    | 'not_delivered'
    | 'late';

export type ProductStatus = 'ativo' | 'inativo' | 'desenvolvimento';

export interface ProductRef {
    id: number;
    name: string;
    price: number | string;
    category?: string;
    status?: ProductStatus;
    is_active?: boolean;
}

export interface ProductAddon {
    id: number;
    product_id?: number;
    name: string;
    price: number | string;
    quantity?: number;
    is_active?: boolean;
}

export interface OrderItemAddon {
    id: number;
    product_addon_id?: number;
    quantity: number;
    unit_price: number | string;
    addon?: ProductAddon;
}

export interface OrderItem {
    id?: number;
    product_id: number;
    quantity: number;
    unit_price?: number | string;
    subtotal?: number | string;
    notes?: string | null;
    product?: ProductRef;
    addons?: OrderItemAddon[];
}

export interface StatusHistoryEntry {
    id: number | string;
    status: OrderStatus;
    reason?: string | null;
    created_at?: string;
    user?: { id: number; name?: string } | null;
}

export interface Order {
    id: number;
    customer_name?: string | null;
    notes?: string | null;
    total: number | string;
    status: OrderStatus;
    created_at?: string;
    updated_at?: string;
    store_session_id?: number | null;
    items?: OrderItem[];
    status_history?: StatusHistoryEntry[];
    status_history_count?: number;
    user?: { id: number; name?: string } | null;
    storeSession?: unknown;
}

export interface Ingredient {
    id: number;
    name: string;
    quantity: number | string;
    unit: string;
    unit_cost?: number | string | null;
    status?: string;
    pivot?: {
        quantity: number | string;
        unit?: string | null;
    };
}

export interface ProductRecipeItem {
    ingredient_id: number;
    id?: number;
    name: string;
    quantity: number | string;
    unit?: string | null;
}

export interface Product {
    id: number;
    name: string;
    description?: string | null;
    notes?: string | null;
    category: string;
    price: number | string;
    status: ProductStatus;
    is_active: boolean;
    available?: boolean;
    created_at?: string;
    updated_at?: string;
    recipe?: ProductRecipeItem[];
    ingredients?: Ingredient[];
    addons?: ProductAddon[];
}

export interface MessageResponse {
    message: string;
}

export interface OrderResponse extends MessageResponse {
    order: Order;
}

export interface ProductResponse extends MessageResponse {
    product: Product;
}

export interface ApiErrors {
    errors?: Record<string, string[]>;
    message?: string;
}

export interface OrderFormItem {
    product_id: number;
    quantity: number;
    notes?: string;
    addons?: Array<{ product_addon_id: number; quantity: number }>;
}

export interface OrderPayload {
    customer_name?: string;
    notes?: string;
    items: OrderFormItem[];
}

export interface ProductPayload {
    name: string;
    category: string;
    description?: string;
    price: number;
    status: ProductStatus;
    notes?: string;
    ingredients?: Array<{ id: number; quantity: number; unit?: string }>;
}

export interface StockPayload {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    unit_cost?: number;
    expiry_date?: string | null;
}
