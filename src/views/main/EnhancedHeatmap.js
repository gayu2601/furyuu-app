import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text } from '@ui-kitten/components';
import { ContributionGraph } from 'react-native-chart-kit';
import moment from 'moment';

const EnhancedHeatmap = ({ data, startDate, endDate }) => {
	
  const CHART_WIDTH = 280;
  const CHART_HEIGHT = 220;

  // Function to get array of months between two dates
  const getMonthsBetweenDates = (start, end) => {
    const months = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Set to first day of respective months
    startDate.setDate(1);
    endDate.setDate(1);
    
    let currentDate = startDate;
    
    while (currentDate <= endDate) {
      months.push({
        name: currentDate.toLocaleString('default', { month: 'long' }),
		shortName: currentDate.toLocaleString('default', { month: 'short' }),
        year: currentDate.getFullYear(),
        month: currentDate.getMonth()
      });
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    }
    
    return months;
  };

  // Get month's data
  const getMonthData = (year, month) => {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startOfMonth && itemDate <= endOfMonth;
    });
  };

  // Get months array based on date range
  const months = getMonthsBetweenDates(startDate, endDate);
  
  return (
    <View style={styles.container}>
		<View style={styles.textContainer}>
		  <Text category="s1" style={styles.mainTitle}>
			Orders frequency ({moment(startDate).format('DD/MM/YY')} - {moment(endDate).format('DD/MM/YY')})
		  </Text>
		</View>

      <View style={styles.scrollContent}>
        {months.map((monthObj, index) => {
          const monthData = getMonthData(monthObj.year, monthObj.month);
          const monthEndDate = new Date(monthObj.year, monthObj.month + 1, 1);
		  const dxValue = (monthObj.name === 'September' || monthObj.name === 'December') ? -20 : 40;
		  const chartConfig = {
			backgroundColor: '#fff',
			backgroundGradientFrom: '#fff',
			backgroundGradientTo: '#fff',
			strokeWidth: 2,
			barPercentage: 0.5,
			color: (opacity = 1) => `rgba(${0}, ${0}, ${153}, ${opacity})`,
			labelColor: (opacity = 1) => `rgba(0, 0, 0, ${0})`
		  };

          return (
			<View key={index}>
				<Text style={styles.customLabel}>{monthObj.shortName}</Text>
                <ContributionGraph
                  values={monthData}
                  endDate={monthEndDate}
                  numDays={31}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  chartConfig={chartConfig}
                  style={styles.chart}
                />
			</View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(0, 0, 153, 0.2)' }]} />
          <Text category="c1">Low Activity</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(0, 0, 153, 1)' }]} />
          <Text category="c1">High Activity</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    height: 315,
	marginLeft: -17,
	marginTop: -15
  },
  mainTitle: {
    marginBottom: 16,
	fontWeight: 'bold',
  },
  scrollContent: {
    paddingRight: 16,
	marginLeft: -30,
	flexDirection: 'row',
	gap: -20
  },
  chart: {
    borderRadius: 8,
    marginRight: -125
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  customLabel: {
    fontSize: 12,
	marginLeft: 75,
	marginTop: 10,
	marginBottom: -35,
	zIndex: 1
  },
  textContainer: { alignItems: 'flex-end' ,height: 50, marginBottom: -15}
});

export default EnhancedHeatmap;