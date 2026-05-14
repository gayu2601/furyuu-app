import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text } from "@ui-kitten/components";
import Svg, { G, Circle, Text as SvgText } from "react-native-svg";
import { supabase } from '../../constants/supabase';
import { storage } from '../extra/storage';
import { useUser } from '../main/UserContext';
import moment from 'moment';
import eventEmitter from './eventEmitter';

const DashboardCard = () => {
  const [stats, setStats] = useState({
    pendingCnt: 0,
    pastDueCnt: 0,
    completedCnt: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const { currentUser, newDeviceLogin } = useUser();

  useEffect(() => {
    const keysOfInterest = ["Completed_false", "Completed_true"];

    const getCountOfValuesInKeys = async () => {
      let total = 0;
      let totalOverdueOrders = 0;
      let ordersWithFutureDueDates = 0;
      let recentlyCompletedOrders = 0;

      const currentDate = moment(new Date()).format("YYYY-MM-DD");
      const oneMonthAgo = moment(currentDate).subtract(90, 'days').format('YYYY-MM-DD');

      for (const key of keysOfInterest) {
        let orders = [];

        const value = storage.getString(key);
        orders = value ? JSON.parse(value) : [];

        if (orders.length === 0 || newDeviceLogin) {
          console.log("getting from db:", key);
          const [status, val] = key.split('_');
          const { data, error } = await supabase.rpc("get_tailor_orders_new", {
            paramStatus: status,
            paramStatusEquals: val,
          });

          if (data && data.length > 0) {
            orders = data;
          }
        }

        if (key === "Completed_false") {
          let pastDates = 0;
          let futureDates = 0;

          for (const order of orders) {
            if (order.orderStatus === 'Cancelled') continue;
            if (order.orderDate < oneMonthAgo) continue;

            if (order.dueDate?.some(dueDate => dueDate < currentDate)) {
              pastDates++;
            } else if (order.dueDate?.every(dueDate => dueDate === null || dueDate >= currentDate)) {
              futureDates++;
            }
          }

          totalOverdueOrders = pastDates;
          ordersWithFutureDueDates = futureDates;
          total += futureDates + pastDates;

        } else if (key === "Completed_true") {
          recentlyCompletedOrders = orders.filter(
            order => order.orderDate >= oneMonthAgo
          ).length;

          total += recentlyCompletedOrders;
        }
      }

      // Single batched state update — only 1 re-render instead of 4
      setStats({
        pendingCnt: ordersWithFutureDueDates,
        pastDueCnt: totalOverdueOrders,
        completedCnt: recentlyCompletedOrders,
        totalCount: total,
      });
	  setLoading(false);
    };

    eventEmitter.on('storageUpdated', getCountOfValuesInKeys);
    getCountOfValuesInKeys();

    return () => {
      eventEmitter.off('storageUpdated', getCountOfValuesInKeys);
    };
  }, []);

  const { pendingCnt, pastDueCnt, completedCnt, totalCount } = stats;

  const chartData = [
    { count: pendingCnt,   color: "#FFB74D", label: "Pending" },
    { count: pastDueCnt,   color: "red",     label: "Overdue" },
    { count: completedCnt, color: "#81C784", label: "Completed" },
  ];

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let startAngle = 0;

  const chartSegments = chartData.map((item) => {
    const percentage = totalCount > 0 ? item.count / totalCount : 0;
    const sweepAngle = percentage * 360;
    const strokeDasharray = `${(percentage * circumference).toFixed(1)} ${(
      circumference - percentage * circumference
    ).toFixed(1)}`;

    const segment = { ...item, startAngle, sweepAngle, strokeDasharray };
    startAngle += sweepAngle;
    return segment;
  });

  return (
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
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text category="s2">{item.label}: {item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  legendContainer: {
    marginLeft: 16,
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