import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Inventory,
  BarChart,
  ShowChart,
  InsertChart,
  Lightbulb,
  ExpandMore,
  Brightness1,
  ArrowUpward,
  ArrowDownward,
  RemoveCircle,
  Refresh,
  CheckCircle,
  Done,
  Settings,
} from '@mui/icons-material';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { hasPermission } from '../utils/permissions';
import { PERMISSIONS } from '../utils/permissions';
import { 
  fetchStockPredictions, 
  fetchSalesForecasts, 
  fetchRecommendations,
  fetchLatestAnalytics,
  selectStockPredictions,
  selectSalesForecasts,
  selectRecommendations,
  selectAiLoading,
  selectAiErrors,
  selectLastFetched,
  applyStockPredictions
} from '../redux/slices/aiSlice';
import { apiServices } from '../services/api';


const CACHE_TIMEOUT = 5 * 60 * 1000;

const AIInsights = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const canViewAIAnalytics = hasPermission(user?.role, PERMISSIONS.VIEW_AI_ANALYTICS);

  
  const stockPredictions = useSelector(selectStockPredictions);
  const salesForecasts = useSelector(selectSalesForecasts);
  const recommendations = useSelector(selectRecommendations);
  const loading = useSelector(selectAiLoading);
  const error = useSelector(selectAiErrors);
  const lastFetched = useSelector(selectLastFetched);

  const [activeTab, setActiveTab] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResults, setApplyResults] = useState(null);
  const [showApplySuccess, setShowApplySuccess] = useState(false);

  
  useEffect(() => {
    if (!initialLoadDone) {
      dispatch(fetchLatestAnalytics());
      setInitialLoadDone(true);
    }
  }, [dispatch, initialLoadDone]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  
  const refreshData = () => {
    if (activeTab === 0) {
      dispatch(fetchStockPredictions(false)); 
    } else if (activeTab === 1) {
      dispatch(fetchSalesForecasts({ useCache: false })); 
    } else if (activeTab === 2) {
      dispatch(fetchRecommendations(false));
    }
  };

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return <Brightness1 fontSize="small" color="error" />;
      case 'medium':
        return <Brightness1 fontSize="small" color="warning" />;
      case 'low':
        return <Brightness1 fontSize="small" color="success" />;
      default:
        return <Brightness1 fontSize="small" color="disabled" />;
    }
  };

  const getTrendIcon = (trend) => {
    if (!trend) return null;
    
    const lowercaseTrend = trend.toLowerCase();
    if (lowercaseTrend.includes('up') || lowercaseTrend.includes('increase') || lowercaseTrend.includes('growth')) {
      return <ArrowUpward fontSize="small" color="success" />;
    } else if (lowercaseTrend.includes('down') || lowercaseTrend.includes('decrease') || lowercaseTrend.includes('decline')) {
      return <ArrowDownward fontSize="small" color="error" />;
    } else {
      return <RemoveCircle fontSize="small" color="disabled" />;
    }
  };

  
  const handleApplyPredictions = () => {
    setApplyDialogOpen(true);
  };

  const handleApplyConfirm = async () => {
    setApplyLoading(true);
    try {
      let predictionsToApply = [];
      
      if (stockPredictions?.predictions) {
        if (Array.isArray(stockPredictions.predictions)) {
          predictionsToApply = stockPredictions.predictions;
        } 
        
        else if (stockPredictions.predictions.products && Array.isArray(stockPredictions.predictions.products)) {
          predictionsToApply = stockPredictions.predictions.products;
        }
        
        else if (stockPredictions.predictions.predictions && Array.isArray(stockPredictions.predictions.predictions)) {
          predictionsToApply = stockPredictions.predictions.predictions;
        }
        
        else if (typeof stockPredictions.predictions === 'object') {
          
          if (Object.keys(stockPredictions.predictions).some(k => 
              ['product_id', 'name', 'recommended_order_quantity', 'minimum_stock_level', 'reasoning'].includes(k))) {
            predictionsToApply = [stockPredictions.predictions];
          }
        }
      }
      
      
      predictionsToApply = predictionsToApply.filter(p => 
        (p.recommended_order_quantity > 0 || p.minimum_stock_level > 0)
      );
      
      if (predictionsToApply.length === 0) {
        setApplyResults({
          success: false,
          message: 'No applicable predictions found'
        });
        return;
      }
      
      console.log('Applying predictions:', predictionsToApply);
      
      
      const predictionId = stockPredictions.id || 
                         (stockPredictions.cached && stockPredictions.timestamp ? 
                            stockPredictions.timestamp : null);
      
      const response = await apiServices.aiAnalytics.applyStockPredictions(
        predictionsToApply,
        predictionId
      );
      
      setApplyResults(response.data);
      if (response.data.success) {
        setShowApplySuccess(true);
        
        dispatch(fetchStockPredictions(false));
      }
    } catch (error) {
      console.error('Error applying predictions:', error);
      setApplyResults({
        success: false,
        message: error.response?.data?.message || 'Failed to apply predictions'
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleDialogClose = () => {
    setApplyDialogOpen(false);
    
    
    setTimeout(() => {
      setApplyResults(null);
    }, 500);
  };

  const handleSnackbarClose = () => {
    setShowApplySuccess(false);
  };

  const renderStockPredictions = () => {
    if (loading.stockPredictions) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error.stockPredictions) {
      return (
        <Box>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.stockPredictions}
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.stockPredictions}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    if (!stockPredictions) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            No stock predictions available. Click "Refresh" to generate predictions.
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.stockPredictions}
            >
              Generate Predictions
            </Button>
          </Box>
        </Box>
      );
    }

    console.log('Rendering stock predictions:', stockPredictions);
    
    
    let predictionsArray = [];
    
    if (stockPredictions.predictions) {
      
      if (Array.isArray(stockPredictions.predictions)) {
        predictionsArray = stockPredictions.predictions;
      } 
      
      else if (stockPredictions.predictions.products && Array.isArray(stockPredictions.predictions.products)) {
        predictionsArray = stockPredictions.predictions.products.map(product => ({
          ...product,
          current_stock: product.stock_quantity || 'N/A'
        }));
      }
      
      else if (stockPredictions.predictions.predictions && Array.isArray(stockPredictions.predictions.predictions)) {
        predictionsArray = stockPredictions.predictions.predictions;
      }
      
      else if (typeof stockPredictions.predictions === 'object') {
        
        if (Object.keys(stockPredictions.predictions).some(k => 
            ['product_id', 'name', 'recommended_order_quantity', 'minimum_stock_level', 'reasoning'].includes(k))) {
          predictionsArray = [stockPredictions.predictions];
        }
      }
    }
    
    console.log('Parsed predictions array:', predictionsArray);

    
    predictionsArray = predictionsArray.map(prediction => {
      if (!prediction.current_stock && prediction.stock_quantity) {
        return { ...prediction, current_stock: prediction.stock_quantity };
      }
      return prediction;
    });

    if (!predictionsArray || predictionsArray.length === 0) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            All products have adequate stock levels. No predictions needed at this time.
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.stockPredictions}
            >
              Check Again
            </Button>
          </Box>
        </Box>
      );
    }

    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Low Stock Products Requiring Attention
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              Last updated: {formatLastUpdated(lastFetched.stockPredictions)}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.stockPredictions}
              size="small"
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={handleApplyPredictions}
              disabled={loading.stockPredictions || !stockPredictions?.predictions || 
                (Array.isArray(stockPredictions.predictions) && stockPredictions.predictions.length === 0)}
              size="small"
            >
              Apply Predictions
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {predictionsArray.map((prediction, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Inventory sx={{ mr: 2 }} />
                      <Typography variant="subtitle1">
                        {prediction.name || `Product ID: ${prediction.product_id || 'Unknown'}`}
                      </Typography>
                    </Box>
                    <Chip 
                      label={prediction.priority || 'Medium'} 
                      color={getPriorityColor(prediction.priority)} 
                      size="small" 
                      sx={{ ml: 2 }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {prediction.reasoning || 'No reasoning provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Current Stock:</Typography>
                            <Typography variant="body2" fontWeight="bold">{prediction.current_stock || 'N/A'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Recommended Order:</Typography>
                            <Typography variant="body2" fontWeight="bold">{prediction.recommended_order_quantity || 'N/A'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Min Stock Level:</Typography>
                            <Typography variant="body2" fontWeight="bold">{prediction.minimum_stock_level || 'N/A'}</Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Grid>
        </Grid>

        {/* Dialog for confirming application of AI predictions */}
        <Dialog
          open={applyDialogOpen}
          onClose={handleDialogClose}
          aria-labelledby="apply-predictions-dialog-title"
        >
          <DialogTitle id="apply-predictions-dialog-title">
            Apply AI Predictions
          </DialogTitle>
          <DialogContent>
            {applyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : applyResults ? (
              <Box>
                {applyResults.success ? (
                  <>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Predictions applied successfully!
                    </Alert>
                    <Typography variant="subtitle2" gutterBottom>Results:</Typography>
                    <Typography variant="body2">
                      • {applyResults.results.updated_products.length} products updated with new minimum stock levels
                    </Typography>
                    <Typography variant="body2">
                      • {applyResults.results.created_orders.length} supplier orders created
                    </Typography>
                    {applyResults.results.errors.length > 0 && (
                      <Typography variant="body2" color="error">
                        • {applyResults.results.errors.length} errors occurred
                      </Typography>
                    )}
                  </>
                ) : (
                  <Alert severity="error">
                    {applyResults.message || 'Failed to apply predictions'}
                  </Alert>
                )}
              </Box>
            ) : (
              <DialogContentText>
                This will apply the AI recommended minimum stock levels to products and create supplier orders for urgent items.
                Do you want to continue?
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} color="primary">
              {applyResults ? 'Close' : 'Cancel'}
            </Button>
            {!applyResults && !applyLoading && (
              <Button onClick={handleApplyConfirm} color="primary" variant="contained" autoFocus>
                Apply Predictions
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Success notification */}
        <Snackbar
          open={showApplySuccess}
          autoHideDuration={5000}
          onClose={handleSnackbarClose}
          message="AI predictions applied successfully"
          action={
            <IconButton size="small" color="inherit" onClick={handleSnackbarClose}>
              <Done />
            </IconButton>
          }
        />
      </>
    );
  };

  const renderSalesForecasts = () => {
    if (loading.salesForecasts) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error.salesForecasts) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.salesForecasts}
        </Alert>
      );
    }

    if (!salesForecasts || !salesForecasts.forecasts) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            No sales forecasts available. Click "Refresh" to generate forecasts.
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.salesForecasts}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>
      );
    }

    
    let forecastsArray = [];
    
    if (salesForecasts.forecasts) {
      
      if (Array.isArray(salesForecasts.forecasts)) {
        forecastsArray = salesForecasts.forecasts;
      } 
      
      else if (salesForecasts.forecasts.products && Array.isArray(salesForecasts.forecasts.products)) {
        forecastsArray = salesForecasts.forecasts.products;
      }
      
      else if (salesForecasts.forecasts.forecasts && Array.isArray(salesForecasts.forecasts.forecasts)) {
        forecastsArray = salesForecasts.forecasts.forecasts;
      }
      
      else if (typeof salesForecasts.forecasts === 'object') {
        forecastsArray = [salesForecasts.forecasts];
      }
    }

    if (forecastsArray.length === 0) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            No sales forecasts available.
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.salesForecasts}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>
      );
    }

    console.log('Parsed forecasts array:', forecastsArray);

    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Sales Forecasts for Next Period
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              Last updated: {formatLastUpdated(lastFetched.salesForecasts)}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.salesForecasts}
              size="small"
            >
              Refresh
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          {forecastsArray.map((forecast, index) => (
            <Grid item xs={12} key={index}>
              <Card sx={{ mb: 3 }}>
                <CardHeader 
                  title={forecast.name}
                  subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Growth Trend: {forecast.growth_trend}
                      </Typography>
                      {getTrendIcon(forecast.growth_trend)}
                    </Box>
                  }
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6" gutterBottom>
                        Sales Forecast
                      </Typography>
                      {forecast.forecasted_months && forecast.forecasted_months.length > 0 ? (
                        <Box sx={{ height: 250 }}>
                          <Line 
                            data={{
                              labels: forecast.forecasted_months.map(m => m.month),
                              datasets: [
                                {
                                  label: 'Forecasted Sales',
                                  data: forecast.forecasted_months.map(m => m.quantity),
                                  borderColor: 'rgba(75, 192, 192, 1)',
                                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                  tension: 0.1
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true
                                }
                              }
                            }}
                          />
                        </Box>
                      ) : (
                        <Alert severity="info">No forecast data available</Alert>
                      )}
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="h6" gutterBottom>
                        Seasonal Factors
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2">
                          {forecast.seasonal_factors || 'No seasonal factors identified.'}
                        </Typography>
                      </Paper>
                      
                      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
                        Projected Revenue
                      </Typography>
                      {forecast.forecasted_months && forecast.forecasted_months.length > 0 ? (
                        <List dense>
                          {forecast.forecasted_months.map((month, i) => (
                            <ListItem key={i}>
                              <ListItemText 
                                primary={month.month} 
                                secondary={`$${typeof month.revenue === 'number' ? month.revenue.toFixed(2) : month.revenue}`} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No revenue data available
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>
    );
  };

  const renderRecommendations = () => {
    if (loading.recommendations) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error.recommendations) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.recommendations}
        </Alert>
      );
    }

    if (!recommendations || !recommendations.recommendations) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            No business recommendations available. Click "Refresh" to generate recommendations.
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.recommendations}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>
      );
    }

    const recommendationData = recommendations.recommendations;

    const recommendationSections = [
      { key: 'inventory_optimization', title: 'Inventory Optimization', icon: <Inventory /> },
      { key: 'sales_enhancement', title: 'Sales Enhancement', icon: <TrendingUp /> },
      { key: 'category_management', title: 'Category Management', icon: <BarChart /> },
      { key: 'growth_opportunities', title: 'Growth Opportunities', icon: <ShowChart /> }
    ];

    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Business Strategy Recommendations
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              Last updated: {formatLastUpdated(lastFetched.recommendations)}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={refreshData}
              disabled={loading.recommendations}
              size="small"
            >
              Refresh
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          {recommendationSections.map(section => (
            <Grid item xs={12} md={6} key={section.key}>
              <Card>
                <CardHeader 
                  avatar={section.icon}
                  title={section.title}
                />
                <Divider />
                <CardContent>
                  {recommendationData[section.key] && Array.isArray(recommendationData[section.key]) && recommendationData[section.key].length > 0 ? (
                    <List>
                      {recommendationData[section.key].map((rec, idx) => (
                        <ListItem key={idx} alignItems="flex-start">
                          <ListItemIcon>
                            <Lightbulb color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2">{rec.title}</Typography>
                                <Chip 
                                  label={rec.priority} 
                                  color={getPriorityColor(rec.priority)} 
                                  size="small" 
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            }
                            secondary={rec.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      No {section.title.toLowerCase()} recommendations available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>
    );
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI Analytics & Insights
      </Typography>
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          icon={<Inventory />} 
          label="Stock Predictions" 
          iconPosition="start"
        />
        <Tab 
          icon={<ShowChart />} 
          label="Sales Forecasts" 
          iconPosition="start"
        />
        <Tab 
          icon={<Lightbulb />} 
          label="Business Recommendations" 
          iconPosition="start"
        />
      </Tabs>
      
      {activeTab === 0 && renderStockPredictions()}
      {activeTab === 1 && renderSalesForecasts()}
      {activeTab === 2 && renderRecommendations()}
    </Box>
  );
};

export default AIInsights; 