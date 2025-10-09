import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View, 
  Alert
} from 'react-native';
import {
  Layout,
  Text,
  List,
  ListItem,
  TopNavigation,
  Avatar,
  Icon,
  Divider,
} from '@ui-kitten/components';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../constants/supabase';
import eventEmitter from '../main/eventEmitter';
import { storage } from '../extra/storage';
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';

const EmployeeList = () => {
  // Icons
  const PeopleIcon = (props) => <Icon {...props} name='people-outline' />;
  const ChevronRightIcon = (props) => <Icon {...props} name='chevron-right-outline' />;
  const [employees, setEmployees] = useState([]);
  const navigation = useNavigation();
  const [empDeleted, setEmpDeleted] = useState(0);
  
  useEffect(() => {
	  const getAllEmployees = async() => {
		const { data, error } = await supabase
							  .from('Employee')
							  .select(`*`);
			  if (error) {
				throw error;
			  }
			  console.log(data);
		setEmployees(data);
	  }
	  eventEmitter.once('employeeUpdated', getAllEmployees);

	  getAllEmployees();
  }, [empDeleted]);

	const onEmployeeSelect = (employee) => {
		navigation.navigate('EmployeeDetail', {employeeParam: employee});
	}

	const formatSalary = (salary, type) => {
	  if (salary == null || isNaN(salary)) return 'Salary not set';
	  if (!type) return `₹${Number(salary).toLocaleString()}`;
	  return `₹${Number(salary).toLocaleString()}/${type}`;
	};

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('');
  };
  
  const onDeleteEmployee = async(item) => {
	const {error} = await supabase
	  .from('Employee')
	  .delete()
	  .eq('id', item.id)
	const cached = storage.getString('Employees');
	const employeeCache = cached ? JSON.parse(cached) : {};
	delete employeeCache[item.id];
	storage.set('Employees', JSON.stringify(employeeCache));
	setEmpDeleted(prev => prev + 1);
	if(error) {
		showErrorMessage('Error deleting employee', error.message);
		console.error(error);
	} else {
		showSuccessMessage('Employee deleted successfully!');
		eventEmitter.emit('transactionAdded', { onlyEmployeeData: true });
	}
  }
  
  const confirmDelete = (item) => {
	  Alert.alert(
		'Delete Employee',
		'Are you sure you want to delete this employee details?',
		[
		  { text: 'Cancel', style: 'cancel' },
		  {
			text: 'Delete',
			style: 'destructive',
			onPress: () => onDeleteEmployee(item),
		  },
		]
	  );
	};

  // Employee List Item Component
  const renderEmployeeItem = ({ item }) => {
    const EmployeeAvatar = () => (
      <Avatar
        style={styles.avatar}
        size='medium'
        source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=3366ff&color=fff&size=128` }}
      />
    );

    const AccessoryRight = () => <ChevronRightIcon style={styles.chevron} />;

    return (
      <ListItem
        title={evaProps => (
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>		
			<Text {...evaProps} style={styles.employeeName}>{item.name}</Text>
			<Icon
				name="trash-2-outline"
				fill="#FF3D71"
				style={{ width: 20, height: 20 }}
				onPress={() => confirmDelete(item)}
			  />
		</View>
		)}
        description={evaProps => (
          <Text {...evaProps} style={styles.employeeInfo}>
            {item.designation} • {formatSalary(item.salary, item.salaryType)}
          </Text>
        )}
        accessoryLeft={EmployeeAvatar}
        accessoryRight={AccessoryRight}
        onPress={() => onEmployeeSelect(item)}
        style={styles.listItem}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Layout style={styles.listContainer}>
        {employees.length > 0 ? (
		  <List
			data={employees}
			renderItem={renderEmployeeItem}
			keyExtractor={(item) => item.id.toString()}
			ItemSeparatorComponent={Divider}
			showsVerticalScrollIndicator={false}
			contentContainerStyle={styles.listContent}
		  />
		) : (
		  <Text appearance="hint" style={{ textAlign: 'center', marginTop: 20 }}>
			No Employees found
		  </Text>
		)}
      </Layout>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNavigation: {
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  subtitle: {
    fontSize: 14,
    color: '#8F9BB3',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    marginRight: 16,
  },
  chevron: {
    width: 24,
    height: 24,
    tintColor: '#8F9BB3',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 4,
  },
  employeeInfo: {
    fontSize: 14,
    color: '#8F9BB3',
    lineHeight: 20,
  },
  closeIcon: {
    width: 20, // Icon size
    height: 20,
  },
});

export default EmployeeList;