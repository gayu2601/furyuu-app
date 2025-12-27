import React from 'react';
import { View, Text } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

const CostPieChart = ({ data1 }) => {
  const data = [
    { value: 30, color: '#FF6B6B', text: 'Salary' },
    { value: 25, color: '#FFD93D', text: 'Rent' },
    { value: 15, color: '#6BCB77', text: 'EB' },
    { value: 10, color: '#4D96FF', text: 'Marketing' },
    { value: 12, color: '#9D4EDD', text: 'Purchase' },
    { value: 8,  color: '#FF9F1C', text: 'Miscellaneous' },
  ];

  // Calculate total to compute percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Map data to include percentage labels
  const dataWithPercentage = data.map(item => ({
    ...item,
    text: `${((item.value / total) * 100).toFixed(0)}%`, // show percentage
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Cost Breakdown
      </Text>

      <PieChart
        data={dataWithPercentage}
        donut
        showText
        textColor="white"
        textSize={12}
        radius={100}
        innerRadius={55}
        centerLabelComponent={() => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Total</Text>
            <Text style={{ fontSize: 14 }}>100%</Text>
          </View>
        )}
      />

      {/* Legend in two columns */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 20,
		  marginLeft: 25,
          width: '80%',
        }}
      >
        {data.map((item, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 4,
              width: '50%', // two columns
              paddingHorizontal: 10,
            }}
          >
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: item.color,
                marginRight: 8,
              }}
            />
            <Text style={{ fontSize: 14 }}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CostPieChart;
