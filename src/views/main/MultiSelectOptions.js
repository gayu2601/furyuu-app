import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Layout,
  Text,
  CheckBox,
  Button,
  Card,
  List,
  ListItem,
  useTheme
} from '@ui-kitten/components';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MultiSelectOptions = ({ onSelectionChange, initialItems = []}) => {
  const [selectedItems, setSelectedItems] = useState(initialItems);
  const [hasChanged, setHasChanged] = useState(false);
  const theme = useTheme();
  const options = ['Lining', 'Piping', 'Aari Embroidery', 'Machine Embroidery', 'Lace', 'Falls', 'Zipper', 'Other']

  useEffect(() => {
    if (hasChanged) {
		console.log('in onSelectionChange useEffect')
      onSelectionChange(selectedItems);
	  setHasChanged(false);
    }
  }, [selectedItems, hasChanged]);

  const handleItemToggle = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
	setHasChanged(true);
	console.log(selectedItems);
  };

  return (
      <Layout style={styles.container}>
			<Layout style={styles.innerLayout}>
				<MaterialCommunityIcons name='puzzle-plus' size={24} color={theme['color-primary-500']}/>
				<Text category="s1" style={{ marginLeft: 16 }}>
					Addons
				</Text>
			</Layout>
        <Card style={styles.card}>
          <View style={styles.optionsContainer}>
            {options.map((item, index) => {
              const isSelected = selectedItems.includes(item);
              return (
                <View key={index} style={styles.optionItem}>
                  <CheckBox
                    checked={isSelected}
                    onChange={() => handleItemToggle(item)}
                  />
                  <Text
                    style={styles.optionText}
                    onPress={() => handleItemToggle(item)}
                  >
                    {item}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    marginBottom: -10,
	width: 310,
	marginLeft: -15
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
	marginLeft: -15
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor: 'F7F9FC',
  },
  optionText: {
    marginLeft: 8,
    fontSize: 12,
  },
  innerLayout: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginLeft: -15, backgroundColor: '#F7F9FC', 
	width: 310, height: 50},
});

export default MultiSelectOptions;