import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon, Button, Tooltip } from '@ui-kitten/components';
import Svg, { Polyline } from 'react-native-svg';

const SalesOverviewCard = ({ title, value, trend }) => {
  const isPositive = trend === 'positive';
  const [ttVisible, setTtVisible] = useState(false);

  const showTooltip = () => {
		setTtVisible(true);
		setTimeout(() => setTtVisible(false), 5000);
	};
  
  return (
	<View style={styles.container}>
		<View style={styles.card}>
		  <View style={styles.cardContent}>
			  <Text style={[styles.cardValue, isPositive ? styles.positive : styles.negative]}>
				{value}
			  </Text>
		  </View>
		</View>
		<View style={styles.tooltip}>
			<Text style={styles.cardTitle}>{title}</Text>
			<Tooltip
						anchor={() => (
						  <Button
								  appearance='ghost'
								  size="small"
								  accessoryLeft={(props) => <Icon {...props} name="info-outline"/>}
								  onPress={showTooltip}
								  style={{marginLeft: -15, marginRight: -30, width: 10, height: 10, marginTop: -13}}
							/>
						)}
						visible={ttVisible}
						onBackdropPress={() => setTtVisible(false)}
			>
				(Revenue - Expenses)/Revenue
			</Tooltip>
		</View>
	</View>
  );
};

export default SalesOverviewCard;

const styles = StyleSheet.create({
  container: {
	alignItems: 'center',
	justifyContent: "center",
	marginTop: -15,
	marginRight: 15
  },
  card: {
	width: 80,
	height: 80,
	alignItems: 'center',
	justifyContent: "center",
	backgroundColor: '#fff',
    borderRadius: 40,
	borderWidth: 3,
	borderColor: '#9292F4',
    padding: 16,
    marginVertical: 8,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
	marginBottom: 10,
	marginLeft: 10,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
	width: 100,
	textAlign: 'center'
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
	textAlign: 'center',
  },
  positive: {
    color: '#28a745',
  },
  negative: {
    color: '#dc3545',
  },
  graph: {
    marginLeft: -10,
  },
  tooltip: {
	flexDirection: 'row',
	gap: -7
  }
});
