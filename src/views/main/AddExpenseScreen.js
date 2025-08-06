import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Alert,
  View, BackHandler
} from 'react-native';
import { Layout, Text, Input, Button, useTheme, StyleService, useStyleSheet, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { useUser } from '../main/UserContext';
import eventEmitter from './eventEmitter';

const AddExpenseScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  
  const [incIndex, setIncIndex] = useState(null);
  const [incomeCategory, setIncomeCategory] = useState(null); 
  const incomeCat = ['Product Sales', 'Other'];
  
  const [expIndex, setExpIndex] = useState(null);
  const [expCategory, setExpCategory] = useState(null); 
  const expCat = ['Salary', 'Lining', 'Accessories', 'Material', 'Repairs', 'New machine', 'Other'];
  
	const theme = useTheme();
	const { currentUser } = useUser();
	const styles = useStyleSheet(themedStyles);

  const handleAddTransaction = async() => {
	try {
		if (!amount || amount === '0' || (!incomeCategory && !expCategory)) {
		  Alert.alert('Error', 'Please fill in all fields!');
		  return;
		}

		const transactionType = isIncome ? 'Income' : 'Expense';
		showSuccessMessage('Success! ' + `${transactionType} added successfully!`);
		
		const { error } = await supabase
		  .from('IncomeExpense')
		  .insert({ username: currentUser.username, entryType: transactionType, category: expCategory || incomeCategory, amount: parseInt(amount), description: description })
		if(error) {
			throw error;
		}
		eventEmitter.emit('transactionAdded');
	} catch(error) {
		console.log(error);
		showErrorMessage('Error! ' + error.message);
	} finally {
		setAmount('')
		setDescription('')
		setIncomeCategory(null)
		setExpCategory(null)
		setIncIndex(null)
		setExpIndex(null)
	}
  };
  
  const handleSelectInc = (index) => {
		setIncIndex(index);
		setIncomeCategory(incomeCat[index.row]);
	};
	
	const handleSelectExp = (index) => {
		setExpIndex(index);
		setExpCategory(expCat[index.row]);
	};

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Layout style={styles.tabContainer}>
        <Button
          style={[styles.tabButton, !isIncome && styles.activeTab]}
          appearance="ghost"
          onPress={() => setIsIncome(false)}
        >
		  {evaProps => <Text {...evaProps} style={{color: !isIncome ? 'white' : theme['color-primary-500']}}>Expense</Text>}
        </Button>
        <Button
          style={[styles.tabButton, isIncome && styles.activeTab]}
          appearance="ghost"
          onPress={() => setIsIncome(true)}
        >
		  {evaProps => <Text {...evaProps} style={{color: isIncome ? 'white' : theme['color-primary-500']}}>Income</Text>}
        </Button>
      </Layout>
	  
	  {/* Income/Expense Specific Fields */}
      {isIncome ? (
        <View>
			<Select
				style={styles.input}
				placeholder='Select category'
				selectedIndex={incIndex}
				onSelect={handleSelectInc}
				value={incomeCategory}
			  >
				{incomeCat.map((option, index) => (
				  <SelectItem title={option} key={index} />
				))}
			  </Select>
        </View>
      ) : (
        <View>
          <Select
				style={styles.input}
				placeholder='Select category'
				selectedIndex={expIndex}
				onSelect={handleSelectExp}
				value={expCategory}
			  >
				{expCat.map((option, index) => (
				  <SelectItem title={option} key={index} />
				))}
			  </Select>
        </View>
      )}

      {/* Shared Input Fields */}
      <Input
        style={styles.input}
        label="Enter amount *"
        keyboardType="numeric"
        value={amount.toString()}
        onChangeText={setAmount}
      />
      <Input
        style={styles.input}
        label="Enter description"
        value={description}
        onChangeText={setDescription}
      />

      {/* Add Transaction Button */}
      <Button style={styles.addButton} onPress={handleAddTransaction}>
        Add {isIncome ? 'Income' : 'Expense'}
      </Button>
    </ScrollView>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f9fc',
  },
  header: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  addButton: {
    marginTop: 20,
	marginHorizontal: 100
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
	backgroundColor: 'white',
	borderRadius: 8,
	borderWidth: 1,
	borderColor: '#ccc'
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'color-primary-500',
    color: '#FFFFFF',
	borderRadius: 8,
	marginRight: 0,
	marginLeft: 0
  },
  navButton: {
	  marginLeft: 20
  }
});

export default AddExpenseScreen;
