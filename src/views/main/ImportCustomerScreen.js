import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { Input, List, ListItem, Text } from '@ui-kitten/components';
import { useUser } from '../main/UserContext';
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Contacts from 'expo-contacts';
import * as Linking from "expo-linking";

const ImportCustomerScreen = () => {
	const route = useRoute();
	const { onContactSelected } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser } = useUser();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  console.log('in ImportCustomerScreen');
  useEffect(() => {
    (async () => {
		console.log('in useEffect')
		try {
			setLoading(true);
			  const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
			  console.log(status)
			  if (status === 'granted') {
				const { data } = await Contacts.getContactsAsync({
				  fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
				});

				if (data.length > 0) {
					const contacts = data
					  .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
					  .map(contact => ({
						id: contact.id,
						name: contact.name,
						phoneNumber: contact.phoneNumbers[0].number,
					  }));

					setAllContacts(contacts);
					setFilteredContacts(contacts);
				}
			  } else {
				Linking.openSettings();
				console.log(canAskAgain)
			  }
		} catch(error) {
			console.log(error)
		} finally {
			setLoading(false)
		}
    })();
  }, []);

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    if (query === '') {
      setFilteredContacts(allContacts);
    } else {
      const filteredData = allContacts.filter((contact) =>
        contact.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredContacts(filteredData);
    }
  };
  
  const handleSelectContact = (contact) => {
	  const capName = contact.name.charAt(0).toUpperCase() + contact.name.slice(1)
	  let cleanedPh = contact.phoneNumber.replace(/\s+/g, "");
	  console.log('in handleSelectContact')
	  console.log(contact)
	  if(route.params.screenName === 'EditOrderDetails') {
		const { item, userType, orderDate, shopName, shopAddress, shopPhNo, isShareIntent } = route.params
		navigation.navigate(route.params.screenName, {...route.params, workerNameImp: capName.trim(), workerPhNoImp: cleanedPh})
	  } else if(route.params.screenName === 'OrderBagScreen') {
		if (route.params.isShare) {
			onContactSelected(cleanedPh);
		} else { 
			navigation.navigate('OrderBagScreen', {workerNameImp: capName.trim(), workerPhNoImp: cleanedPh})
		}
	  } else {
		navigation.navigate('Test', { ...route.params, custName: capName.trim(), phoneNo: cleanedPh})
	  }
  };

  const renderContact = ({ item }) => {
	return(
		<ListItem title={item.name} description={item.phoneNumber} onPress={() => handleSelectContact(item)}/>
	  )
  };

  return (
    <View style={styles.container}>
		{loading ? (
				<ActivityIndicator size="large" style={styles.spinner} />
		  ) : (  
		<>
		  <Input
			placeholder="Search"
			value={searchQuery}
			onChangeText={onChangeSearch}
			style={styles.searchBar}
		  />

		  <List
			data={filteredContacts}
			renderItem={renderContact}
			ListEmptyComponent={<Text style={styles.emptyText}>No contacts found</Text>}
		  />
		</>
		)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  searchBar: {
    marginVertical: 10,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
});

export default ImportCustomerScreen;
