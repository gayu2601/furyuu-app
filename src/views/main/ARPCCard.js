import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Icon, Button, Tooltip } from '@ui-kitten/components';

const ARPCCard = ({ title, value, targetValue }) => {
  const percentage = Math.min((value / targetValue) * 100, 100); // Calculate percentage
  const strokeColor = percentage > 75 ? 'green' : percentage > 50 ? 'orange' : 'red';
	const [ttVisible, setTtVisible] = useState(false);

  const showTooltip = () => {
		setTtVisible(true);
		setTimeout(() => setTtVisible(false), 5000);
	};
  return (
	  <View style={styles.container}>
		<View style={styles.card}>
		  <View style={styles.cardContent}>
			  <Text style={styles.cardValue}>{value}</Text>
		  </View>
		</View>
		<View style={styles.tooltip}>
			<Text style={styles.cardTitle}>{title}</Text>
			{title === 'Avg. Revenue Per Customer' && (
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
					Revenue/No. of customers
				</Tooltip>
			)}
		</View>
	  </View>
  );
};

export default ARPCCard;

const styles = StyleSheet.create({
  container: {
	alignItems: 'center',
	justifyContent: "center",
	marginRight: 5
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
    padding: 5,
    marginVertical: 8,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
	marginBottom: 10
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
    fontSize: 16,
    fontWeight: 'bold',
	textAlign: 'center'
  },
  graphContainer: {
    marginLeft: 10,
  },
  tooltip: {
	flexDirection: 'row',
	gap: 5
  }
});
