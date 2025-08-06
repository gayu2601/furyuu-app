import React, { useCallback } from 'react';
import { Button, Icon, useTheme, Text } from '@ui-kitten/components';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '../main/NotificationContext';

const BellIcon = (props) => {
	const theme = useTheme();
	return (
  <Icon {...props} name="bell-outline" style={{ width: 25, height: 25 }} fill={theme['color-primary-500']} />
)};

const NotificationsButton = () => {
	const { notificationCount } = useNotification();
	console.log("notificationCount: " + notificationCount);
	const navigation = useNavigation()
	
	const handlePress = useCallback(() => {
		navigation.navigate('NotificationsScreen');
	  }, [navigation]);

  return (
    <Button
      accessoryLeft={BellIcon}
      onPress={handlePress}
      appearance="ghost"
	  size='small'
      style={{ position: 'relative', top: 3, marginRight: -10 }}
    >
      <View style={{ position: 'absolute' }}>
        {notificationCount > 0 && (
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
			  <Text style={{ color: 'white', fontSize: 12 }}>{notificationCount}</Text>
			</View>
        )}
      </View>
    </Button>
  );
};

export default NotificationsButton;
