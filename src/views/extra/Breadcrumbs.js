import React from 'react';
import { View, Text } from 'react-native';
import { Button, useTheme } from '@ui-kitten/components';

const Breadcrumbs = ({ steps, itemName, headerImgUri, step, setStep, navigation, bcDisabled }) => {
	const theme = useTheme();
	
  const navigateToCrumb = (screen) => {
	console.log('in navigateToCrumb: ' + screen);
	switch(screen) {
		case 'HomeMain':
			navigation.navigate('HomeNew');
			break;
		case 'TestCustomer':
			if (step === 2) setStep(step - 1); // Decrement step if coming from TestOrder
			navigation.navigate('Test', { itemName, headerImgUri, step });
			break;
		case 'TestOrder':
			if (step === 1) setStep(step + 1); // Increment step if coming from TestCustomer
			navigation.navigate('Test', { itemName, headerImgUri, step });
			break;

		default:
			break;
	  }
	}
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
      {steps.map((stepLocal, index) => {
		console.log(index + ',' + step);
		return (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button
				  appearance="ghost"
				  onPress={() => navigateToCrumb(stepLocal.screen)}
				  disabled={bcDisabled && stepLocal.screen === 'TestOrder'}
				  style={{ marginHorizontal: -20, backgroundColor: 'transparent' }}
				>
				  {evaProps => <Text {...evaProps} style={{color: index === step ? theme['color-primary-500'] : theme['color-primary-100'], fontSize: 14, marginHorizontal: 10, fontWeight: 'bold'}}>{stepLocal.name}</Text>}
				  
			</Button>

          {index < steps.length - 1 && <Text style={{ marginHorizontal: 5 }}>›</Text>}
        </View>
      )})}
    </View>
  );
};

export default Breadcrumbs;
