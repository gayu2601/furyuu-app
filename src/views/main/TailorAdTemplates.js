import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert, ImageBackground, Image, Dimensions, TouchableOpacity } from 'react-native';
import {
  ApplicationProvider,
  Layout,
  Text,
  Card,
  Button,
  Input,
  Modal,
  IconRegistry,
  Icon,
  TopNavigation,
  TopNavigationAction, Spinner
} from '@ui-kitten/components';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import { useUser } from '../main/UserContext';
import { supabase } from '../../constants/supabase'
import { logFirebaseEvent } from '../extra/firebaseUtils'
import { showSuccessMessage, showErrorMessage } from './showAlerts';

// Tailor shop ad templates with background images
const adTemplates = [
  {
    id: 1,
    title: 'Wedding Collection',
    category: 'Bridal & Groom',
    bgImage: require('../../../assets/ad_templates/template4.jpg'),
    bgColor: '#1a1a2e',
    textColor: '#ffffff',
    accentColor: '#d4af37',
    fields: [
      { key: 'shopName', label: 'Shop Name', value: 'XXX Tailors', type: 'text' },
		{ key: 'adText', label: 'Ad Text', value: '20% Off Wedding Collection! Custom Suits, Lehengas, Sherwanis.', type: 'multiline' },
		{ key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
		{ key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - 20% Off Wedding Collection! Custom Suits, Lehengas, Sherwanis.'
  },
  {
    id: 2,
    title: 'Formal Wear',
    category: 'Office & Business',
    bgImage: require('../../../assets/ad_templates/template5.jpg'),
    bgColor: '#2c3e50',
    textColor: '#ffffff',
    accentColor: '#3498db',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: 'XXX Tailors', type: 'text' },
		{ key: 'adText', label: 'Ad Text', value: 'Corporate Suits & Shirts. 15+ Years Experience. 3-5 Days delivery.', type: 'multiline' },
		{ key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
		{ key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Corporate Suits & Shirts. 15+ Years Experience. 3-5 Days delivery.'
  },
  {
    id: 3,
    title: 'Ethnic-wear Collection',
    category: 'Repairs & Alterations',
    bgImage: require('../../../assets/ad_templates/template1_1.jpg'),
    bgColor: '#8b4513',
    textColor: '#ffffff',
    accentColor: '#ffa500',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Quick Delivery for Anarkalis, Lehengas & Shararas. Same Day Alterations Available.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Quick Delivery for Anarkalis, Lehengas & Shararas. Same Day Alterations Available.'
  },
  {
    id: 4,
    title: 'Festive Wear Offers',
    category: 'Ethnic & Cultural',
    bgImage: require('../../../assets/ad_templates/template1.jpg'),
    bgColor: '#4a0e4e',
    textColor: '#ffffff',
    accentColor: '#ff6b6b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: 'XXX Tailors', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Sarees, Kurtas, Traditional Dresses. Festive Season 30% Off! Design Your Own Style.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Sarees, Kurtas, Traditional Dresses. Festive Season 30% Off! Design Your Own Style.'
  },
  {
    id: 5,
    title: 'Kids Collection',
    category: 'Children\'s Wear',
    bgImage: require('../../../assets/ad_templates/template1_3.jpg'),
    bgColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#fdcb6e',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Perfect stitching for all Children between 1-16 Years. Birthday, School Events, Parties.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Perfect stitching for all Children between 1-16 Years. Birthday, School Events, Parties.'
  },
  {
    id: 6,
    title: 'Festive Collection',
    category: 'Ethinic & Cultural',
    bgImage: require('../../../assets/ad_templates/template9.jpg'),
    bgColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#c0392b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Festive Designer Collection. Festive Season offers going on!', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Festive Designer Collection. Festive Season offers going on!'
  },
  {
    id: 7,
    title: 'Boutique Collection',
    category: 'Ethnic & Cultural',
    bgImage: require('../../../assets/ad_templates/template1_0.jpg'),
    bgColor: '#1e1e1e',
    textColor: '#ffffff',
    accentColor: '#c0392b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Unique Customized Collection for all functions. Book Personal Consultation.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Boutique - Unique Customized Collection for all functions. Book Personal Consultation.'
  },
  {
    id: 8,
    title: 'Bridal Collection',
    category: 'Luxury & Designer',
    bgImage: require('../../../assets/ad_templates/template3.jpg'),
    bgColor: '#0a0a19',
    textColor: '#ffffff',
    accentColor: '#c0392b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Premium Bridal Collection. Bridal lehengas, sarees.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Premium Bridal Collection. Bridal lehengas, sarees.'
  },
  {
    id: 9,
    title: 'Premium Collection',
    category: 'Luxury & Designer',
    bgImage: require('../../../assets/ad_templates/template7.jpg'),
    bgColor: '#190f05',
    textColor: '#ffffff',
    accentColor: '#c0392b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Premium Designer Collection. Silk, Velvet, Premium Cotton. Book Personal Consultation.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'Royal Couture - Premium Designer Collection. Silk, Velvet, Premium Cotton. Book Personal Consultation.'
  },
  {
    id: 10,
    title: 'Mom & Daughter Combo',
    category: 'Luxury & Designer',
    bgImage: require('../../../assets/ad_templates/template1_2.jpg'),
    bgColor: '#0f0a1e',
    textColor: '#ffffff',
    accentColor: '#c0392b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Mom & Daughter Matching Dress Collection. Partywear, Ethinic dresses, Frocks & More.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Boutique - Mom & Daughter Matching Dress Collection. Partywear, Ethinic dresses, Frocks & More.'
  },
  {
    id: 11,
    title: 'Partywear Outfits',
    category: 'Modern & Designer',
    bgImage: require('../../../assets/ad_templates/template6.jpg'),
    bgColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#c0392b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Premium Partywear Collection. Sequin & Western Style Partywear Dresses.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Premium Partywear Collection. Sequin & Western Style Partywear Dresses.'
  },
  {
    id: 12,
    title: 'Designer Collection',
    category: 'Luxury & Designer',
    bgImage: require('../../../assets/ad_templates/template1_4.jpg'),
    bgColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#c0392b',
    fields: [
        { key: 'shopName', label: 'Shop Name', value: '', type: 'text' },
	  { key: 'adText', label: 'Ad Text', value: 'Premium Bridal Collection. Bridal lehengas, sarees.', type: 'multiline' },
	  { key: 'contact', label: 'Contact', value: '+91 9999999999', type: 'text' },
	  { key: 'location', label: 'Location', value: 'Gandhi Nagar, Adyar', type: 'text' },
    ],
    preview: 'XXX Tailors - Premium Bridal Collection. Bridal lehengas, sarees.'
  }
];

const BackIcon = (props) => (
  <Icon {...props} name='arrow-back' />
);

const EditIcon = (props) => (
  <Icon {...props} name='edit-2' />
);

const SaveIcon = (props) => (
  <Icon {...props} name='save' />
);

const ScissorsIcon = (props) => (
  <Icon {...props} name='scissors-outline' />
);

const TailorAdTemplates = ({ saveAd }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Separate state for form fields to avoid re-rendering the entire modal
  const [formFields, setFormFields] = useState({});
  const fieldRefs = useRef({}); // holds refs to all local field values
	const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const previewRef = useRef();
  const [loading, setLoading] = useState(false);
  const { updateCurrentUser, currentUser } = useUser();

  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(template);
	console.log('in handleTemplateSelect')
	console.log(template.fields[0])
	fieldRefs.current['shopName'] = template.fields[0].value;
	fieldRefs.current['adText'] = template.fields[1].value;
	fieldRefs.current['contact'] = template.fields[2].value;
	fieldRefs.current['location'] = template.fields[3].value;
    // Initialize form fields with template default values
    const initialFields = template.fields.reduce((acc, field) => {
      acc[field.key] = field.value;
      return acc;
    }, {});
    setFormFields(initialFields);
    setModalVisible(true);
  }, []);
  
  const backToEditing = () => {
	setPreviewModalVisible(false);
	setModalVisible(true);
  }
  
  const handlePreview = () => {
	  const updatedFields = {};
	  console.log(fieldRefs.current)
	  Object.keys(fieldRefs.current).forEach((key) => {
		updatedFields[key] = fieldRefs.current[key];
	  });
	  setFormFields(updatedFields);
	  setModalVisible(false);
	  setPreviewModalVisible(true);
	};

  // Updated generatePreview function to capture component as image
  const generatePreview = useCallback(async (template, fieldValues) => {
    try {
      if (previewRef.current) {
        const uri = await previewRef.current.capture();
        return uri; // Returns the image URI instead of text
      }
      return null;
    } catch (error) {
      console.log('Error generating preview image:', error);
      // Fallback to text preview if image capture fails
      return `${fieldValues.shopName || 'Shop Name'} - ${fieldValues.adText || 'Ad Text'} Located at ${fieldValues.location || 'Location'}. Call ${fieldValues.contact || 'Contact'}`;
    }
  }, []);
  
  const handleSave = useCallback(async () => {
    const previewImage = await generatePreview(selectedTemplate, formFields);
    
    Alert.alert(
      'Tailor Ad Created! ✂️',
      `Your ${selectedTemplate.title} ad is ready!`,
      [
        {
          text: 'Post Ad',
          style: 'default',
          onPress: async() => {
			if (previewImage && previewImage.startsWith('file://')) {
				await saveAd(previewImage);
			}
			setPreviewModalVisible(false);
            setModalVisible(false);
            setSelectedTemplate(null);
            setFormFields({});
          }
        },
        {
          text: 'Share Ad',
          onPress: async () => {
            if (previewImage && previewImage.startsWith('file://')) {
              // If we have an image URI, share it
              try {
                await Sharing.shareAsync(previewImage);
              } catch (error) {
                console.log('Error sharing image:', error);
              }
            } else {
              Alert.alert('Share', 'Ad ready to share on social media!');
            }
          }
        }
      ]
    );
  }, [selectedTemplate, formFields, generatePreview]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedTemplate(null);
    setFormFields({});
  }, []);

  // Memoized template card component
  const TemplateCard = React.memo(({ template }) => (
    <Card style={styles.templateCard} onPress={() => handleTemplateSelect(template)}>
      <ImageBackground 
        source={template.bgImage} 
        style={styles.cardBackground}
      >
        <View style={[styles.cardOverlay, { backgroundColor: template.bgColor + '66' }]}>
          <View style={styles.cardContent}>
            <Text 
              category='h6' 
              style={[styles.templateTitle, { color: template.textColor }]}
            >
              {template.title}
            </Text>
            <Text 
              category='s2' 
              style={[styles.templateCategory, { color: template.accentColor }]}
            >
              {template.category}
            </Text>
            <Text 
              category='p2' 
              style={[styles.templatePreview, { color: template.textColor }]} 
              numberOfLines={2}
            >
              {template.preview}
            </Text>
            <Button
              style={[styles.selectButton, { backgroundColor: template.accentColor }]}
              size='small'
              accessoryLeft={EditIcon}
              onPress={() => handleTemplateSelect(template)}
            >
              Customize Ad
            </Button>
          </View>
        </View>
      </ImageBackground>
    </Card>
  ));

  // Memoized preview card component wrapped with ViewShot
  const AdPreviewCard = React.memo(({ template, fieldValues }) => (
    <ViewShot ref={previewRef} options={{ format: "jpg", quality: 0.9 }}>
      <Card style={styles.previewCard}>
        <ImageBackground 
          source={template.bgImage} 
          style={styles.previewBackground}
        >
          <View style={[styles.previewOverlay, { backgroundColor: template.bgColor + '66' }]}>
            <View style={styles.previewContent}>
              <Text 
                category='h6' 
                style={[styles.previewShopName, { color: template.textColor }]}
              >
                {fieldValues.shopName || 'Shop Name'}
              </Text>
              
              <View style={styles.previewDetails}>
                <Text
                  category='s1'
                  style={[styles.previewText, { color: template.textColor }]}
                >
                  {fieldValues.adText || 'Ad Text'}
                </Text>
              </View>
              
              <Text 
                category='label' 
                style={styles.previewContact}
              >
                📞 {fieldValues.contact || 'Contact'}
              </Text>
              
              <Text 
                category='label' 
                style={styles.previewLocation}
              >
                📍 {fieldValues.location || 'Location'}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </Card>
    </ViewShot>
  ));
  
  // Memoized editable field component
  const EditableField = React.memo(({ field, value, onValueChange }) => {
	  const [localValue, setLocalValue] = useState(value || '');

	  // Update local value when parent value changes (initial load or reset)
	  useEffect(() => {
		setLocalValue(value || '');
	  }, [value]);
	  
	  const handleChange = (text) => {
		setLocalValue(text);
		onValueChange && onValueChange(text); // push to ref on each change
	  };

	return (
		<View style={styles.fieldContainer}>
		  <Text category='label' style={styles.fieldLabel}>
			{field.label}
		  </Text>
		  <Input
			value={localValue}
			onChangeText={handleChange}
			multiline={field.type === 'multiline'}
			numberOfLines={field.type === 'multiline' ? 3 : 1}
			keyboardType={field.type === 'number' ? 'numeric' : 'default'}
			style={styles.input}
			placeholder={`Enter ${field.label.toLowerCase()}`}
		  />
		</View>
	);	
  });

  // Memoized edit modal component
  const EditModal = React.memo(() => {
    if (!selectedTemplate) return null;

    return (
      <Modal
        visible={modalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={closeModal}
      >
        <Layout style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true} persistentScrollbar={true}>
			
			<TouchableOpacity
						style={styles.closeButton}
						onPress={closeModal}
			>
				<Icon name="close-outline" fill="#555" style={styles.closeIcon} />
			</TouchableOpacity>
            <Text category='h6' style={styles.modalTitle}>
              Customize Your Tailor Ad
            </Text>
            
            {selectedTemplate.fields.map((field) => (
              <EditableField 
                key={field.key} 
                field={field} 
                value={formFields[field.key]}
                onValueChange={(val) => {
					fieldRefs.current[field.key] = val;
				  }}				
              />
            ))}
			
			  <View style={styles.buttonContainer}>
				<Button
				  onPress={handlePreview}
				  style={styles.previewButton}
				  size='small'
				>
				  View Ad Preview
				</Button>
			  </View>
          </ScrollView>
        </Layout>
      </Modal>
    );
  });
  
  const PreviewModal = () => {
	return(
	  <Modal visible={previewModalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setPreviewModalVisible(false)}
		>
			<Layout style={styles.modalContainer1}>
			<View style={styles.modalContent1}>
              <Text category='label' style={styles.previewLabel}>
                📱 Live Ad Preview:
              </Text>
              <AdPreviewCard template={selectedTemplate} fieldValues={formFields} />
			  <View style={styles.buttonContainer1}>
				<Button
				  onPress={backToEditing}
				  size='small'
				  appearance='outline'
				>
				  Back
				</Button>
				<Button
				  style={styles.saveButton}
				  size='small'
				  accessoryLeft={SaveIcon}
				  onPress={handleSave}
				>
				  Create Ad
				</Button>
			  </View>
			</View>
            </Layout>
		</Modal>
	);
  }

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text category='h5' style={styles.headerText}>
          Create Professional Tailor Ads
        </Text>
        <Text category='s1' appearance='hint' style={styles.subHeaderText}>
          Choose a template and customize it for your tailor shop
        </Text>

        <View style={styles.templatesContainer}>
          {adTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </View>
      </ScrollView>

      <EditModal />
	  <PreviewModal />
	  <Modal
		visible={loading}
		backdropStyle={styles.backdrop}
	  >
			<Spinner size="large" status="primary" />
	  </Modal>
    </Layout>
  );
};

const WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  topNav: {
    paddingTop: 40,
    backgroundColor: '#2c3e50',
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
	marginTop: -5
  },
  headerText: {
    marginTop: 20,
    marginBottom: 8,
    color: '#2c3e50',
  },
  subHeaderText: {
    marginBottom: 20,
    color: '#7f8c8d',
  },
  templatesContainer: {
    paddingBottom: 20,
  },
  templateCard: {
    marginBottom: 16,
    borderRadius: 12,
    height: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: WIDTH - 30,
  },
  cardBackground: {
    height: 202,
    marginTop: -20,
    borderRadius: 12,
    width: WIDTH - 30,
    marginLeft: -25,
  },
  cardImageStyle: {
    borderRadius: 12,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardContent: {
    padding: 16,
  },
  templateTitle: {
    marginBottom: 4,
    fontWeight: 'bold'
  },
  templateCategory: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  templatePreview: {
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  selectButton: {
    alignSelf: 'flex-start',
    borderRadius: 20,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    flex: 1,
    margin: 0,
  },
  modalContainer: {
    width: WIDTH - 30,
    borderRadius: 12
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
	marginVertical: 5
  },
  modalContainer1: {
    width: WIDTH - 30,
    borderRadius: 12
  },
  modalContent1: {
    flex: 1,
    padding: 16,
	marginVertical: 5
  },
  modalTitle: {
    marginVertical: 16,
    color: '#2c3e50',
  },
  fieldContainer: {
    marginBottom: 10,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#34495e',
  },
  input: {
    marginBottom: 4,
  },
  previewContainer: {
    marginTop: 5,
    marginBottom: 20,
  },
  previewLabel: {
    marginBottom: 12,
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: 16,
  },
  previewCard: {
    borderRadius: 12,
	width: WIDTH - 65,
    elevation: 3,
	height: 200,
	borderColor: 'transparent',
	borderWidth: 0
  },
  previewBackground: {
    height: 210,
	marginTop: -20,
	width: WIDTH - 60,
	marginLeft: -25,
	borderRadius: 12
  },
  previewImageStyle: {
    borderRadius: 12,
  },
  previewOverlay: {
    flex: 1,
  },
  previewContent: {
    padding: 16,
  },
  previewShopName: {
    marginBottom: 12,
    fontWeight: 'bold',
	marginTop: 15
  },
  previewDetails: {
    marginBottom: 12,
  },
  previewText: {
    marginBottom: 4,
    fontSize: 13,
  },
  previewContact: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
	color: 'white'
  },
  previewLocation: {
    fontSize: 14,
    fontWeight: 'bold',
	marginTop: 5,
	color: 'white'
  },
  saveButton: {
	width: 150,
	marginVertical: 20
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: -5,
    zIndex: 10,
  },
  closeIcon: {
    width: 28,
    height: 28,
  },
  previewButton: {
	width: 150
  },
  buttonContainer: {
	alignItems: 'center',
	marginTop: 5,
	marginBottom: 15
  },
  buttonContainer1: {
	flexDirection: 'row',
	alignItems: 'center',
	gap: 30,
	marginLeft: 40,
	marginTop: 5,
  }
});

export default TailorAdTemplates;