import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Card, Layout, Text } from "@ui-kitten/components";
import Svg, { G, Circle, Text as SvgText } from "react-native-svg";
import { supabase } from '../../constants/supabase'
import { storage } from '../extra/storage';
import { useUser } from '../main/UserContext';
import moment from 'moment';
import eventEmitter from './eventEmitter';

const DashboardCard = () => {
  const [pendingCnt, setPendingCnt] = useState(0);
  const [pastDueCnt, setPastDueCnt] = useState(0);
  const [completedCnt, setCompletedCnt] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { currentUser, newDeviceLogin } = useUser();
  
  useEffect(() => {
	  const keysOfInterest = [
		  "Completed_false",
		  "Completed_true"
		];

		const getCountOfValuesInKeys = async () => {
		  let total = 0;
		  let totalOverdueOrders = 0;
		  let pastOneMonthDueOrders = 0;
		  const currentDate = moment(new Date()).format("YYYY-MM-DD");
		  const oneMonthAgo = moment(currentDate).subtract(90, 'days').format('YYYY-MM-DD');

		  // Process each key sequentially to avoid race conditions with async operations
		  for (const key of keysOfInterest) {
			let orders = [];
			
			// Get orders from storage or database
			const value = storage.getString(key);
			orders = value ? JSON.parse(value) : [];
			console.log('in DashboardCard', orders);
			
			// If no orders in storage, fetch from database
			if (orders.length === 0 || newDeviceLogin) {
			  console.log("getting from db:", key);
			  const [status, value] = key.split('_');
			  const { data, error } = await supabase.rpc("get_tailor_orders_new", {
				paramStatus: status,
				paramStatusEquals: value
			  });
			  
			  if (data && data.length > 0) {
				orders = data;
			  }
			}
			
			// Process orders based on their status
			if (key === "Completed_false") {
			  // Count orders with future due dates
			  const ordersWithFutureDueDates = orders.filter(order =>
				order.orderDate >= oneMonthAgo && order.dueDate?.every(dueDate => dueDate === null || dueDate >= currentDate)
			  ).length;
			  
			  // Count overdue orders
			  const ordersWithPastDueDates = orders.filter(order =>
				order.orderDate >= oneMonthAgo && order.dueDate?.some(dueDate => dueDate < currentDate)
			  ).length;
			  
			  // Update counters
			  totalOverdueOrders += ordersWithPastDueDates;
			  total += ordersWithFutureDueDates + ordersWithPastDueDates;
			  setPendingCnt(ordersWithFutureDueDates);
			  setPastDueCnt(totalOverdueOrders);
			} else if (key === "Completed_true") {
			  const recentlyCompletedOrders = orders.filter(order =>
				order.orderDate >= oneMonthAgo
			  ).length;
			  
			  pastOneMonthDueOrders = recentlyCompletedOrders;
			  total += recentlyCompletedOrders;
			  setCompletedCnt(recentlyCompletedOrders);
			}
		  }
		  
		  setTotalCount(total);
		};

		
		eventEmitter.on('storageUpdated', getCountOfValuesInKeys);

		getCountOfValuesInKeys();

    return () => {
        // Cleanup listener
        eventEmitter.off('storageUpdated', getCountOfValuesInKeys);
    };

  }, [currentUser.username])

  const chartData = [
    { count: pendingCnt, color: "#FFB74D", label: "Pending" }, // Pending
	{ count: pastDueCnt, color: "red", label: "Overdue" }, // Past Due
    { count: completedCnt, color: "#81C784", label: "Completed" }, // Completed
  ];

  // Calculate percentages and cumulative angles
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let startAngle = 0;

  const chartSegments = chartData.map((item) => {
    const percentage = item.count / totalCount;
    const sweepAngle = percentage * 360;
    const strokeDasharray = `${(percentage * circumference).toFixed(1)} ${(
      circumference - percentage * circumference
    ).toFixed(1)}`;

    const segment = {
      ...item,
      startAngle,
      sweepAngle,
      strokeDasharray,
    };

    startAngle += sweepAngle;
    return segment;
  });

  return (
    <>
      <Card style={styles.card}>
        <Text category="h6" style={styles.cardTitle}>
          Sales Overview - Past 3 months
        </Text>
        <View style={styles.chartContainer}>
          <Svg width={150} height={150} viewBox="0 0 200 200">
            <G transform="translate(100, 100)">
              {chartSegments.map((segment, index) => (
                <Circle
                  key={index}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={20}
                  strokeDasharray={segment.strokeDasharray}
                  transform={`rotate(${segment.startAngle - 90})`}
                  strokeLinecap="butt"
                />
              ))}
              {/* Center text */}
              <SvgText
                textAnchor="middle"
                fontSize="20"
                fill="#333"
                fontWeight="bold"
                y="0"
              >
                {totalCount}
              </SvgText>
            </G>
          </Svg>
          <View style={styles.legendContainer}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: item.color }]}
                />
                <Text category='s2'>{item.label}: {item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "90%",
    borderRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    textAlign: "center",
    marginVertical: 8,
  },
  chartContainer: {
    flexDirection: "row", // This ensures the chart and legend are side by side
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  legendContainer: {
    marginLeft: 16, // Space between the chart and the legend
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
});

export default DashboardCard;
