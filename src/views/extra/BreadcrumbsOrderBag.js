import React from 'react';
import { View, Text } from 'react-native';
import { Button, useTheme } from '@ui-kitten/components';

const BreadcrumbsOrderBag = ({ steps, step, setStep, navigation }) => {
	const theme = useTheme();
	
  const navigateToCrumb = (screen) => {
	console.log('in navigateToCrumb: ' + screen);
	switch(screen) {
		case 'OrderBagItems':
			if (step === 2) setStep(step - 1);
			navigation.navigate('OrderBagScreen', { step });
			break;
		case 'OrderBagCreate':
			if (step === 1) setStep(step + 1);
			navigation.navigate('OrderBagScreen', { step });
			break;
		default:
			break;
	  }
	}
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
      {steps.map((stepLocal, index) => {
		console.log(index + ',' + step);
		return (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button
				  appearance="ghost"
				  onPress={() => navigateToCrumb(stepLocal.screen)}
				  style={{ marginHorizontal: -20, backgroundColor: 'transparent' }}
				>
				  {evaProps => <Text {...evaProps} style={{color: index + 1 === step ? theme['color-primary-500'] : theme['color-primary-100'], fontSize: 14, marginHorizontal: 10, fontWeight: 'bold'}}>{stepLocal.name}</Text>}
				  
			</Button>

          {index < steps.length - 1 && <Text style={{ marginHorizontal: 5 }}>›</Text>}
        </View>
      )})}
    </View>
  );
};

export default BreadcrumbsOrderBag;
