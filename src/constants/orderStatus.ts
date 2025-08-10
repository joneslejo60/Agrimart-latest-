// Order Status Constants
// These IDs correspond to the actual status IDs from the API /api/OrderStatus

export const ORDER_STATUS = {
  NEW: "057993b3-25d8-4c6b-8a9e-e3fe997938d0",
  PENDING: "a1b2c3d4-e5f6-7890-1234-567890abcdef", 
  PROCESSING: "0eab3a6d-400c-48de-8929-4578e3ccab6a",
  SHIPPED: "b95df366-3c86-462a-9986-0e77b3f78469",
  DELIVERED: "c3b745e3-e756-442e-bfce-7dde4e5a53a3",
  CANCELLED: "39231369-9430-4222-be81-2f672942964c",
  REFUNDED: "58630249-b6ad-4121-b38d-6162451a00ec"
} as const;

export const ORDER_STATUS_NAMES = {
  [ORDER_STATUS.NEW]: "New",
  [ORDER_STATUS.PENDING]: "Pending", 
  [ORDER_STATUS.PROCESSING]: "Processing",
  [ORDER_STATUS.SHIPPED]: "Shipped",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
  [ORDER_STATUS.REFUNDED]: "Refunded"
} as const;

// Helper function to get status name by ID
export const getOrderStatusName = (statusId: string): string => {
  return ORDER_STATUS_NAMES[statusId as keyof typeof ORDER_STATUS_NAMES] || "Unknown";
};