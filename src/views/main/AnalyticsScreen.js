import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, ScrollView, View, StyleSheet, Dimensions, TouchableOpacity, Animated, Modal as ModalRN } from 'react-native';
import { Layout, Text, Card, Modal, List, ListItem, useTheme, Icon, Divider, OverflowMenu, MenuItem, Button, StyleService, useStyleSheet, TopNavigationAction } from '@ui-kitten/components';
import { MaterialIcons, Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { Table, TableWrapper, Row, Rows } from 'react-native-table-component';
import { DatePickerModal } from 'react-native-paper-dates';
import moment from 'moment';
import { supabase } from '../../constants/supabase';
import DateFilterModal from '../main/DateFilterModal';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import {
	LineChart, ContributionGraph
} from 'react-native-chart-kit'
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-gifted-charts';
import CustomerPaymentPending from './CustomerPaymentPending';
import SalesOverviewCard from './SalesOverviewCard';
import EnhancedHeatmap from './EnhancedHeatmap';
import CostPieChart from './CostPieChart';
import ARPCCard from './ARPCCard';
import XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import * as FileSystem from 'expo-file-system';
import analyticsCache from './analyticsCache';
import eventEmitter from './eventEmitter';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RefreshIcon } from "../extra/icons";

const width = Dimensions.get('window').width
const height = 220

