import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Alert,
  View,
  BackHandler
} from 'react-native';
import { Layout, Text, Input, Button, useTheme, StyleService, useStyleSheet, Select, SelectItem, IndexPath, CheckBox, Datepicker } from '@ui-kitten/components';
import { supabase } from '../../constants/supabase';
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
  const expCat = ['Salary', 'Rent', 'EB', 'Marketing', 'Purchase', 'Miscellaneous'];
  
  // Salary specific states
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bonus, setBonus] = useState('');
  
  // Rent specific states
  const [rentType, setRentType] = useState(null);
  const [rentIndex, setRentIndex] = useState(null);
  const rentTypes = ['Shop', 'Unit', 'Hostel'];
  
  // EB specific states
  const [ebType, setEbType] = useState(null);
  const [ebIndex, setEbIndex] = useState(null);
  const [prevMonthDate, setPrevMonthDate] = useState(new Date());
  const [prevMonthReading, setPrevMonthReading] = useState('');
  const [presentMonthDate, setPresentMonthDate] = useState(new Date());
  const [presentMonthReading, setPresentMonthReading] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const ebTypes = ['Shop', 'Unit', 'Hostel'];
  
  const theme = useTheme();
  const { currentUser } = useUser();
  const styles = useStyleSheet(themedStyles);

  // Fetch employees for salary category
  useEffect(() => {
    if (expCategory === 'Salary') {
      fetchEmployees();
    }
  }, [expCategory]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('Employee')
        .select('id, name, salary');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.log('Error fetching employees:', error);
      showErrorMessage('Error loading employees');
    }
  };

  const handleEmployeeToggle = (employee) => {
    const isSelected = selectedEmployees.some(e => e.id === employee.id);
    if (isSelected) {
      setSelectedEmployees(selectedEmployees.filter(e => e.id !== employee.id));
    } else {
      setSelectedEmployees([...selectedEmployees, employee]);
    }
  };

  const calculateTotalSalary = () => {
    const totalSalary = selectedEmployees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    const bonusAmount = parseFloat(bonus) || 0;
    return totalSalary + bonusAmount;
  };

  // EB CALCULATION FORMULA: Cost per Unit × (Present Reading - Previous Reading)
  const calculateEBAmount = () => {
    const prevReading = parseFloat(prevMonthReading) || 0;
    const presentReading = parseFloat(presentMonthReading) || 0;
    const unitsConsumed = presentReading - prevReading; // Calculate units consumed
    const cost = parseFloat(costPerUnit) || 0;
    const totalAmount = unitsConsumed * cost; // FINAL FORMULA
    return totalAmount;
  };

  // Auto-populate cost per unit based on EB type
  useEffect(() => {
    if (ebType) {
      // Set default cost per unit based on type
      const defaultCosts = {
        'Shop': '7',
        'Unit': '6',
        'Hostel': '5'
      };
      setCostPerUnit(defaultCosts[ebType] || '');
    }
  }, [ebType]);

  const handleAddTransaction = async () => {
    try {
      if (!isIncome && !expCategory) {
        Alert.alert('Error', 'Please select a category!');
        return;
      }
      
      if (isIncome && !incomeCategory) {
        Alert.alert('Error', 'Please select a category!');
        return;
      }

      // Validation for Salary
      if (expCategory === 'Salary') {
        if (selectedEmployees.length === 0) {
          Alert.alert('Error', 'Please select at least one employee!');
          return;
        }
        const totalAmount = calculateTotalSalary();
        setAmount(totalAmount.toString());
      }

      // Validation for Rent
      if (expCategory === 'Rent') {
        if (!rentType) {
          Alert.alert('Error', 'Please select rent type (Shop/Unit/Hostel)!');
          return;
        }
        if (!amount || amount === '0') {
          Alert.alert('Error', 'Please enter rent amount!');
          return;
        }
      }

      // Validation for EB
      if (expCategory === 'EB') {
        if (!ebType) {
          Alert.alert('Error', 'Please select EB type (Shop/Unit/Hostel)!');
          return;
        }
        if (!prevMonthDate || !prevMonthReading || !presentMonthDate || !presentMonthReading) {
          Alert.alert('Error', 'Please enter all EB reading details!');
          return;
        }
        if (!costPerUnit) {
          Alert.alert('Error', 'Please enter cost per unit!');
          return;
        }
        if (parseFloat(presentMonthReading) <= parseFloat(prevMonthReading)) {
          Alert.alert('Error', 'Present month reading must be greater than previous month reading!');
          return;
        }
        const calculatedAmount = calculateEBAmount();
        setAmount(calculatedAmount.toString());
      }

      // General validation for other categories
      if (expCategory !== 'Salary' && expCategory !== 'Rent' && expCategory !== 'EB') {
        if (!amount || amount === '0') {
          Alert.alert('Error', 'Please enter amount!');
          return;
        }
      }

      const transactionType = isIncome ? 'Income' : 'Expense';
      
      // Prepare additional data based on category
      let additionalData = {};
      
      if (expCategory === 'Salary') {
        additionalData = {
          employees: selectedEmployees.map(e => ({ id: e.id, name: e.name, salary: e.salary })),
          bonus: parseFloat(bonus) || 0,
          totalAmount: calculateTotalSalary()
        };
      } else if (expCategory === 'Rent') {
        additionalData = {
          rentType: rentType,
          description: `Rent - ${rentType}`
        };
      } else if (expCategory === 'EB') {
        const unitsConsumed = parseFloat(presentMonthReading) - parseFloat(prevMonthReading);
        const calculatedAmount = calculateEBAmount();
        additionalData = {
          ebType: ebType,
          prevMonthDate: prevMonthDate,
          prevMonthReading: parseFloat(prevMonthReading),
          presentMonthDate: presentMonthDate,
          presentMonthReading: parseFloat(presentMonthReading),
          unitsConsumed: unitsConsumed,
          costPerUnit: parseFloat(costPerUnit),
          calculatedAmount: calculatedAmount,
          description: `EB - ${ebType} (${unitsConsumed} units @ ₹${costPerUnit}/unit)`
        };
      }

      const finalAmount = expCategory === 'Salary' ? calculateTotalSalary() : 
                          expCategory === 'EB' ? calculateEBAmount() : 
                          parseInt(amount);
      const finalDescription = additionalData.description || description;

      const { error } = await supabase
        .from('IncomeExpense')
        .insert({ 
          username: currentUser.username, 
          entryType: transactionType, 
          category: expCategory || incomeCategory, 
          amount: finalAmount, 
          description: finalDescription,
          additionalData: JSON.stringify(additionalData)
        });
        
      if (error) {
        throw error;
      }
      
      showSuccessMessage('Success! ' + `${transactionType} added successfully!`);
      eventEmitter.emit('transactionAdded');
      resetForm();
      
    } catch (error) {
      console.log(error);
      showErrorMessage('Error! ' + error.message);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setIncomeCategory(null);
    setExpCategory(null);
    setIncIndex(null);
    setExpIndex(null);
    setSelectedEmployees([]);
    setBonus('');
    setRentType(null);
    setRentIndex(null);
    setEbType(null);
    setEbIndex(null);
    setPrevMonthDate(new Date());
    setPrevMonthReading('');
    setPresentMonthDate(new Date());
    setPresentMonthReading('');
    setCostPerUnit('');
  };
  
  const handleSelectInc = (index) => {
    setIncIndex(index);
    setIncomeCategory(incomeCat[index.row]);
  };
  
  const handleSelectExp = (index) => {
    setExpIndex(index);
    setExpCategory(expCat[index.row]);
    // Reset category-specific fields
    setSelectedEmployees([]);
    setBonus('');
    setRentType(null);
    setRentIndex(null);
    setEbType(null);
    setEbIndex(null);
    setPrevMonthDate('');
    setPrevMonthReading('');
    setPresentMonthDate('');
    setPresentMonthReading('');
    setCostPerUnit('');
    setAmount('');
  };

  const handleSelectRent = (index) => {
    setRentIndex(index);
    setRentType(rentTypes[index.row]);
  };

  const handleSelectEB = (index) => {
    setEbIndex(index);
    setEbType(ebTypes[index.row]);
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

          {/* Salary Category Fields */}
          {expCategory === 'Salary' && (
            <View style={styles.categorySection}>
              <Text category="h6" style={styles.sectionTitle}>Select Employees</Text>
              {employees.length === 0 ? (
                <Text style={styles.noDataText}>No employees found. Please add employees first.</Text>
              ) : (
                employees.map((employee) => (
                  <CheckBox
                    key={employee.id}
                    style={styles.checkbox}
                    checked={selectedEmployees.some(e => e.id === employee.id)}
                    onChange={() => handleEmployeeToggle(employee)}
                  >
                    {`${employee.name} - ₹${employee.salary}`}
                  </CheckBox>
                ))
              )}
              
              <Input
                style={styles.input}
                label="Bonus Amount (Optional)"
                keyboardType="numeric"
                value={bonus}
                onChangeText={setBonus}
                placeholder="Enter bonus amount"
              />
              
              {selectedEmployees.length > 0 && (
                <View style={styles.totalContainer}>
                  <Text category="s1">Total Salary: ₹{selectedEmployees.reduce((sum, emp) => sum + emp.salary, 0)}</Text>
                  {bonus && <Text category="s1">Bonus: ₹{bonus}</Text>}
                  <Text category="h6" style={styles.totalAmount}>Total Amount: ₹{calculateTotalSalary()}</Text>
                </View>
              )}
            </View>
          )}

          {/* Rent Category Fields */}
          {expCategory === 'Rent' && (
            <View style={styles.categorySection}>
              <Select
                style={styles.input}
                label="Select Rent Type"
                placeholder='Shop / Unit / Hostel'
                selectedIndex={rentIndex}
                onSelect={handleSelectRent}
                value={rentType}
              >
                {rentTypes.map((option, index) => (
                  <SelectItem title={option} key={index} />
                ))}
              </Select>
            </View>
          )}

          {/* EB Category Fields */}
          {expCategory === 'EB' && (
            <View style={styles.categorySection}>
              <Select
                style={styles.input}
                label="Select EB Type"
                placeholder='Shop / Unit / Hostel'
                selectedIndex={ebIndex}
                onSelect={handleSelectEB}
                value={ebType}
              >
                {ebTypes.map((option, index) => (
                  <SelectItem title={option} key={index} />
                ))}
              </Select>
              
              <Text category="h6" style={styles.sectionTitle}>Previous Month Details</Text>
              <Datepicker
				  style={styles.input}
				  label="Previous Month Date *"
				  date={prevMonthDate}
				  onSelect={nextDate => setPrevMonthDate(nextDate)}
				  placeholder="Select previous month date"
				/>
              
              <Input
                style={styles.input}
                label="Previous Month Power Usage *"
                keyboardType="numeric"
                value={prevMonthReading}
                onChangeText={setPrevMonthReading}
                placeholder="Enter previous reading"
              />
              
              <Text category="h6" style={styles.sectionTitle}>Present Month Details</Text>
              <Datepicker
				  style={styles.input}
				  label="Present Month Date *"
				  date={presentMonthDate}
				  onSelect={nextDate => setPresentMonthDate(nextDate)}
				  placeholder="Select present month date"
				/>
              
              <Input
                style={styles.input}
                label="Present Month Power Usage *"
                keyboardType="numeric"
                value={presentMonthReading}
                onChangeText={setPresentMonthReading}
                placeholder="Enter present reading"
              />
              
              <Input
                style={styles.input}
                label="Cost per Unit (₹) *"
                keyboardType="numeric"
                value={costPerUnit}
                onChangeText={setCostPerUnit}
                placeholder="Enter cost per unit"
              />
              
              {prevMonthReading && presentMonthReading && costPerUnit && 
               parseFloat(presentMonthReading) > parseFloat(prevMonthReading) && (
                <View style={styles.ebCalculationContainer}>
                  <Text category="s1">Units Consumed: {parseFloat(presentMonthReading) - parseFloat(prevMonthReading)} units</Text>
                  <Text category="s1">Cost per Unit: ₹{costPerUnit}</Text>
                  <Text category="h6" style={styles.calculatedAmount}>
                    Total Amount: ₹{calculateEBAmount().toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Shared Input Fields */}
      {expCategory !== 'Salary' && expCategory !== 'EB' && (
        <Input
          style={styles.input}
          label="Enter amount *"
          keyboardType="numeric"
          value={amount.toString()}
          onChangeText={setAmount}
        />
      )}
      
      {expCategory !== 'Rent' && expCategory !== 'EB' && (
        <Input
          style={styles.input}
          label="Enter description"
          value={description}
          onChangeText={setDescription}
        />
      )}

      {/* Add Transaction Button */}
      <Button style={styles.addButton} onPress={handleAddTransaction}>
        Add {isIncome ? 'Income' : 'Expense'}
      </Button>
    </ScrollView>
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
    marginTop: 15,
	marginBottom: 30,
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
  },
  categorySection: {
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  checkbox: {
    marginVertical: 8,
  },
  totalContainer: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  totalAmount: {
    marginTop: 8,
    color: 'color-primary-500',
    fontWeight: 'bold',
  },
  unitsContainer: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  ebCalculationContainer: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: -15,
  },
  calculatedAmount: {
    marginTop: 8,
    color: 'color-primary-500',
    fontWeight: 'bold',
  },
  noDataText: {
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 10,
  }
});

export default AddExpenseScreen;