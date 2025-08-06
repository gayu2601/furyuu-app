import React, { createContext, useContext, useReducer } from 'react';

const WalkthroughContext = createContext();

const walkthroughSteps = [
  { screen: 'HomeNew', id: 'welcome' },
	{ screen: 'HomeNew', id: 'createOrder' },
	{ screen: 'Test', id: 'custDetails' },
	{ screen: 'Test', id: 'dressDetails' },
    { screen: 'HomeNew', id: 'orderBag' },
    { screen: 'HomeNew', id: 'notifications' }
];

const walkthroughReducer = (state, action) => {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        isActive: true,
        currentStep: 0,
        navigation: action.navigation,
      };
    case 'NEXT':
      const nextStep = state.currentStep + 1;
      if (nextStep >= walkthroughSteps.length) {
        return {
          ...state,
          isActive: false,
          currentStep: 0,
          navigation: null,
        };
      }
      return {
        ...state,
        currentStep: nextStep,
      };
	case 'PREV':
      const prevStep = state.currentStep - 1;
      if (prevStep < 0) {
        return {
          ...state,
          isActive: false,
          currentStep: 0,
          navigation: null,
        };
      }
      return {
        ...state,
        currentStep: prevStep,
      };
    case 'END':
      return {
        ...state,
        isActive: false,
        currentStep: 0,
        navigation: null,
      };
    case 'SET_NAVIGATION':
      return {
        ...state,
        navigation: action.navigation,
      };
    default:
      return state;
  }
};

const initialState = {
  isActive: false,
  currentStep: 0,
  navigation: null,
};

export const WalkthroughProvider = ({ children }) => {
  const [state, dispatch] = useReducer(walkthroughReducer, initialState);

  const start = (navigation) => {
    dispatch({ type: 'START', navigation });
    // Navigate to first step
    const firstStep = walkthroughSteps[0];
    navigation.navigate(firstStep.screen);
  };

  const next = () => {
    dispatch({ type: 'NEXT' });
    // Navigate to next step if not ending
    const nextStepIndex = state.currentStep + 1;
    if (nextStepIndex < walkthroughSteps.length && state.navigation) {
      const nextStep = walkthroughSteps[nextStepIndex];
	  if(nextStep.id === 'custDetails') {
		state.navigation.navigate(nextStep.screen, {itemName: 'chudithar', headerImgUri: require('../../../assets/women/chudithar.jpg'), walkthroughActive: true});
	  } else if(nextStep.id === 'dressDetails'){
		state.navigation.navigate(nextStep.screen, {itemName: 'chudithar', headerImgUri: require('../../../assets/women/chudithar.jpg'), step: 2, walkthroughActive: true});
	  } else {
		state.navigation.navigate(nextStep.screen);
	  }
    }
  };
  
  const back = () => {
    dispatch({ type: 'PREV' });
    const prevStepIndex = state.currentStep - 1;
	if (prevStepIndex >= 0 && state.navigation) {
      const prevStep = walkthroughSteps[prevStepIndex];
	  if(prevStep.id === 'custDetails') {
		state.navigation.navigate(prevStep.screen, {itemName: 'chudithar', headerImgUri: require('../../../assets/women/chudithar.jpg'), walkthroughActive: true, step: 1});
	  } else if(prevStep.id === 'dressDetails'){
		state.navigation.navigate(prevStep.screen, {itemName: 'chudithar', headerImgUri: require('../../../assets/women/chudithar.jpg'),  walkthroughActive: true, step: 2});
	  } else {
		state.navigation.navigate(prevStep.screen);
	  }
    }
  };

  const end = () => {
    dispatch({ type: 'END' });
  };

  const setNavigation = (navigation) => {
    dispatch({ type: 'SET_NAVIGATION', navigation });
  };

  const isStepActive = (screenName, stepId) => {
    if (!state.isActive) return false;
    const currentStepData = walkthroughSteps[state.currentStep];
    return currentStepData?.screen === screenName && currentStepData?.id === stepId;
  };

  const getCurrentStep = () => {
    return walkthroughSteps[state.currentStep] || null;
  };

  const value = {
    ...state,
    start,
    next,
    end,
	back,
    setNavigation,
    isStepActive,
    getCurrentStep,
    steps: walkthroughSteps,
  };

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within WalkthroughProvider');
  }
  return context;
};

