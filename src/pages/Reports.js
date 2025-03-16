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
  Chip
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
  Store as StoreIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import api from '../services/api';


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


const mockChartData = {
  salesByMonth: {
    labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs'],
    values: [45000, 52000, 48000, 60000, 57000]
  },
  salesByCategory: {
    labels: ['Elektronik', 'Giyim', 'Ev & Yaşam', 'Kitap', 'Spor'],
    values: [38000, 25000, 18000, 12000, 7000]
  },
  inventoryLevels: {
    labels: ['Elektronik', 'Giyim', 'Ev & Yaşam', 'Kitap', 'Spor'],
    values: [120, 85, 65, 200, 45]
  }
};

const Reports = () => {
  const { user } = useSelector(state => state.auth);
  const canViewReports = hasPermission(user?.role, PERMISSIONS.VIEW_REPORTS);
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  
  
  const [reportForm, setReportForm] = useState({
    type: '',
    name: '',
    startDate: dayjs().subtract(30, 'day'),
    endDate: dayjs(),
    format: 'pdf'
  });
  
  
  const [reportHistory, setReportHistory] = useState([
    { id: 101, name: 'Mayıs Satış Raporu', type: 'sales', createdAt: '2023-06-01T10:30:00', format: 'pdf' },
    { id: 102, name: 'Q2 Envanter Raporu', type: 'inventory', createdAt: '2023-06-01T11:45:00', format: 'excel' },
    { id: 103, name: 'Yıllık Kategori Analizi', type: 'category', createdAt: '2023-05-31T09:15:00', format: 'pdf' }
  ]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleReportSelect = (report) => {
    setSelectedReport(report);
    setLoading(true);
    
    
    setTimeout(() => {
      setLoading(false);
    }, 1000);
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
  
  const handleGenerateReport = () => {
    if (!reportForm.type || !reportForm.name) {
      setError('Lütfen rapor türü ve adını girin.');
      return;
    }
    
    setLoading(true);
    
    
    setTimeout(() => {
      const newReport = {
        id: Math.floor(Math.random() * 1000),
        name: reportForm.name,
        type: reportForm.type,
        createdAt: new Date().toISOString(),
        format: reportForm.format
      };
      
      setReportHistory([newReport, ...reportHistory]);
      setLoading(false);
      setSelectedReport(newReport);
      setActiveTab(2); 
      setError(null);
      
      
      setReportForm({
        type: '',
        name: '',
        startDate: dayjs().subtract(30, 'day'),
        endDate: dayjs(),
        format: 'pdf'
      });
    }, 1500);
  };
  
  const handleDownloadReport = (report) => {
    
    console.log(`Downloading report: ${report.name} (ID: ${report.id})`);
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
                        <IconButton color="primary" title="İndir">
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
                    <Box sx={{ p: 2, height: '300px', bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        Burada rapor grafiği görüntülenecektir. Bu bir demo uygulamasıdır.
                      </Typography>
                      <Box sx={{ mt: 2, height: '80%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {selectedReport.type === 'sales' && <LineChartIcon sx={{ fontSize: 100, color: 'text.secondary' }} />}
                        {selectedReport.type === 'category' && <PieChartIcon sx={{ fontSize: 100, color: 'text.secondary' }} />}
                        {selectedReport.type === 'inventory' && <BarChartIcon sx={{ fontSize: 100, color: 'text.secondary' }} />}
                        {selectedReport.type === 'customer' && <GroupIcon sx={{ fontSize: 100, color: 'text.secondary' }} />}
                        {selectedReport.type === 'supplier' && <StoreIcon sx={{ fontSize: 100, color: 'text.secondary' }} />}
                      </Box>
                    </Box>
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
      
      
      {activeTab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Oluşturulan Raporlar
          </Typography>
          
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
                    secondary={`${new Date(report.createdAt).toLocaleString('tr-TR')}`} 
                  />
                  <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center' }}>
                    {getFormatChip(report.format)}
                    <IconButton edge="end" onClick={() => handleDownloadReport(report)}>
                      <DownloadIcon />
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
        </Paper>
      )}
    </Box>
  );
};

export default Reports; 