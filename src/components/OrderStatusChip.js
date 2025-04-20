import React from 'react';
import { Chip } from '@mui/material';
import {
  Pending as PendingIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

/**
 * A reusable component to display order status as a chip with appropriate colors and icons
 */
const OrderStatusChip = ({ status }) => {
  
  const normalizedStatus = status?.toUpperCase();

  const getStatusColor = () => {
    switch (normalizedStatus) {
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return 'info';
      case 'SHIPPED':
        return 'primary';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (normalizedStatus) {
      case 'PENDING':
        return <PendingIcon fontSize="small" />;
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return <InventoryIcon fontSize="small" />;
      case 'SHIPPED':
        return <ShippingIcon fontSize="small" />;
      case 'DELIVERED':
      case 'COMPLETED':
        return <CompleteIcon fontSize="small" />;
      case 'CANCELLED':
        return <CancelIcon fontSize="small" />;
      default:
        return null;
    }
  };

  
  const getDisplayStatus = () => {
    switch (normalizedStatus) {
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'PENDING':
      case 'SHIPPED':
      case 'DELIVERED':
      case 'COMPLETED':
      case 'CANCELLED':
        return normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase();
      default:
        return status;
    }
  };

  return (
    <Chip
      icon={getStatusIcon()}
      label={getDisplayStatus()}
      color={getStatusColor()}
      size="small"
    />
  );
};

export default OrderStatusChip; 