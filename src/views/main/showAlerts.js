import { showMessage } from 'react-native-flash-message';

export const showSuccessMessage = (message) => {
  showMessage({
    message: message,
    type: "success",
    backgroundColor: "green",
    color: "white",
	duration: 5000
  });
};

export const showErrorMessage = (message) => {
  showMessage({
    message: message,
    type: "danger",
    backgroundColor: "red",   
    color: "white",
	duration: 5000	
  });
};
