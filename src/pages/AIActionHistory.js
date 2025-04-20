import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Inventory,
  ShoppingCart,
  ShowChart,
  Lightbulb,
  LocalShipping,
  Route
} from '@mui/icons-material';
import { apiServices } from '../services/api';
import { hasPermission } from '../utils/permissions';
import { PERMISSIONS } from '../utils/permissions';
import { formatDistanceToNow } from 'date-fns';

const AIActionHistory = () => {
  const { user } = useSelector(state => state.auth);
  const canViewAIAnalytics = hasPermission(user?.role, PERMISSIONS.VIEW_AI_ANALYTICS);

  const [aiActions, setAiActions] = useState([]);
  const [aiInteractions, setAiInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchAIHistory();
  }, []);

  const fetchAIHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const actionsResponse = await apiServices.aiAnalytics.getActions({ limit: 100 });
      const interactionsResponse = await apiServices.aiAnalytics.getInteractions({ limit: 100 });

      setAiActions(actionsResponse.data.actions || []);
      setAiInteractions(interactionsResponse.data.interactions || []);
    } catch (err) {
      console.error('Error fetching AI history:', err);
      setError('Failed to load AI history data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionTypeIcon = (type) => {
    switch (type) {
      case 'stock_prediction':
      case 'restock_recommendation':
        return <Inventory color="primary" />;
      case 'sales_forecast':
        return <ShowChart color="primary" />;
      case 'business_recommendation':
        return <Lightbulb color="primary" />;
      case 'create_supplier_order':
        return <LocalShipping color="primary" />;
      case 'order_analysis':
        return <ShoppingCart color="primary" />;
      default:
        return <Route color="primary" />;
    }
  };

  const getActionTypeLabel = (type) => {
    switch (type) {
      case 'stock_prediction':
        return 'Stock Prediction';
      case 'restock_recommendation':
        return 'Restock Recommendation';
      case 'sales_forecast':
        return 'Sales Forecast';
      case 'business_recommendation':
        return 'Business Recommendation';
      case 'create_supplier_order':
        return 'Created Supplier Order';
      case 'order_analysis':
        return 'Order Analysis';
      default:
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (err) {
      return 'Unknown date';
    }
  };

  const formatActionData = (action) => {
    if (!action || !action.action_data) return 'No data';
    
    try {
      const data = action.action_data;
      
      
      switch (action.action_type) {
        case 'stock_prediction':
          return (
            <Box>
              <Typography variant="subtitle2">Analyzed Products:</Typography>
              <Typography variant="body2">Products: {data.summary?.split('products')[0] || 'N/A'}</Typography>
              {data.predictions !== undefined && <Typography variant="body2">Predictions: {data.predictions}</Typography>}
              {data.critical_items !== undefined && <Typography variant="body2">Critical Items: {data.critical_items}</Typography>}
            </Box>
          );
          
        case 'business_recommendation':
          return (
            <Box>
              <Typography variant="subtitle2">Business Insights:</Typography>
              <Typography variant="body2">{data.summary || 'Business analysis completed'}</Typography>
              {data.category_insights && <Typography variant="body2">Categories Analyzed: {data.category_insights}</Typography>}
              {data.recommendation_count && <Typography variant="body2">Recommendations: {data.recommendation_count}</Typography>}
            </Box>
          );
          
        case 'create_supplier_order':
          return (
            <Box>
              <Typography variant="subtitle2">Supplier Order Details:</Typography>
              <Typography variant="body2">Supplier: {data.supplier_name || 'N/A'}</Typography>
              <Typography variant="body2">
                Items: {Array.isArray(data.items) 
                  ? data.items.map((item, idx) => (
                      <span key={idx}>
                        {`Item ${idx + 1}: ${item.quantity || ''} × ${item.product_name} @ $${typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : item.unit_price || 0}`}
                        {idx < data.items.length - 1 ? ', ' : ''}
                        { <br />}
                      </span>
                    ))
                  : (typeof data.items === 'number' ? data.items : 'N/A')
                }
              </Typography>
              <Typography variant="body2">Total Amount: ${typeof data.total_amount === 'number' ? data.total_amount.toFixed(2) : data.total_amount || 'N/A'}</Typography>
              {data.order_id && <Typography variant="body2">Order ID: {data.order_id}</Typography>}
            </Box>
          );
          
        case 'order_analysis':
          return (
            <Box>
              <Typography variant="subtitle2">Order Analysis:</Typography>
              <Typography variant="body2">{data.summary || 'Order analysis completed'}</Typography>
              {data.insights && <Typography variant="body2">Insights: {formatValue(data.insights)}</Typography>}
              {data.recommendations && <Typography variant="body2">Recommendations: {formatValue(data.recommendations)}</Typography>}
            </Box>
          );
          
        default:
          
          if (typeof data === 'string') return data;
          
          if (data.summary) {
            return (
              <Box>
                <Typography variant="body2">{data.summary}</Typography>
              </Box>
            );
          }
          
          
          return (
            <Box>
              {Object.entries(data).map(([key, value]) => (
                <Typography key={key} variant="body2">
                  <strong>{key.replace(/_/g, ' ')}:</strong> {formatValue(value)}
                </Typography>
              ))}
            </Box>
          );
      }
    } catch (err) {
      console.error('Error formatting action data:', err);
      return 'Error displaying data';
    }
  };
  
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (typeof item === 'object') {
          
          if (item && 'product_id' in item) {
            return `Item ${index + 1}: ${item.quantity || ''} × ${item.product_name} @ $${typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : item.unit_price || 0}`;
          }
          
          return JSON.stringify(item);
        }
        return String(item);
      }).join(', ');
    }
    
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    
    return String(value);
  };

  if (!canViewAIAnalytics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          You do not have permission to view AI analytics. Please contact your system administrator.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI Action History
      </Typography>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          AI Actions
        </Typography>
        <Divider />
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Action Type</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aiActions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((action) => (
                  <TableRow key={action.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getActionTypeIcon(action.action_type)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {getActionTypeLabel(action.action_type)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {formatActionData(action)}
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(action.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              {aiActions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No AI actions recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={aiActions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Paper sx={{ width: '100%' }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          AI Interactions
        </Typography>
        <Divider />
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Request</TableCell>
                <TableCell>Response</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aiInteractions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((interaction) => (
                  <TableRow key={interaction.id} hover>
                    <TableCell>
                      <Chip 
                        label={getActionTypeLabel(interaction.type)} 
                        color="primary" 
                        size="small" 
                        icon={getActionTypeIcon(interaction.type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Accordion sx={{ boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="body2">
                            View Request
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#f5f5f5' }}>
                          <pre style={{ margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {JSON.stringify(interaction.request_data, null, 2)}
                          </pre>
                        </AccordionDetails>
                      </Accordion>
                    </TableCell>
                    <TableCell>
                      <Accordion sx={{ boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="body2">
                            View Response
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#f5f5f5' }}>
                          <pre style={{ margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {JSON.stringify(interaction.response_data, null, 2)}
                          </pre>
                        </AccordionDetails>
                      </Accordion>
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(interaction.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              {aiInteractions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No AI interactions recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={aiInteractions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default AIActionHistory; 