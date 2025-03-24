import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Chip,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
  TableChart as TableIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  DateRange as DateRangeIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Group as GroupIcon,
  Store as StoreIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import { apiServices } from '../services/api';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const PREDEFINED_REPORTS = [
  { id: 1, name: 'Aylık Satış Raporu', type: 'sales', icon: <LineChartIcon /> },
  { id: 2, name: 'Kategori Bazlı Satışlar', type: 'category', icon: <PieChartIcon /> },
  { id: 3, name: 'Stok Seviyesi Raporu', type: 'inventory', icon: <BarChartIcon /> },
  { id: 4, name: 'Müşteri Satın Alma Analizi', type: 'customer', icon: <GroupIcon /> },
  { id: 5, name: 'Tedarikçi Performans Raporu', type: 'supplier', icon: <StoreIcon /> }
];

const REPORT_TYPES = [
  { value: 'sales', label: 'Satış Raporları', icon: <ShoppingCartIcon /> },
  { value: 'inventory', label: 'Envanter Raporları', icon: <InventoryIcon /> },
  { value: 'category', label: 'Kategori Raporları', icon: <CategoryIcon /> },
  { value: 'customer', label: 'Müşteri Raporları', icon: <GroupIcon /> },
  { value: 'supplier', label: 'Tedarikçi Raporları', icon: <StoreIcon /> }
];