const StatsScreen = forwardRef((props, ref) => {
	const theme = useTheme();
	const styles = useStyleSheet(themedStyles);
	const scrollViewRef = useRef(null);
	const { isConnected } = useNetwork();
	const navigation = useNavigation();
	const [menuVisible, setMenuVisible] = useState(false)
	const [selectedChart, setSelectedChart] = useState("Revenue");
    const [sortColumn, setSortColumn] = useState(0);
    const [sortDirection, setSortDirection] = useState('asc');
    const [widthArrEmp, setWidthArrEmp] = useState([70, 100, 65, 60, 70]);
	const [widthArr, setWidthArr] = useState([80, 65, 80, 85]);
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const { currentUser } = useUser();
	  const [showDatePicker, setShowDatePicker] = useState(false);
	    const [modalVisible, setModalVisible] = useState(false);
	  const [filterTypeStr, setFilterTypeStr] = useState('This Year');
	  const [filterType, setFilterType] = useState('this-year');
	  const [loading, setLoading] = useState(false);
	  const [orderCnt, setOrderCnt] = useState(0);
	  const [custCnt, setCustCnt] = useState(0);
	  const [revenueVal, setRevenueVal] = useState(0);
	  const [topProducts, setTopProducts] = useState([]);
	  const [topCustomers, setTopCustomers] = useState([]);
	  const [recCustomers, setRecCustomers] = useState([]);
	  const [salesTrendLabels, setSalesTrendLabels] = useState([]);
	  const [salesTrendData, setSalesTrendData] = useState([]);
	  const [heatmapOrders, setHeatmapOrders] = useState([]);
	  const [oldNewOrders, setOldNewOrders] = useState([]);
	  const [oldNewRev, setOldNewRev] = useState([]);
	  const [empProd, setEmpProd] = useState([]);
	  const [heatmapNumDays, setHeatmapNumDays] = useState(90);
	  const a = moment(new Date()).format('YYYY-MM-DD');
	  const b = moment(`${currentYear}-01-01`).utcOffset(5.5).format("YYYY-MM-DD");
	  const [dateRange, setDateRange] = useState(null);
	  const [dateRangeStart, setDateRangeStart] = useState(b);
	  const [dateRangeEnd, setDateRangeEnd] = useState(a);
	  const [profitMargin, setProfitMargin] = useState(0);
	  const [newCustCount, setNewCustCount] = useState(0);
	  const [arpc, setArpc] = useState(0);
	  const [analyticsState, setAnalyticsState] = useState({});
	  const [chartData, setChartData] = useState([]);
	  
	  const getDateRange = (filterType, customStart = null, customEnd = null) => {
		  const today = a;
		  
		  if (customStart && customEnd) {
			return { start: customStart, end: customEnd };
		  }
		  
		  switch (filterType) {
			case 'this-year':
			  return { start: b, end: today };
			case 'this-month':
			  return { 
				start: moment().startOf('month').format('YYYY-MM-DD'), 
				end: today 
			  };
			default:
			  return { start: b, end: today };
		  }
		};

		// Generic function to fetch analytics data
		const fetchAnalyticsData = async (filterType, customStart = null, customEnd = null, onlyEmployeeData = false) => {
		  const { start: formattedDate, end: today } = getDateRange(filterType, customStart, customEnd);
		  const nextDay = moment(today).add(1, 'days').format('YYYY-MM-DD');
		  
		  console.log(`Updating ${onlyEmployeeData ? 'employee productivity' : 'critical metrics'} for ${filterType}${onlyEmployeeData ? '' : ` - revenue and profit margin ${formattedDate},${nextDay}`}`);
		  
		  if (onlyEmployeeData) {
			const { data: empData, error: empError } = await supabase.rpc("get_employee_prod_efficiency", { parameter1: formattedDate, parameter2: today });
			
			if (empError) {
			  throw new Error(`Error fetching employee productivity data for ${filterType}`);
			}
			
			return {
			  empProd: empData
			};
		  }

		  const [
			{ data: orderCount, error: orderCountError },
			{ data: customerCount, error: customerCountError },
			{ data: revenueData, error: revenueDataError },
			{ data: profitMarginData, error: profitMarginError },
			{ data: newCustData, error: newCustError },
			{ data: pieData, error: pieError }
		  ] = await Promise.all([
			supabase.rpc("get_orders_count", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select().single(),
			supabase.rpc("get_customers_count", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select().single(),
			supabase.rpc("get_revenue", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: nextDay }).select().single(),
			supabase.rpc("get_profit_margin", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: nextDay }).select().single(),
			supabase.rpc("get_new_customers_count", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select().single(),
			supabase.from('IncomeExpense').select('category, amount').eq('username', currentUser.username).eq('entryType', 'Expense')
		  ]);

		  // Handle errors
		  if (orderCountError || customerCountError || revenueDataError || profitMarginError || newCustError || pieError) {
			throw new Error(`Error fetching critical metrics for ${filterType}`);
		  }

		  return {
			orderCount: orderCount.count,
			customerCount: customerCount.count,
			revenueVal: revenueData.sum,
			profitMargin: profitMarginData.sum,
			newCustCount: newCustData.count
		  };
		};

		// Function to update state and cache
		const updateStateAndCache = (data, filterType, onlyEmployeeData) => {
		  console.log(`Updated ${onlyEmployeeData ? 'employee productivity' : 'metrics'} for ${filterType}:`, data);
  
		  if (onlyEmployeeData) {
			// Update only employee productivity state
			setEmpProd(data.empProd);
			if (analyticsCache.isValid(filterType)) {
				const cachedData = { ...analyticsCache.get(filterType).value };
				cachedData.empProd = data.empProd; 
				analyticsCache.set(filterType, cachedData);
			}
			return;
		  }

		  // Update state with new values
		  setOrderCnt(data.orderCount);
		  setCustCnt(data.customerCount);
		  setRevenueVal(data.revenueVal);
		  setProfitMargin(data.profitMargin);
		  setNewCustCount(data.newCustCount);	
		  
		  // Update cache if it exists
		  if (analyticsCache.isValid(filterType)) {
			const cachedData = { ...analyticsCache.get(filterType).value };
			Object.assign(cachedData, data);
			analyticsCache.set(filterType, cachedData);
		  }
		};

	  const handleTransactionAdded = async (options = {}) => {
		  const { onlyEmployeeData = false } = options;
		  
		  console.warn(`in updateCriticalMetrics${onlyEmployeeData ? ' (employee data only)' : ''}`);
		  const filterTypes = ['this-year', 'this-month'];
		  try {
					setLoading(true);
					  const results = await Promise.allSettled(
						filterTypes.map(async (filterType) => {
						  const data = await fetchAnalyticsData(filterType, null, null, onlyEmployeeData);
						  return { filterType, data };
						})
					  );
					  // Process results
					  results.forEach((result, index) => {
						if (result.status === 'fulfilled') {
						  const { filterType, data } = result.value;
						  updateStateAndCache(data, filterType, onlyEmployeeData);
						} else {
						  console.error(`Failed to update ${filterTypes[index]}:`, result.reason);
						}
					  });
				} catch(error) {
					console.log(error);
				} finally {
					setLoading(false);
				}
		};
	  
	  useEffect(() => {
		  console.log('in useEffect update')
		  eventEmitter.once('transactionAdded', handleTransactionAdded);
	  }, []);
	  
	  const getAllData = async() => {
				try {
					console.log('in getallData')
					setLoading(true);
				  let today = a;
				  let formattedDate = b;
				  if(dateRangeStart && dateRangeEnd) {
					  formattedDate = dateRangeStart;
					  today = dateRangeEnd;
				  }
				  const nextDay = moment(today).add(1, 'days').format('YYYY-MM-DD');
				  let diff = (new Date(today) - new Date(formattedDate))/(1000 * 60 * 60 * 24);
					setHeatmapNumDays(diff);
					console.log('today, formattedDate, diff: ' + today + ',' + formattedDate + ',' + diff + ',' + nextDay);

				const [
				  { data: orderCount, error: orderCountError },
				  { data: customerCount, error: customerCountError },
				  { data: revenueData, error: revenueDataError },
				  { data: topProductsData, error: topProductsError },
				  { data: topCustomersData, error: topCustomersError },
				  { data: recurrentCustomersData, error: recurrentCustomersError },
				  { data: heatmapOrdersData, error: heatmapOrdersError },
				  { data: salesTrend, error: salesTrendError },
				  { data: oldNewOrdersData, error: oldNewOrdersError },
				  { data: oldNewRevenue, error: oldNewRevenueError },
				  { data: profitMarginData, error: profitMarginError },
				  { data: newCustData, error: newCustError },
				  { data: arpcData, error: arpcError },
				  { data: empData, error: empError },
				  { data: pieData, error: pieError }
				] = await Promise.all([
				  supabase.rpc("get_orders_count", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select().single(),
				  supabase.rpc("get_customers_count", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select().single(),
				  supabase.rpc("get_revenue", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: nextDay }).select().single(),
				  supabase.rpc("get_top_products", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }),
				  supabase.rpc("get_top_customers", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }),
				  supabase.rpc("get_recurrent_customers", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }),
				  supabase.rpc("get_heatmap_orders", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }),
				  supabase.rpc("get_sales_trend", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }),
				  supabase.rpc("get_old_new_orders", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select(),
				  supabase.rpc("get_old_new_revenue", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select(),
				  supabase.rpc("get_profit_margin", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: nextDay }).select().single(),
				  supabase.rpc("get_new_customers_count", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select().single(),
				  supabase.rpc("get_arpc", { parameter1: currentUser.username, parameter2: formattedDate, parameter3: today }).select().single(),
				  supabase.rpc("get_employee_prod_efficiency", { parameter1: formattedDate, parameter2: today }),
				  supabase.from('IncomeExpense').select('category, amount').eq('username', currentUser.username).eq('entryType', 'Expense')
				]);

				// Handle errors if any of the API calls fail
				if (orderCountError || customerCountError || revenueDataError || 
					topProductsError || topCustomersError || recurrentCustomersError || heatmapOrdersError || 
					salesTrendError || oldNewOrdersError || oldNewRevenueError || profitMarginError || newCustError || arpcError || empError || pieError) {
				  console.error('Error fetching data from API');
				  console.error(orderCountError || customerCountError || revenueDataError || 
					topProductsError || topCustomersError || recurrentCustomersError || heatmapOrdersError || 
					salesTrendError || oldNewOrdersError || oldNewRevenueError || profitMarginError || newCustError || arpcError || empError || pieError)
				  return;
				}

				console.log('Order count:', orderCount.count);
				console.log('Distinct customer count:', customerCount.count);
				console.log('Total revenue:', revenueData.sum);
				console.log('Top 5 Products:', topProductsData);
				console.log('Top 5 Customers:', topCustomersData);
				console.log('Recurrent Customers:', recurrentCustomersData);
				console.log('Orders heatmap:', heatmapOrdersData);
				console.log('Sales Trend:', salesTrend);
				console.log('Old Vs New Orders:', oldNewOrdersData);
				console.log('Old Vs New Revenue:', oldNewRevenue);
				console.log('Profit margin:', profitMarginData);
				console.log('New customers count:', newCustData);
				console.log('ARPC:', arpcData);
				console.log('Emp prod data:', empData);
				console.log('Pie data:', pieData);

				const transformedData1 = oldNewOrdersData.map(item => ({
				  stacks: [
					{ value: item.count_before_month, color: theme["color-primary-100"] },
					{ value: item.count_in_month, color: theme["color-primary-500"], marginBottom: 1 }
				  ],
				  label: item.order_month_name
				}));
				console.log('transformedData1:', transformedData1);

				const transformedData2 = oldNewRevenue.map(item => ({
				  stacks: [
					{ value: item.revenue_before_month, color: theme["color-primary-100"] },
					{ value: item.revenue_in_month, color: theme["color-primary-500"], marginBottom: 1 }
				  ],
				  label: item.order_month_name
				}));
				console.log('transformedData2:', transformedData2);
				
				const grouped = data.reduce((acc, item) => {
				  acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
				  return acc;
				}, {});

				// Convert to chart-friendly format
				const colors = [
				  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9D4EDD', '#FF9F1C',
				  '#F06595', '#51CF66', '#339AF0', '#845EF7'
				];

				const formattedData = Object.entries(grouped).map(([category, value], i) => ({
				  text: category,
				  value,
				  color: colors[i % colors.length],
				}));

				setChartData(formattedData);
				
					const transformedArray = topProductsData.map(({ dressType, avg, count, sum }) => [
					  dressType, avg, count, sum
					]);
					const labels = salesTrend.map(item => item.label);
					const values = salesTrend.map(item => item.value);
					setOrderCnt(orderCount.count);
					setCustCnt(customerCount.count);
					setRevenueVal(revenueData.sum);
					setTopProducts(transformedArray);
					setTopCustomers(topCustomersData);
					setRecCustomers(recurrentCustomersData);
					setHeatmapOrders(heatmapOrdersData);
					setSalesTrendLabels(labels)
					setSalesTrendData(values)
					setOldNewOrders(transformedData1);
					setOldNewRev(transformedData2);
					setProfitMargin(profitMarginData.sum);
					setNewCustCount(newCustData.count);
					setArpc(arpcData.arpc);
					setEmpProd(empData);

					const dashboardData = {
					  orderCount: orderCount.count,
					  customerCount: customerCount.count,
					  revenueVal: revenueData.sum,
					  topProducts: transformedArray,
					  topCustomers: topCustomersData,
					  recurrentCustomers: recurrentCustomersData,
					  heatmapOrders: heatmapOrdersData,
					  salesTrendLabels: labels,
					  salesTrendData: values,
					  oldNewOrders: transformedData1,
					  oldNewRev: transformedData2,
					  profitMargin: profitMarginData.sum,
					  newCustCount: newCustData.count,
					  arpc: arpcData.arpc,
					  empProd: empData
					};
					console.log('dashboardData:');
					console.log(dashboardData);
					analyticsCache.set(filterType, dashboardData);
					/*setAnalyticsState(dashboardData);
					setAnalyticsState(prevState => {
					  console.log('Updated analyticsState:');
					  console.log(prevState); // This will show the new state
					  console.log(prevState.revenueVal);
					  console.log(prevState.topProducts.map((row, index) => console.log(row + ',' + index)));
					  return prevState; // Return unchanged to avoid another state update
					});*/
				} catch(error) {
					console.log(error);
				} finally {
					setLoading(false);
				}
		}
	  
	  useEffect(() => {
			if(!isConnected) {
				 showErrorMessage("No Internet Connection");
			} else {
				if (filterType !== 'custom' && analyticsCache.isValid(filterType, { refreshDaily: true })) {
					console.log('getting from cache');
					const analyticsData = analyticsCache.get(filterType).value;
					setOrderCnt(analyticsData.orderCount);
					setCustCnt(analyticsData.customerCount);
					setRevenueVal(analyticsData.revenueVal);
					setTopProducts(analyticsData.topProducts);
					setTopCustomers(analyticsData.topCustomers);
					setRecCustomers(analyticsData.recurrentCustomers);
					setHeatmapOrders(analyticsData.heatmapOrders);
					setSalesTrendLabels(analyticsData.salesTrendLabels)
					setSalesTrendData(analyticsData.salesTrendData)
					setOldNewOrders(analyticsData.oldNewOrders);
					setOldNewRev(analyticsData.oldNewRev);
					setProfitMargin(analyticsData.profitMargin);
					setNewCustCount(analyticsData.newCustCount);
					setArpc(analyticsData.arpc);
					setEmpProd(analyticsData.empProd)
					//setAnalyticsState(analyticsData);
					
						let diff = (new Date(a) - new Date(b))/(1000 * 60 * 60 * 24);
						setHeatmapNumDays(diff);
						console.log('today, formattedDate, diff: ' + diff + b + a);
					
					return;
				}
				console.log('getting from db');
				getAllData();
			}
	  }, [dateRangeStart, dateRangeEnd]);
	  
	  useImperativeHandle(ref, () => ({
		getAllData
	  }));	  
	  
	  const handleButtonPress = () => {
		setModalVisible(true);
	  };
	  
	  const handleApply = (filterData) => {
		console.log('Filter applied:', filterData);
		setFilterTypeStr(filterData.filterTypeStr);
		setFilterType(filterData.filterType);
		setDateRange(filterData.dateRange);
		setDateRangeStart(filterData.dateRangeStart);
		setDateRangeEnd(filterData.dateRangeEnd);
	  };

  const productsHead = ['Name', 'Avg Price', '# Orders', 'Revenue'];
  
  const empHead = ['Name', 'Designation', 'Salary', 'No. of pcs', 'Cost/pc'];
  
const customersHead = ['Name', 'No. of Orders', 'Total Revenue'];
  
  const MoreIcon = (props) => (
	  <Ionicons {...props} name='options-outline' size={24} color={theme['color-primary-500']}/>
	);
	
  const CalendarIcon = (props) => (
	  <Ionicons {...props} name='calendar-outline' size={20} color={theme['color-primary-500']}/>
	);
	
const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  
const handleMenuSelect = (chartType) => {
    setSelectedChart(chartType);
    toggleMenu();
  };
  
    const renderItem = ({ item, index }) => (
    <ListItem
	  style={{backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff'}}
      title={() => (
		<Text category='label' style={{textTransform: 'capitalize'}}>{item.custName}</Text>
	  )}
      description={() => (
        <Layout style={[styles.row, {backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff'}]}>
          <Text category='s2' style={{marginTop: 5}}>{'Orders: ' + item.count}</Text>
          <Text category='s2'>Revenue: <Text category='s2' style={{color: 'green'}}>{item.sum}</Text></Text>
        </Layout>
      )}
      onPress={() => handleItemPress(item.custName)}
    />
  );

  const handleItemPress = (name) => {
    console.log(`Clicked on: ${name}`);
	navigation.navigate('OrderDetailsMain', {screen: 'Home',
					params: { custName: name.trim() }
				});
  };
  
  const handleSort = (column) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    const sortedData = [...topProducts].sort((a, b) => {
      if (a[column] < b[column]) return direction === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setSortColumn(column);
    setSortDirection(direction);
    setTopProducts(sortedData);
  };

  const renderHeader = () => {
    return productsHead.map((col, index) => (
		<View key={index} style={[styles.headerCell, { width: widthArr[index] }]}>
		  <Text style={styles.headerText}>{col}</Text>
			<TouchableOpacity onPress={() => handleSort(index)} style={styles.sortArrow}>
			  <Text style={styles.arrowText}>
				{sortColumn === index ? (sortDirection === 'asc' ? '↑' : '↓') : '↑'}
			  </Text>
			</TouchableOpacity>
		</View>
    ));
  };
  
    const renderRows = () => {
		return topProducts.map((rowData, rowIndex) => (
		  <TableWrapper
			key={rowIndex}
			style={[
			  styles.cell,
			  { backgroundColor: rowIndex % 2 === 0 ? '#f9f9f9' : '#ffffff' },
			]}
		  >
			{rowData.map((cellData, cellIndex) => (
			  <Text
				key={cellIndex}
				style={[styles.cellText, { width: widthArr[cellIndex] }]}
			  >
				{cellData}
			  </Text>
			))}
		  </TableWrapper>
		));
  };
  
  const renderHeaderEmp = () => {
    return empHead.map((col, index) => (
		<View key={index} style={[styles.headerCellEmp, { width: widthArrEmp[index] }]}>
		  <Text style={styles.headerText}>{col}</Text>
			<TouchableOpacity onPress={() => handleSort(index)} style={styles.sortArrow}>
			  <Text style={styles.arrowText}>
				{sortColumn === index ? (sortDirection === 'asc' ? '↑' : '↓') : '↑'}
			  </Text>
			</TouchableOpacity>
		</View>
    ));
  };
  
    const renderRowsEmp = () => {
		console.log('renderRowsEmp', empProd);
		return empProd.map((rowData, rowIndex) => {
			const cellValues = [
			  rowData.name,
			  rowData.designation,
			  rowData.salary,
			  rowData.total_count,
			  rowData.cost_per_pc
			];
			
			return (
			  <TableWrapper
				key={rowIndex}
				style={[
				  styles.cellEmp,
				  { backgroundColor: rowIndex % 2 === 0 ? '#f9f9f9' : '#ffffff' },
				]}
			  >
				{cellValues.map((cellData, cellIndex) => (
				  <Text
					key={cellIndex}
					style={[styles.cellTextEmp, { width: widthArrEmp[cellIndex] }]}
				  >
					{cellData}
				  </Text>
				))}
			  </TableWrapper>
			);
	});
  };
  
  const lineChartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
	color: (opacity = 1) => `rgba(0, 0, 153, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
	decimalPlaces: 0, // Remove decimal places if not needed
	  propsForBackgroundLines: {
		stroke: "transparent", // Hide grid lines
	  },
  }
  
  const heatMapChartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(${0}, ${0}, ${153}, ${opacity})`,
	labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
  }
  
  const percentageDataOrders = oldNewOrders.map(item => {
    const total = item.stacks.reduce((sum, stack) => sum + stack.value, 0);
    if (total === 0) {
      return {
        ...item,
        stacks: item.stacks.map(stack => ({
          ...stack,
          value: 0
        }))
      };
    }
    return {
      ...item,
      stacks: item.stacks.map(stack => ({
        ...stack,
        value: (stack.value / total) * 100
      }))
    };
  });
  
  const percentageDataRevenue = oldNewRev.map(item => {
    const total = item.stacks.reduce((sum, stack) => sum + stack.value, 0);
    if (total === 0) {
      return {
        ...item,
        stacks: item.stacks.map(stack => ({
          ...stack,
          value: 0
        }))
      };
    }
    return {
      ...item,
      stacks: item.stacks.map(stack => ({
        ...stack,
        value: (stack.value / total) * 100
      }))
    };
  });

  const scrollViewSizeChanged = (contentWidth) => {
		if (filterType !== 'this-month') {
		  scrollViewRef.current?.scrollToEnd({ x: contentWidth, animated: true });
		}
	};
	
	const showPaymentPending = () => {
		navigation.navigate('CustomerPaymentPending');
	}
  
  return (
      <SafeAreaView style={styles.container}>
		{loading ? (
				<ActivityIndicator size="large" style={styles.spinner} />
			  ) : (
			<ScrollView>
			<TouchableOpacity style={styles.dateRangeContainer} onPress={handleButtonPress}>
			  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
				<Button
						appearance='ghost'
						status='basic'
						accessoryLeft={CalendarIcon}
						onPress={handleButtonPress}
						style={{marginLeft: -10}}
				/>
				<View>
					<Text category='s1' style={styles.dateStr}>{filterTypeStr}</Text> 
					<Text category='s2' style={styles.dateStrText}>{dateRangeStart} <Text style={styles.arrow}>→</Text> {dateRangeEnd}</Text>
				</View>
			  </View>
				<Icon 
					name='chevron-down-outline'
					style={{width: 30, height: 30}}
					fill={theme['color-primary-500']}
				  />
			</TouchableOpacity>
			
			<Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Icon style={styles.alertIcon} fill='#ea580c' name='info-outline' />
                <Text style={styles.infoTitle}>About this Report</Text>
              </View>
              <Text style={styles.infoText}>
                Below reports shows the total sum of all order amounts, regardless of whether they were paid or not.
              </Text>
            </Card>
			
			<Text category="s1" style={styles.titleSales}>Sales Overview</Text>

			  {/* Stats Section */}
			  <Layout style={styles.overviewContainer}>
				{[
				  { title: 'Earnings', value: '₹' + (revenueVal.toLocaleString('en-IN')) || 0, icon: 'currency-rupee', large: true },
				  { title: 'Orders', value: orderCnt, icon: 'shopping-bag', large: false },
				  { title: 'Customers', value: custCnt, icon: 'person', large: true },
				].map((stat, index) => (
				  <Card key={index} style={[styles.overviewCard, stat.large ? { width: '31%' } : { width: '28%'} ]}>
					<View style={{flexDirection: 'row', marginLeft: -10, marginBottom: 5, alignItems: 'center', marginTop: -5}}>
						<MaterialIcons name={stat.icon} size={24} color={theme['color-primary-500']} style={{marginHorizontal: 5}}/>
						<Text category="s1">{stat.title}</Text>
					</View>
					<Text category="label" style={{textAlign: 'center'}}>{stat.value}</Text>
				  </Card>
				))}
			  </Layout>
			  
			  <Text category="s1" style={styles.titleRevenue}>Key Performance Indicators</Text>

			  {/* Stats Section */}
			      <Layout style={styles.statsContainer}>
					  <SalesOverviewCard title="Profit Margin" value={profitMargin + '%'} trend="positive" />
					  <ARPCCard title="Avg. Revenue Per Customer" value={`₹ ${arpc}`} targetValue={100} />
					  <ARPCCard title="No. of new customers" value={newCustCount} targetValue={100} />
					</Layout>
			
			<Card style={styles.productCard}>
				<CostPieChart data={chartData}/>
			</Card>
			
			<Card style={styles.productCard} disabled={true}>
			  <Text category="s1" style={styles.title}>Employee Efficiency</Text>
			  <ScrollView horizontal persistentScrollbar={true}>
				<View style={{marginLeft: -20}}>
				  <Table>
					<TableWrapper style={styles.headerEmp}>
					  {renderHeaderEmp()} 
					</TableWrapper>
				  </Table>

				  {/* Table Rows */}
				  <ScrollView style={{ marginTop: -1 }}>
					<Table>
						{renderRowsEmp()}
					</Table>
				  </ScrollView>
				</View>
			  </ScrollView>
			</Card>

			{salesTrendLabels.length > 0 && (
			  <Card style={styles.productCard}>
				<Text category="s1" style={styles.titleChart}>Sales Trend</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={true} persistentScrollbar={true}>
				<View style={{marginLeft: -15}}>
				  <LineChart
					style={{marginTop: 5}}
					data={{
					  labels: salesTrendLabels,
					  datasets: [
						{
						  data: salesTrendData
						}
					  ]
					}}
					width={width - 30}
					height={height}
					chartConfig={lineChartConfig}
					bezier
					renderDotContent={() =>
						heatmapNumDays < 30 && (
						  <Text style={styles.overlayText}>
							Select more than 2 months date range to display sales trend
						  </Text>
						)
					  }
					style={styles.chartKitStyle}
				  />
				</View>
				</ScrollView>
			  </Card>
			  )}
			  
			<Card style={styles.productCard}>
			  <View style={styles.headerContainerFilter}>
				<Text category="s1" style={styles.titleChartOldNew}>
					{selectedChart === 'Orders' ? 'Old Vs New Customers - Orders' : 'Old Vs New Customers - Revenue'}
				  </Text>
				<OverflowMenu
					anchor={() => (
					  <Button
						style={styles.filterButton}
						appearance='ghost'
						status='basic'
						accessoryLeft={MoreIcon}
						onPress={toggleMenu}
					  />
					)}
					visible={menuVisible}
					onBackdropPress={toggleMenu}
				  >
						<MenuItem title='Orders' onPress={() => handleMenuSelect("Orders")}/>
						<MenuItem title='Revenue' onPress={() => handleMenuSelect("Revenue")}/>
				  </OverflowMenu>
			  </View>
			  <ScrollView horizontal showsHorizontalScrollIndicator={true} persistentScrollbar={true}>
			  <View style={styles.chartContainer}>
				{selectedChart === "Orders" ? (
					<BarChart
						isAnimated
						width={width}
						barWidth={20}
						maxValue={100}
						rotateLabel
						stackData={percentageDataOrders}
						hideRules
						xAxisLabelTextStyle={{fontSize: 10, marginTop: 5}}
						yAxisTextStyle={{fontSize: 10}}
						yAxisLabelSuffix="%"
						labelsDistanceFromXaxis={15}
					/>
				) : (
				  <BarChart
						isAnimated
						width={width}
						barWidth={20}
						maxValue={100}
						rotateLabel
						stackData={percentageDataRevenue}
						hideRules
						xAxisLabelTextStyle={{fontSize: 10, marginTop: 5}}
						yAxisTextStyle={{fontSize: 10}}
						yAxisLabelSuffix="%"
						labelsDistanceFromXaxis={15}
					/>
				)}
			  </View>
			  </ScrollView>
			  <View style={styles.legendContainer1}>
				<View style={styles.legend}>
				  <View style={[styles.legendIndicator, { backgroundColor: theme["color-primary-100"] }]} />
				  <Text category="s1" style={styles.legendText}>
					Old
				  </Text>
				</View>
				<View style={styles.legend}>
				  <View
					style={[styles.legendIndicator, { backgroundColor: theme["color-primary-500"] }]}
				  />
				  <Text category="s1" style={styles.legendText}>
					New
				  </Text>
				</View>
			  </View>
			</Card>
			  
			<Card style={styles.productCard}>
				<ScrollView horizontal ref={scrollViewRef} onContentSizeChange={(width,height) => {scrollViewSizeChanged(width)}} persistentScrollbar={true}>
				  <EnhancedHeatmap data={heatmapOrders} startDate={dateRangeStart} endDate={dateRangeEnd}/>
				</ScrollView>
			</Card>
			
			  <Card style={styles.productCard} disabled={true}>
		  <Text category="s1" style={styles.title}>Top 5 Products by Revenue</Text>
		  <ScrollView horizontal persistentScrollbar={true}>
			<View style={{marginLeft: -20}}>
			  <Table>
				<TableWrapper style={styles.header}>
				  {renderHeader()}
				</TableWrapper>
			  </Table>

			  {/* Table Rows */}
			  <ScrollView style={{ marginTop: -1 }}>
				<Table>
					{renderRows()}
				</Table>
			  </ScrollView>
			</View>
		  </ScrollView>
		</Card>
		
		  <Card style={styles.productCard}>
			<Text category="s1" style={styles.title}>Top 5 Customers by Revenue</Text>
			<List
			  data={topCustomers}
			  renderItem={renderItem}
			  style={{ marginLeft: -10 }}
			  ItemSeparatorComponent={Divider}
			/>
		  </Card>
		  
		  <Card style={styles.productCard}>
			<Text category="s1" style={styles.title}>Recurrent Customers by Revenue</Text>
			<List
			  data={recCustomers}
			  renderItem={renderItem}
			  style={{ marginLeft: -10 }}
			  ItemSeparatorComponent={Divider} // Adds the divider between items
			/>
		  </Card>
		  </ScrollView>
		)}
		
		<DateFilterModal 
			visible={modalVisible}
			onClose={() => setModalVisible(false)}
			onApply={handleApply}
		/>
      </SafeAreaView>
  );
});

const themedStyles = StyleService.create({
  container: {
    flex: 1,
	padding: 10,
	backgroundColor: '#F7F9FC'
  },
  headerContainer: {
    padding: 16,
	marginTop: 10
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 10,
	marginTop: -5,
	marginLeft: -5,
	marginRight: -5,
	backgroundColor: '#F7F9FC'
  },
  statsContainer: {
    flexDirection: 'row',
	marginTop: -20,
	marginHorizontal: 10,
	gap: 10,
	marginLeft: 15,
	backgroundColor: '#F7F9FC'
  },
  overviewCard: {
    //width: '32%',
	height: 75,
	borderRadius: 10,
	alignItems: 'center',
	justifyContent: 'center',
	elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statValue: {
    marginTop: 5,
	marginBottom: 5
  },
  headerText: {
    fontWeight: 'bold',
  },
  productCard: {
    borderRadius: 8,
	marginTop: 25,
	marginBottom: 10,
	marginRight: 5,
	marginLeft: 5,
	paddingTop: 10,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    marginBottom: 15,
	fontWeight: "bold",
	marginLeft: -5,
	marginTop: -5
  },
  titleSales: {
    marginBottom: 20,
	fontWeight: "bold",
	marginTop: 20,
	marginLeft: 5
  },
  titleSales1: {
    marginBottom: -5,
	fontWeight: "bold",
	marginTop: 10,
	marginLeft: 5,
  },
  titleRevenue: {
    marginBottom: 30,
	fontWeight: "bold",
	marginTop: 20,
	marginLeft: 5
  },
  titleChart: {
    marginBottom: 10,
	fontWeight: "bold",
	marginTop: -5
  },
  titleChartOldNew: {
    marginBottom: 10,
	marginLeft: 15,
	fontWeight: "bold",
	marginTop: -5
  },
  chartContainer: {
    height: 250,
	marginTop: 20,
  },
  legendContainer: {
    flexDirection: "row",
	marginTop: 30
  },
  legendContainer1: {
    flexDirection: "row"
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
	marginRight: 100
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
  head: { height: 44 },
  headText: { fontSize: 15, fontWeight: 'bold' , textAlign: 'center' },
  text: { margin: 6, fontSize: 13, textAlign: 'center' },
  filterButton: {
    position: 'absolute', // Absolute positioning to place the button at the bottom right
    top: -30, // Distance from the bottom
    right: -10, // Distance from the right
	paddingHorizontal: 0, // Remove padding for a more compact button
  },
  headerContainerFilter: {
	flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
	marginLeft: -15
  },
  moreButton: {
    marginLeft: 80,
	marginTop: -5
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
	marginLeft: 10
  },
  headerCell: {
    padding: 8,
	flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
	paddingHorizontal: 10,
	marginLeft: 5
  },
  cell: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    paddingHorizontal: 5,
	marginLeft: 5
  },
  cellText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#333',
	textTransform: 'capitalize'
  }, 
  headerEmp: {
    flexDirection: 'row',
	marginLeft: 10
  },
  headerCellEmp: {
    padding: 8,
	flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
	marginLeft: 5
  },
  cellEmp: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    paddingHorizontal: 10,
	marginLeft: 5
  },
  cellTextEmp: {
    textAlign: 'center',
    fontSize: 13,
    color: '#333',
	textTransform: 'capitalize'
  },
  sortArrow: {
    marginLeft: 12,
	marginBottom: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#666',
	marginLeft: -10, marginRight: 5
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
	marginLeft: 10,
	marginRight: 10,
	backgroundColor: '#F7F9FC'
  },
  filterButtonTop: {
    marginVertical: 10,
	borderWidth: 1,
	borderColor: '#ccc',
	borderRadius: 8,
	width: 80,
  },
  filterButtonTopYear: {
    marginVertical: 10,
	borderWidth: 1,
	borderColor: '#ccc',
	borderRadius: 8,
	width: 50,
	marginLeft: -5
  },
  filterButtonTopDate: {
    marginVertical: 10,
	borderWidth: 1,
	borderColor: '#ccc',
	borderRadius: 8,
	width: 150,
	marginLeft: -5
  },
  highlightedButton: {
    backgroundColor: '#d3d3d3',
  },
	chartKitStyle: {marginVertical: 8, borderRadius: 16},
  modalContainer: {
	width: width - 200,
    borderRadius: 10,
  },
  modalCard: {
    width: '120%',
    borderRadius: 15,
    padding: 10,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  spinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
	color: 'color-primary-500'
  },
  overlayText: {
    marginLeft: 20,
    fontSize: 14,
	width: 300
  },
  overlayTextBar: {
    position: "absolute",
    color: "black",
    fontSize: 14,
	top: 20,
    textAlign: "center",
    alignSelf: "center",
  },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
		marginBottom: 5
    },
    textContainer:{
        flex: 1,
		position: 'absolute', // Make chart absolute for overlapping
		left: 20,
		zIndex: 1,
		marginLeft: -30,
		width: 100,
    },
    chart:{
        marginRight: -10
    },
	lineChart: {
		borderRadius: 16,
		marginLeft: 20
	},
	fab: {
        alignItems: 'center',
        justifyContent: 'center',
		flexDirection: 'row',
        height: 50,
		width: 50,
        position: 'absolute',
		borderRadius: 10,
        bottom: 45,
        right: 35,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
		backgroundColor: 'color-primary-500'
    },
  modalContentModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainerModal: {
    flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
    width: '100%',
  },
  
  axisText: {
    fontSize: 12,
    color: '#333',
  },
  overlayContainer: {
    justifyContent: 'center',
    alignItems: 'center',
	backgroundColor: 'rgba(0, 0, 0, 0.3)'
  },
  overlayContent: {
    alignItems: 'center',
    padding: 20,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  overlayDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 15,
    width: 200,
  },
  subscribeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer1: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: '90%'
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 15,
    zIndex: 10,
  },
  closeIcon: {
    width: 28,
    height: 28,
  },
  dateStr: {
	  fontWeight: 'bold', marginLeft: -5
  },
  dateStrText: {
	  marginLeft: -5
  },
  dateRangeContainer: {flexDirection: 'row', backgroundColor: 'white', justifyContent: 'space-between', alignItems: 'center', marginRight: 5, marginLeft: 5, borderRadius: 8, height: 70},
  arrow: {
	marginBottom: 2, fontSize: 20, fontWeight: 'bold'
  },
  infoCard: {
    backgroundColor: '#fef7f0',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 15,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  infoTitle: {
    fontWeight: '600',
    color: '#ea580c',
    fontSize: 16,
  },
  infoText: {
    color: '#c2410c',
    fontSize: 14,
    lineHeight: 20,
  },
  navButton: {marginRight: 20}
});

const Tab = createMaterialTopTabNavigator();

const AnalyticsScreen = ({ navigation, route }) => {
	const analyticsRef = useRef(null);

	useEffect(() => {
		console.log('in useEffect route.params')
		console.log(route.params)
		if (route.params?.triggerSync) {
		  handleRefreshPress();
		  route.params.triggerSync = false;
		}
	}, [route.params?.triggerSync]);
	
	const handleRefreshPress = () => {
		console.log('in handleRefreshPress analytics')
		if (analyticsRef.current) {
		  analyticsRef.current.getAllData();
		}
	  };
  return (
    <Tab.Navigator screenOptions={{ swipeEnabled: false }}>
      <Tab.Screen name="Analytics" children={() => {
			  return <StatsScreen ref={analyticsRef} />;
	  }} />
	  <Tab.Screen name="Customer Payments Overview" component={CustomerPaymentPending} />
    </Tab.Navigator>
  );
};

export default AnalyticsScreen;