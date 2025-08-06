import React from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Layout, Text, Button, Icon, Card } from '@ui-kitten/components';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LineChart,
  BarChart,
  PieChart,
  ContributionGraph,
  ProgressChart,
} from 'react-native-chart-kit';

const LockIcon = (props) => (
  <Icon {...props} name='lock-outline' />
);

const CloseIcon = (props) => (
  <Icon {...props} name='close-outline' />
);

const screenWidth = Dimensions.get('window').width - 40;

const MockCharts = () => {
  // Line chart data
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43],
        color: (opacity = 1) => `rgba(105, 121, 248, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Revenue'],
  };

  // Bar chart data
  const barData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43],
      },
    ],
  };

  // Pie chart data
  const pieData = [
    {
      name: 'Free',
      population: 45,
      color: '#6979F8',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Premium',
      population: 35,
      color: '#FFC107',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Trial',
      population: 20,
      color: '#FF5722',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(105, 121, 248, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#6979F8',
    },
  };

  return (
    <View style={styles.chartsContainer}>
      {/* Line Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Revenue Trend</Text>
        <LineChart
          data={lineData}
          width={screenWidth - 32}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>
      
      <View>
        
          <Text style={styles.chartTitle}>Conversions</Text>
          <BarChart
            data={barData}
            width={screenWidth - 24}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(160, 106, 249, ${opacity})`,
            }}
            style={styles.chart}
            fromZero
          />
        
      </View>
    </View>
  );
};

export default function PremiumOverlayAnalytics({ onUpgrade }) {
  return (
    <View style={styles.container}>
      {/* This represents your app content that would be visible but dimmed */}
      <View style={styles.appContentMock}>
        <MockCharts/>
      </View>
      
      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
        {/* Premium Feature Card */}
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <LockIcon fill="#4158D0" width={24} height={24} />
            </View>
            
            <View style={styles.textContainer}>
              <Text category='h6' style={styles.title}>Premium Feature</Text>
              <Text category='p2' appearance='hint' style={styles.premiumText}>Subscribe to unlock all premium features</Text>
            </View>
            
            <Button
              style={styles.upgradeButton}
              onPress={onUpgrade}
            >
              Subscribe Now
            </Button>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  appContentMock: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f6f8',
	justifyContent: 'center'
  },
  chartsContainer: {
    width: '100%',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  donutChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    padding: 0,
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  upgradeButton: {
    width: '90%',
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 0,
    overflow: 'hidden',
  },
  premiumText: {textAlign: 'center'}
});