const Reports = () => {
  const { user } = useSelector(state => state.auth);
  const canViewReports = hasPermission(user?.role, PERMISSIONS.VIEW_REPORTS);

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [reportForm, setReportForm] = useState({
    type: '',
    name: '',
    startDate: dayjs().subtract(30, 'day'),
    endDate: dayjs(),
    format: 'pdf'
  });

  const [reportHistory, setReportHistory] = useState([]);

  useEffect(() => {
    if (activeTab === 2 || reportHistory.length === 0) {
      fetchReportHistory();
    }
  }, [activeTab]);

  const fetchReportHistory = async () => {
    try {
      setLoading(true);
      try {
        const response = await apiServices.reports.getAll();
        setReportHistory(response.data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError(`${err.message || 'Unknown error'}`);
        setReportHistory([]);
      }
    } catch (err) {
      console.error('Unexpected error in fetchReportHistory:', err);
      setError('An unexpected error occurred');
      setReportHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleReportSelect = async (report) => {
    try {
      setSelectedReport(report);
      setLoading(true);

      if (report.id && typeof report.id === 'number' && report.id <= 5) {

        const parameters = {
          start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          end_date: dayjs().format('YYYY-MM-DD')
        };

        try {
          const response = await apiServices.reports.create({
            name: report.name,
            type: report.type,
            parameters,
            format: 'pdf'
          });

          setSelectedReport(response.data);
          setReportData(response.data.data);
        } catch (createErr) {
          console.error('Error creating report:', createErr);

          setError(`Error creating report: ${createErr.message || 'Unknown error'}`);

          setReportData(getMockDataForReportType(report.type));
        }
      } else {

        try {
          const response = await apiServices.reports.getById(report.id);
          setReportData(response.data.data);
        } catch (fetchErr) {
          console.error('Error fetching report:', fetchErr);
          setError(`Error loading report: ${fetchErr.message || 'Unknown error'}`);

          setReportData(getMockDataForReportType(report.type));
        }
      }
    } catch (err) {
      console.error('Error in report selection:', err);
      setError(`Error with report: ${err.message || 'Unknown error'}`);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReportFormChange = (e) => {
    const { name, value } = e.target;
    setReportForm({
      ...reportForm,
      [name]: value
    });
  };

  const handleDateChange = (name, date) => {
    setReportForm({
      ...reportForm,
      [name]: date
    });
  };

  const handleGenerateReport = async () => {
    if (!reportForm.type || !reportForm.name) {
      setError('Lütfen rapor türü ve adını girin.');
      return;
    }

    try {
      setLoading(true);

      const parameters = {
        start_date: reportForm.startDate.format('YYYY-MM-DD'),
        end_date: reportForm.endDate.format('YYYY-MM-DD')
      };

      const response = await apiServices.reports.create({
        name: reportForm.name,
        type: reportForm.type,
        parameters,
        format: reportForm.format
      });

      await fetchReportHistory();

      setSelectedReport(response.data);
      setReportData(response.data.data);
      setActiveTab(2);
      setError(null);

      setSnackbar({
        open: true,
        message: 'Report generated successfully',
        severity: 'success'
      });

      setReportForm({
        type: '',
        name: '',
        startDate: dayjs().subtract(30, 'day'),
        endDate: dayjs(),
        format: 'pdf'
      });

    } catch (err) {
      console.error('Error generating report:', err);
      setError(`Error generating report: ${err.message || 'Unknown error'}`);
      setSnackbar({
        open: true,
        message: `Error generating report: ${err.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      setLoading(true);
      await apiServices.reports.delete(reportId);

      await fetchReportHistory();

      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(null);
        setReportData(null);
      }

      setSnackbar({
        open: true,
        message: 'Report deleted successfully',
        severity: 'success'
      });

    } catch (err) {
      console.error('Error deleting report:', err);
      setSnackbar({
        open: true,
        message: `Error deleting report: ${err.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = (report) => {

    let csvContent = '';
    let filename = '';

    switch (report.type) {
      case 'sales':
        filename = `sales-report-${report.id}.csv`;
        csvContent = 'Month,Total Sales,Order Count\n';
        if (reportData && reportData.salesByMonth) {
          reportData.salesByMonth.labels.forEach((month, index) => {
            csvContent += `${month},${reportData.salesByMonth.values[index]},${reportData.summary.totalOrders}\n`;
          });
        }
        break;

      case 'inventory':
        filename = `inventory-report-${report.id}.csv`;
        csvContent = 'Category,Product Count,Total Stock,Average Price\n';
        if (reportData && reportData.stockByCategory) {
          reportData.stockByCategory.labels.forEach((category, index) => {
            const categoryData = reportData.categoryDetails ?
              reportData.categoryDetails.find(c => c.category_name === category) : null;
            csvContent += `${category},${categoryData?.product_count || 0},${reportData.stockByCategory.values[index]},${categoryData?.average_price || 0}\n`;
          });
        }
        break;

      case 'category':
        filename = `category-report-${report.id}.csv`;
        csvContent = 'Category,Product Count,Total Stock,Inventory Value\n';
        if (reportData && reportData.categoryDetails) {
          reportData.categoryDetails.forEach(category => {
            csvContent += `${category.category_name},${category.product_count},${category.total_stock},${category.inventory_value}\n`;
          });
        }
        break;

      case 'customer':
        filename = `customer-report-${report.id}.csv`;
        csvContent = 'Customer,Email,Order Count,Total Spent\n';
        if (reportData && reportData.topCustomers) {
          reportData.topCustomers.forEach(customer => {
            csvContent += `${customer.name},${customer.email},${customer.order_count},${customer.total_spent}\n`;
          });
        }
        break;

      case 'supplier':
        filename = `supplier-report-${report.id}.csv`;
        csvContent = 'Supplier,Email,Order Count,Total Spent\n';
        if (reportData && reportData.topSuppliers) {
          reportData.topSuppliers.forEach(supplier => {
            csvContent += `${supplier.name},${supplier.email},${supplier.order_count || 0},${supplier.total_spent || 0}\n`;
          });
        }
        break;

      default:
        filename = `report-${report.id}.csv`;
        csvContent = 'No data';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbar({
      open: true,
      message: `Downloading report: ${report.name}`,
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getReportTypeIcon = (type) => {
    const reportType = REPORT_TYPES.find(rt => rt.value === type);
    return reportType ? reportType.icon : <TableIcon />;
  };

  const getReportTypeLabel = (type) => {
    const reportType = REPORT_TYPES.find(rt => rt.value === type);
    return reportType ? reportType.label : type;
  };

  const getFormatChip = (format) => {
    let color;

    switch (format.toLowerCase()) {
      case 'pdf':
        color = 'error';
        break;
      case 'excel':
        color = 'success';
        break;
      case 'csv':
        color = 'info';
        break;
      default:
        color = 'default';
    }

    return (
      <Chip
        label={format.toUpperCase()}
        color={color}
        size="small"
      />
    );
  };

  const getMockDataForReportType = (type) => {
    switch (type) {
      case 'sales':
        return {
          salesByMonth: { labels: ['No Data'], values: [0] },
          topProducts: [],
          summary: { totalSales: 0, totalOrders: 0 }
        };
      case 'inventory':
        return {
          stockByCategory: { labels: ['No Data'], values: [0] },
          lowStockProducts: [],
          summary: { totalProducts: 0, totalStock: 0, lowStockCount: 0 }
        };
      case 'category':
        return {
          categoryAnalysis: { labels: ['No Data'], values: [0] },
          categoryDetails: [],
          summary: { totalCategories: 0, totalInventoryValue: 0 }
        };
      case 'customer':
        return {
          topCustomers: [],
          summary: { totalCustomersCount: 0, totalRevenue: 0 }
        };
      case 'supplier':
        return {
          topSuppliers: [],
          summary: { totalSuppliersCount: 0, totalSpent: 0 }
        };
      default:
        return {};
    }
  };

  const renderCharts = () => {
    if (!reportData) return null;

    if (reportData.error) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Error fetching report data: {reportData.error}
          </Alert>
          <Typography variant="body1">
            Unable to display the report chart due to an error.
          </Typography>
        </Box>
      );
    }

    switch (selectedReport.type) {
      case 'sales':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Sales Over Time</Typography>
            <Box sx={{ height: 300, mb: 4 }}>
              <Line
                data={{
                  labels: reportData.salesByMonth.labels,
                  datasets: [
                    {
                      label: 'Sales',
                      data: reportData.salesByMonth.values,
                      backgroundColor: 'rgba(53, 162, 235, 0.5)',
                      borderColor: 'rgb(53, 162, 235)',
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </Box>

            <Typography variant="h6" gutterBottom>Top Products</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Quantity Sold</TableCell>
                    <TableCell align="right">Total Sales</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.topProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell align="right">{product.quantity_sold}</TableCell>
                      <TableCell align="right">${parseFloat(product.total_sales).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 'inventory':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Stock by Category</Typography>
            <Box sx={{ height: 300, mb: 4 }}>
              <Bar
                data={{
                  labels: reportData.stockByCategory.labels,
                  datasets: [
                    {
                      label: 'Total Stock',
                      data: reportData.stockByCategory.values,
                      backgroundColor: 'rgba(75, 192, 192, 0.5)',
                      borderColor: 'rgb(75, 192, 192)',
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </Box>

            <Typography variant="h6" gutterBottom>Low Stock Products</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category_name}</TableCell>
                      <TableCell align="right">{product.stock_quantity}</TableCell>
                      <TableCell align="right">${parseFloat(product.price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 'category':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Category Analysis</Typography>
            <Box sx={{ height: 300, mb: 4 }}>
              <Pie
                data={{
                  labels: reportData.categoryAnalysis.labels,
                  datasets: [
                    {
                      label: 'Inventory Value',
                      data: reportData.categoryAnalysis.values,
                      backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                        'rgba(255, 159, 64, 0.5)',
                      ],
                      borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                      ],
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </Box>

            <Typography variant="h6" gutterBottom>Category Details</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Products</TableCell>
                    <TableCell align="right">Total Stock</TableCell>
                    <TableCell align="right">Inventory Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.categoryDetails.map((category, index) => (
                    <TableRow key={index}>
                      <TableCell>{category.category_name}</TableCell>
                      <TableCell align="right">{category.product_count}</TableCell>
                      <TableCell align="right">{category.total_stock}</TableCell>
                      <TableCell align="right">${parseFloat(category.inventory_value).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 'customer':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Top Customers</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Total Spent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.topCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell align="right">{customer.order_count}</TableCell>
                      <TableCell align="right">${parseFloat(customer.total_spent).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 'supplier':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Top Suppliers</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Total Spent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.topSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>{supplier.name}</TableCell>
                      <TableCell>{supplier.email}</TableCell>
                      <TableCell align="right">{supplier.order_count}</TableCell>
                      <TableCell align="right">${parseFloat(supplier.total_spent).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      default:
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="info">No data to display for this report type.</Alert>
          </Box>
        );
    }
  };

  if (!canViewReports) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          You don't have permission to view this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        Raporlar
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Hazır Raporlar" />
          <Tab label="Yeni Rapor" />
          <Tab label="Rapor Geçmişi" />
        </Tabs>
      </Paper>

      {/* Tab 1: Predefined Reports */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Hazır Raporlar
              </Typography>
              <List>
                {PREDEFINED_REPORTS.map((report) => (
                  <ListItem
                    key={report.id}
                    button
                    selected={selectedReport?.id === report.id}
                    onClick={() => handleReportSelect(report)}
                  >
                    <ListItemIcon>
                      {report.icon}
                    </ListItemIcon>
                    <ListItemText primary={report.name} secondary={getReportTypeLabel(report.type)} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '100%' }}>
              {selectedReport ? (
                loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {selectedReport.name}
                      </Typography>
                      <Box>
                        <IconButton color="primary" title="İndir" onClick={() => handleDownloadReport(selectedReport)}>
                          <DownloadIcon />
                        </IconButton>
                        <IconButton color="primary" title="Yazdır">
                          <PrintIcon />
                        </IconButton>
                        <IconButton color="primary" title="Paylaş">
                          <ShareIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {error ? (
                      <Alert severity="error">{error}</Alert>
                    ) : reportData ? (
                      renderCharts()
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
                        No data available for this report.
                      </Typography>
                    )}
                  </>
                )
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                  <Typography variant="body1" color="text.secondary">
                    Görüntülemek için bir rapor seçin
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: New Report */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Yeni Rapor Oluştur
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Rapor Türü</InputLabel>
                <Select
                  name="type"
                  value={reportForm.type}
                  label="Rapor Türü"
                  onChange={handleReportFormChange}
                >
                  {REPORT_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1 }}>{type.icon}</Box>
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Rapor Adı"
                fullWidth
                required
                value={reportForm.name}
                onChange={handleReportFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <DatePicker
                    label="Start Date"
                    value={reportForm.startDate}
                    onChange={(date) => handleDateChange('startDate', date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DatePicker
                    label="End Date"
                    value={reportForm.endDate}
                    onChange={(date) => handleDateChange('endDate', date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Stack>
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Dosya Formatı</InputLabel>
                <Select
                  name="format"
                  value={reportForm.format}
                  label="Dosya Formatı"
                  onChange={handleReportFormChange}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateReport}
                  disabled={loading || !reportForm.type || !reportForm.name}
                >
                  {loading ? <CircularProgress size={24} /> : 'Rapor Oluştur'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tab 3: Report History */}
      {activeTab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Oluşturulan Raporlar
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <List>
              {reportHistory.length > 0 ? (
                reportHistory.map((report) => (
                  <ListItem
                    key={report.id}
                    button
                    selected={selectedReport?.id === report.id}
                    onClick={() => handleReportSelect(report)}
                  >
                    <ListItemIcon>
                      {getReportTypeIcon(report.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={report.name}
                      secondary={`${new Date(report.created_at).toLocaleString('tr-TR')}`}
                    />
                    <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center' }}>
                      {getFormatChip(report.format)}
                      <IconButton edge="end" onClick={() => handleDownloadReport(report)}>
                        <DownloadIcon />
                      </IconButton>
                      <IconButton edge="end" color="error" onClick={() => handleDeleteReport(report.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="Henüz rapor oluşturulmadı." />
                </ListItem>
              )}
            </List>
          )}
        </Paper>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Reports; 