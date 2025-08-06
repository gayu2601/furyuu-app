import React, { useCallback } from 'react';
import { Button, Icon, useTheme, Text } from '@ui-kitten/components';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOrderItems } from '../main/OrderItemsContext';

const ShoppingIcon = (props) => {
	const theme = useTheme();
	return (
  <Icon {...props} name="shopping-bag-outline" style={{ width: 25, height: 25 }} fill={theme['color-primary-500']} />
)};

const OrderBagButton = () => {
	const { getNewOrderCount } = useOrderItems();
	const orderDressCount = getNewOrderCount();
	console.log("orderDressCount: " + orderDressCount);
	const navigation = useNavigation()
	
	const handlePress = useCallback(() => {
		navigation.navigate('OrderBagScreen');
	  }, [navigation]);

  return (
    <Button
      accessoryLeft={ShoppingIcon}
      onPress={handlePress}
      appearance="ghost"
	  size='small'
      style={{ marginLeft: 20, marginRight: -25 }}
    >
      <View style={{ position: 'absolute' }}>
        {orderDressCount > 0 && (
			<View
			  style={{
				position: 'absolute',
				right: 0,
				top: -20,
				backgroundColor: 'red',
				borderRadius: 15,
				width: 20,
				height: 20,
				justifyContent: 'center',
				alignItems: 'center',
			  }}
			>
			  <Text style={{ color: 'white', fontSize: 12 }}>{orderDressCount}</Text>
			</View>
        )}
      </View>
    </Button>
  );
};

export default OrderBagButton;
