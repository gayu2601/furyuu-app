import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Modal, TouchableOpacity, Image, Alert, BackHandler } from 'react-native';
import { Layout, Text, Input, Icon, Button, Divider, RadioGroup, Radio } from '@ui-kitten/components';
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PersonalDetailsScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [inputValue, setInputValue] = useState('');
  const { updateCurrentUser, currentUser } = useUser();
  const { isConnected } = useNetwork();
  const navigation = useNavigation();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [genderIndex, setGenderIndex] = useState(null); 
  const [gender, setGender] = useState(''); 
  const genders = ['Male', 'Female', 'Other'];
  const [homeIndex, setHomeIndex] = useState(null); 
  const [homeMeas, setHomeMeas] = useState(''); 
  const [accounts, setAccounts] = useState([]);
  const [freelancerIndex, setFreelancerIndex] = useState(null); 
  const [freelancer, setFreelancer] = useState(''); 
  const boolOptions = ['Yes', 'No'];
  const [exp, setExp] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const profileItems = [
    { label: 'Name', value: name, icon: 'person-outline' },
    { label: 'Phone Number', value: phoneNumber, icon: 'phone-outline' },
    { label: 'Connected Google Email Id', value: email, icon: 'email-outline' },
    { label: 'Gender', value: gender, icon: 'smiling-face-outline' },
    { label: 'Years of Experience', value: exp, icon: 'calendar-outline' },
    { label: 'Taking home measurements from customers', value: homeMeas, icon: 'home-outline' },
    { label: 'Taking orders from other tailors', value: freelancer, icon: 'briefcase-outline' },
	{ label: 'Instagram Id', value: accounts, icon: 'instagram' }
  ];
  
  const dbLabelMap = {
	  'Name': 'name',
	  'Phone Number': 'phoneNo',
	  'Gender': 'gender',
	  'Years of Experience': 'yearsOfExp',
	  'Taking home measurements from customers': 'homeMeasurement',
	  'Taking orders from other tailors': 'freelancer',
	  'Instagram Id': 'socialMediaAcct'
  }
  
  const stateSetters = {
	  'Name': setName,
	  'Phone Number': setPhoneNumber,
	  'Gender': setGender,
	  'Years of Experience': setExp,
	  'Taking home measurements from customers': setHomeMeas,
	  'Taking orders from other tailors': setFreelancer,
	  'Instagram Id': setAccounts
	};
  
  const getDbColumnName = (label) => dbLabelMap[label] || null;
  
  useEffect(() => {
		const backAction = () => {
			  navigation.navigate('ProfileScreen')
			  return true;
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, []);
  
  useEffect(() => {
	  if(!isConnected) {
			 showErrorMessage("No Internet Connection");
	  }
	  
    const fetchUserDetails = async () => {
      if (currentUser) {
        setName(currentUser.name);
        setPhoneNumber(currentUser.phoneNo.substring(3));
		setEmail(currentUser.email);
		setGenderIndex(currentUser.gender === 'Male' ? 0 : 1);
		setGender(currentUser.gender);
		setExp(currentUser.yearsOfExp ? currentUser.yearsOfExp.toString() : '');
		setHomeMeas(currentUser.ShopDetails.homeMeasurement ? 'Yes' : 'No');
		setHomeIndex(currentUser.ShopDetails.homeMeasurement ? 0 : 1);
		setFreelancer(currentUser.freelancer ? 'Yes' : 'No');
		setFreelancerIndex(currentUser.freelancer ? 0 : 1)
		setAccounts(currentUser.ShopDetails.socialMediaAcct);
      }
    };

    fetchUserDetails();
  }, []);
  
  const openModal = (item) => {
    setSelectedItem(item.label);
	setInputValue(item.value)
    setModalVisible(true);
  };

  const closeModal = () => {
	  switch(selectedItem) {
		case 'Taking home measurements from customers':
			setHomeIndex(currentUser.ShopDetails.homeMeasurement ? 0 : 1);
			setHomeMeas(currentUser.ShopDetails.homeMeasurement ? 'Yes' : 'No');
			break;
		case 'Taking orders from other tailors':
			setFreelancer(currentUser.freelancer ? 'Yes' : 'No');
			setFreelancerIndex(currentUser.freelancer ? 0 : 1);
			break;
		case 'Gender':
			setGenderIndex(currentUser.gender === 'Male' ? 0 : 1);
			setGender(currentUser.gender);
			break;
		default:
			const dbColumnName = getDbColumnName(selectedItem);
			stateSetters[selectedItem](currentUser[dbColumnName]);
	  }
	setModalVisible(false);
  };
  
  function isValidPhoneNumber(phoneNo) {
	  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
	  return phoneRegex.test(phoneNo);
	}

  const handleSave = async() => {
	  const dbColumnName = getDbColumnName(selectedItem);
	  let finalVal = null;
	  
    switch (selectedItem) {
	  case 'Phone Number':
		if(inputValue === '') {
			showErrorMessage('Enter value to update!')
			return;
		} else {
			const isValid = isValidPhoneNumber(inputValue);
			if(isValid) {
				const phNo = '+91' + inputValue;
				finalVal = phNo;
			} else {
				showErrorMessage('Enter a valid phone number!');
			}
		}
		break;
	  case 'Gender':
		finalVal = gender;
		break;
	  case 'Taking home measurements from customers':
		finalVal = homeMeas;
		break;
	  case 'Taking orders from other tailors':
		finalVal = freelancer;
		break;
	  default:
		if(inputValue === '') {
			showErrorMessage('Enter value to update!')
			return;
		} else {
			console.log('inputValue: ' + inputValue);
			finalVal = inputValue;
		}
		break;
	}
	
	  if (stateSetters[selectedItem]) {
		console.log('finalVal: ' + finalVal);
		stateSetters[selectedItem](finalVal)
		if(['Instagram Id','Taking home measurements from customers'].includes(selectedItem)) {
			const { error } = await supabase
							.from('ShopDetails')
							.update({ [dbColumnName]: finalVal})
							.eq('id', currentUser.ShopDetails.id)
							.select().maybeSingle();

							if(error) {
								throw error;
							}
		} else {
			const { error } = await supabase
							.from('profiles')
							.update({ [dbColumnName]: finalVal})
							.eq('id', currentUser.id)
							.select().maybeSingle();

							if(error) {
								throw error;
							}
		}
		const { data: data1, error: error1, status } = await supabase
									.from('profiles')
									.select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
									.eq('id', currentUser.id)
									.maybeSingle()
		if (error1) {
			console.log(error1)
			throw error1;
		}
		console.log(data1)
		if(data1) {
			updateCurrentUser(data1);			
			showSuccessMessage('Updated ' + selectedItem + '!')
		} else {
			showErrorMessage('Unable to update details!')
		}
	}
    
	setModalVisible(false); 
  };
  
  const handleGenderSelect = (index) => {
		setGenderIndex(index);
		setGender(genders[index]);
	};
	
	const handleHomeMeasSelect = (index) => {
		setHomeIndex(index);
		setHomeMeas(boolOptions[index]);
	};
	
	const handleFreelancerSelect = (index) => {
		setFreelancerIndex(index);
		setFreelancer(boolOptions[index]);
	};
  
  const renderModalContent = () => {
    switch (selectedItem) {
      case 'Gender':
        return (
          <RadioGroup
					selectedIndex={genderIndex}
					onChange={handleGenderSelect}
					style={styles.radioGroup}
				  >
					{genders.map((gender, index) => (
					  <Radio key={index}>{gender}</Radio>
					))}
				</RadioGroup>
        );
      case 'Taking home measurements from customers':
	    return (
          <RadioGroup
					selectedIndex={homeIndex}
					onChange={handleHomeMeasSelect}
					style={styles.radioGroup}
				  >
					{boolOptions.map((opt, index) => (
					  <Radio key={index}>{opt}</Radio>
					))}
			</RadioGroup>
        );
      case 'Taking orders from other tailors':
        return (
          <RadioGroup
					selectedIndex={freelancerIndex}
					onChange={handleFreelancerSelect}
					style={styles.radioGroup}
				  >
					{boolOptions.map((opt, index) => (
					  <Radio key={index}>{opt}</Radio>
					))}
			</RadioGroup>
        );
      default:
        return (
          <Input
            style={styles.input}
            value={inputValue}
			keyboardType={selectedItem === 'Years of Experience' ? 'numeric' : (selectedItem === 'Phone Number' ? 'phone-pad' : 'default')}
            onChangeText={setInputValue}
            placeholder={`Enter ${selectedItem}`}
			{...(selectedItem === 'Phone Number' ? { maxLength: 10 } : {})}
          />
        );
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Layout style={styles.container}>
	  <View style={{marginTop: -20}}>
        {profileItems.map((item, index) => (
		  <>
          <TouchableOpacity key={index} style={styles.row} onPress={() => item.label !== 'Connected Google Email Id' ? openModal(item) : {}}>
			{item.label === 'Instagram Id' ? (
				<FontAwesome name={item.icon} size={30} style={{marginLeft: 3}} color={'#000'}/>
			) : (
				<Icon name={item.icon} style={styles.icon} fill={'#000'} />
			)}
            <View style={styles.column}>
              <Text category="label">{item.label}</Text>
			  <Text category='s2'>{item.value}</Text>
            </View>
            {item.label !== 'Connected Google Email Id' && (<Icon name="chevron-right-outline" style={styles.arrowIcon} fill="#8F9BB3" />)}
          </TouchableOpacity>
		  </>
        ))}
	  </View>

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text category="h6" style={styles.modalTitle}>
                Edit {selectedItem}
              </Text>
              {renderModalContent()}
              <View style={styles.modalActions}>
                <Button style={styles.button} size='small' onPress={closeModal} appearance="outline">
                  Cancel
                </Button>
                <Button style={styles.button} size='small' onPress={handleSave}>
                  Save
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </Layout>
	</ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
	backgroundColor: '#fff'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  column: {
    flex: 1,
    marginLeft: 16,
  },
  icon: {
    width: 32,
    height: 32,
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
	marginLeft: -5
  },
  modalActions: {
    flexDirection: 'row',
	justifyContent: 'center',
    gap: 30
  },
  button: {
    marginLeft: 8,
  },
  divider: {
	color: '#ccc',
	marginVertical: 5
  },
  image: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
  },
  radioGroup: { flexDirection: 'row', marginRight: 30, marginBottom: 16}
});

export default PersonalDetailsScreen;
