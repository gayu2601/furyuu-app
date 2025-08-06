import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@ui-kitten/components';

const ProfileAvatarAuth = (props) => {

  const renderEditButtonElement = () => {
    const buttonElement = props.editButton();

    return React.cloneElement(buttonElement, {
      style: [buttonElement.props.style, styles.editButton],
    });
  };

  const { style, editButton, ...restProps } = props;

  return (
    <View style={style}>
      <Avatar
        {...restProps}
        style={[style, styles.avatar]}
      />
      {editButton && renderEditButtonElement()}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignSelf: 'center',
  },
  editButton: {
    position: 'absolute',
    alignSelf: 'flex-end',
    bottom: -15,
	right: -10
  },
});

export default ProfileAvatarAuth;