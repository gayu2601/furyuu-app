import React from 'react';
import { ImageStyle } from 'react-native';
import { Icon, useTheme } from '@ui-kitten/components';

export const EmailIcon = (style: ImageStyle): IconElement => {
  const theme = useTheme();
  return (
	<Icon {...style} name='email' fill={theme['color-primary-100']}/>
  )
};

export const PersonIcon = (style: ImageStyle): IconElement => {
  const theme = useTheme();
  return (
	<Icon {...style} name='person' fill={theme['color-primary-100']}/>
  )
};

export const PhoneIcon = (style: ImageStyle): IconElement => {
  const theme = useTheme();
  return (
	<Icon {...style} name='phone-outline' fill={theme['color-primary-100']}/>
  )
};

export const CarIcon = (style: ImageStyle): IconElement => {
  const theme = useTheme();
  return (
	<Icon {...style} name='car-outline' fill={theme['color-primary-100']}/>
  )
};

export const PlusIcon = (style: ImageStyle): IconElement => {
  const theme = useTheme();
  return (
	<Icon {...style} name='plus' fill={theme['color-primary-100']}/>
  );
};

export const ArrowIosBackIcon = (style: ImageStyle): IconElement => {
	const theme = useTheme();
	return (
		<Icon {...style} name='arrow-ios-back'/>
	)
};

export const RefreshIcon = (style: ImageStyle): IconElement => {
	const theme = useTheme();
	return (
		<Icon {...style} name='refresh-outline'/>
	)
};

export const DrawerIcon = (style: ImageStyle): IconElement => (
	<Icon {...style} name='menu-outline' fill='#fff'/>
);

export const CameraIcon = (style: ImageStyle): IconElement => (
  <Icon {...style} name='camera'/>
);

export const EditIcon = (style: ImageStyle): IconElement => (
  <Icon {...style} name='edit-outline'/>
);

export const MinusIcon = (style: ImageStyle): IconElement => (
  <Icon {...style} name='minus'/>
);

export const PlusIconNoTheme = (style: ImageStyle): IconElement => (
  <Icon {...style} name='plus'/>
);

export const SettingsIcon = (style: ImageStyle): IconElement => {
  const theme = useTheme();
  return (
	<Icon {...style} name='settings-2-outline' fill={theme['color-primary-100']}/>
  )
};
