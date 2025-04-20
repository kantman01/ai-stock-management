import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Divider,
  Typography,
  Tab,
  Tabs,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import { apiServices } from '../services/api';
import { hasPermission } from '../utils/permissions';
import { PERMISSIONS } from '../utils/permissions';

const AITester = () => {
  const { user } = useSelector(state => state.auth);
  const canViewAIAnalytics = hasPermission(user?.role, PERMISSIONS.VIEW_AI_ANALYTICS);
  const canManageInventory = hasPermission(user?.role, PERMISSIONS.MANAGE_INVENTORY);

  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState('stock-predictions');

  
  const [forecastParams, setForecastParams] = useState({
    period: '3_months',
    product_id: '',
    category_id: ''
  });

  
  const [orderId, setOrderId] = useState('');
  const [showRawResponse, setShowRawResponse] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setResults(null);
    setError(null);

    
    switch(newValue) {
      case 0:
        setSelectedEndpoint('stock-predictions');
        break;
      case 1:
        setSelectedEndpoint('sales-forecasts');
        break;
      case 2:
        setSelectedEndpoint('recommendations');
        break;
      case 3:
        setSelectedEndpoint('order-analysis');
        break;
      case 4:
        setSelectedEndpoint('inventory-analysis');
        break;
      default:
        setSelectedEndpoint('stock-predictions');
    }
  };

  const handleForecastParamChange = (e) => {
    const { name, value } = e.target;
    setForecastParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearParams = () => {
    setForecastParams({
      period: '3_months',
      product_id: '',
      category_id: ''
    });
    setOrderId('');
  };

  const testEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      let response;

      switch (selectedEndpoint) {
        case 'stock-predictions':
          response = await apiServices.aiAnalytics.getStockPredictions();
          break;
        case 'sales-forecasts':
          
          const params = Object.fromEntries(
            Object.entries(forecastParams).filter(([_, v]) => v !== '')
          );
          response = await apiServices.aiAnalytics.getSalesForecasts(params);
          break;
        case 'recommendations':
          response = await apiServices.aiAnalytics.getRecommendations();
          break;
        case 'order-analysis':
          if (!orderId) {
            throw new Error('Order ID is required');
          }
          
          response = await apiServices.aiAnalytics.processOrder(orderId);
          break;
        case 'inventory-analysis':
          
          response = await apiServices.aiAnalytics.runInventoryAnalysis();
          break;
        default:
          throw new Error('Invalid endpoint selected');
      }

      setResults(response.data);
    } catch (err) {
      console.error('Error testing AI endpoint:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderParams = () => {
    switch (selectedEndpoint) {
      case 'sales-forecasts':
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Parameters:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="period-label">Period</InputLabel>
                  <Select
                    labelId="period-label"
                    name="period"
                    value={forecastParams.period}
                    label="Period"
                    onChange={handleForecastParamChange}
                  >
                    <MenuItem value="3_months">3 Months</MenuItem>
                    <MenuItem value="6_months">6 Months</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Product ID (Optional)"
                  name="product_id"
                  value={forecastParams.product_id}
                  onChange={handleForecastParamChange}
                  type="number"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Category ID (Optional)"
                  name="category_id"
                  value={forecastParams.category_id}
                  onChange={handleForecastParamChange}
                  type="number"
                />
              </Grid>
            </Grid>
          </Box>
        );
      case 'order-analysis':
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Parameters:</Typography>
            <TextField
              fullWidth
              size="small"
              label="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              type="number"
              required
            />
          </Box>
        );
      default:
        return null;
    }
  };

  const renderResults = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    if (!results) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          No results to display. Test an endpoint to see results here.
        </Alert>
      );
    }

    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Results:</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={showRawResponse}
                onChange={(e) => setShowRawResponse(e.target.checked)}
                size="small"
              />
            }
            label="Show Raw JSON"
          />
        </Box>
        
        {showRawResponse ? (
          <Paper sx={{ p: 2, bgcolor: 'grey.100', overflow: 'auto', maxHeight: '500px' }}>
            <pre style={{ margin: 0 }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </Paper>
        ) : (
          <Paper sx={{ p: 2, overflow: 'auto', maxHeight: '500px' }}>
            {renderFormattedResults()}
          </Paper>
        )}
      </Box>
    );
  };

  const renderFormattedResults = () => {
    
    switch (selectedEndpoint) {
      case 'stock-predictions':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {results.message}
            </Typography>
            {results.predictions && results.predictions.length > 0 ? (
              <Box>
                {results.predictions.map((prediction, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2">{prediction.name}</Typography>
                    <Typography variant="body2">
                      Recommended Order: {prediction.recommended_order_quantity}
                    </Typography>
                    <Typography variant="body2">
                      Min Stock Level: {prediction.minimum_stock_level}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {prediction.reasoning}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2">No predictions available</Typography>
            )}
          </Box>
        );
      
      case 'sales-forecasts':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {results.message}
            </Typography>
            {results.forecasts && results.forecasts.length > 0 ? (
              <Box>
                {results.forecasts.map((forecast, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2">{forecast.name}</Typography>
                    <Typography variant="body2">
                      Growth Trend: {forecast.growth_trend}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Seasonal Factors: {forecast.seasonal_factors}
                    </Typography>
                    
                    <Typography variant="body2" fontWeight="medium">Forecast by Month:</Typography>
                    {forecast.forecasted_months && forecast.forecasted_months.map((month, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
                        <Typography variant="body2">{month.month}</Typography>
                        <Typography variant="body2">Qty: {month.quantity}</Typography>
                        <Typography variant="body2">Rev: ${month.revenue}</Typography>
                      </Box>
                    ))}
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2">No forecasts available</Typography>
            )}
          </Box>
        );
      
      case 'recommendations':
        if (!results.recommendations) {
          return <Typography variant="body2">No recommendations available</Typography>;
        }
        
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {results.message}
            </Typography>
            
            {results.recommendations.inventory_optimization && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Inventory Optimization</Typography>
                {results.recommendations.inventory_optimization.map((rec, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 1, mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">{rec.title}</Typography>
                    <Typography variant="body2">{rec.description}</Typography>
                    <Chip size="small" label={rec.priority} color={
                      rec.priority === 'high' ? 'error' :
                      rec.priority === 'medium' ? 'warning' : 'success'
                    } />
                  </Paper>
                ))}
              </Box>
            )}
            
            {results.recommendations.sales_enhancement && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Sales Enhancement</Typography>
                {results.recommendations.sales_enhancement.map((rec, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 1, mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">{rec.title}</Typography>
                    <Typography variant="body2">{rec.description}</Typography>
                    <Chip size="small" label={rec.priority} color={
                      rec.priority === 'high' ? 'error' :
                      rec.priority === 'medium' ? 'warning' : 'success'
                    } />
                  </Paper>
                ))}
              </Box>
            )}
            
            {/* Additional recommendation types would be rendered similarly */}
          </Box>
        );
      
      default:
        return (
          <Box>
            <Typography variant="body2">{results.message || 'No specific formatting for this response type'}</Typography>
          </Box>
        );
    }
  };

  if (!canViewAIAnalytics) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            You don't have permission to access AI features.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title="AI API Tester" 
        subheader="Test AI endpoints and view responses"
      />
      <Divider />
      <CardContent>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3 }}
        >
          <Tab label="Stock Predictions" />
          <Tab label="Sales Forecasts" />
          <Tab label="Business Recommendations" />
          <Tab label="Order Analysis" disabled={!canManageInventory} />
          <Tab label="Inventory Analysis" disabled={!canManageInventory} />
        </Tabs>

        {renderParams()}

        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={testEndpoint}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Endpoint'}
          </Button>
          
          {(selectedEndpoint === 'sales-forecasts' || selectedEndpoint === 'order-analysis') && (
            <Button 
              variant="outlined" 
              onClick={clearParams}
              disabled={loading}
            >
              Clear Parameters
            </Button>
          )}
        </Box>

        {renderResults()}
      </CardContent>
    </Card>
  );
};

export default AITester; 