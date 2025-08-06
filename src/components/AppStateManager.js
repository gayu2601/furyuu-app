import { AppState } from 'react-native';

class AppStateManager {
  constructor() {
    this.isListening = false;
    this.subscription = null;
    this.deviceChecked = false;
    this.appState = AppState.currentState;
    this.debounceTimer = null;
    this.lastActiveTime = Date.now();
    this.minimumBackgroundTime = 5000; // 5 seconds minimum background time
    this.debounceDelay = 2000; // 2 seconds debounce delay
    this.transitionCount = 0;
    this.lastTransitionTime = Date.now();
    this.isProcessingCallbacks = false;
    this.currentUserId = null; // Track current user ID
  }

  static getInstance() {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager();
    }
    return AppStateManager.instance;
  }

  startListening(currentUser, callbacks) {
    // Store the current user ID for comparison
    this.currentUserId = currentUser?.id;
    
    if (this.isListening) {
      console.log('AppStateManager already listening, skipping setup');
      return;
    }
    
    console.log('AppStateManager: Starting to listen for AppState changes');
    this.isListening = true;
    
    const handleAppStateChange = async (nextAppState) => {
      console.log('AppState changed:', this.appState, '->', nextAppState);
      console.log(currentUser.id + ',' + this.currentUserId);
      // Track rapid transitions (possible flicker)
      const now = Date.now();
      if (now - this.lastTransitionTime < 1000) {
        this.transitionCount++;
      } else {
        this.transitionCount = 1;
      }
      this.lastTransitionTime = now;
      
      // If too many rapid transitions, ignore this one
      if (this.transitionCount > 3) {
        console.log('Rapid transitions detected, ignoring state change');
        return;
      }
      
      // Clear existing debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      
      // Handle background state
      if (nextAppState.match(/inactive|background/)) {
        this.deviceChecked = false;
        this.lastActiveTime = Date.now();
      }
      
      // Handle foreground state with multiple safeguards
      if (this.appState.match(/inactive|background/) && 
          nextAppState === 'active' && 
          !this.deviceChecked &&
          !this.isProcessingCallbacks &&
          currentUser) {
        
        const backgroundDuration = Date.now() - this.lastActiveTime;
        const userChanged = !this.currentUserId || this.currentUserId !== currentUser?.id;
        
        // Skip minimum background time check if user changed
        if (!userChanged && backgroundDuration < this.minimumBackgroundTime) {
          console.log(`App was in background for only ${backgroundDuration}ms, skipping callbacks`);
          this.appState = nextAppState;
          return;
        }
        
        if (userChanged) {
          console.log('User changed, triggering callbacks immediately');
          this.currentUserId = currentUser?.id;
        } else {
          console.log('App has come to the foreground after', backgroundDuration, 'ms');
        }
        
        // Debounce the callback execution
        this.debounceTimer = setTimeout(async () => {
          // Double-check that we're still in active state and not processing
          if (AppState.currentState === 'active' && !this.isProcessingCallbacks) {
            await this.executeCallbacks(currentUser, callbacks, userChanged ? 'User changed + Foreground' : 'Foreground');
          }
        }, userChanged ? 0 : this.debounceDelay); // No debounce delay for user changes
      }
      
      this.appState = nextAppState;
    };

    this.subscription = AppState.addEventListener('change', handleAppStateChange);
    console.log('AppStateManager: Event listener attached');
  }

  stopListening() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      console.log('AppStateManager: Event listener removed');
    }
    
    this.isListening = false;
    this.deviceChecked = false;
    this.isProcessingCallbacks = false;
    this.transitionCount = 0;
    //this.currentUserId = null;
  }

  // Method to reset device check status
  resetDeviceCheck() {
    this.deviceChecked = false;
  }

  // Method to check if currently listening
  isCurrentlyListening() {
    return this.isListening;
  }

  // Method to configure timing parameters
  configureTimings(minimumBackgroundTime = 5000, debounceDelay = 2000) {
    this.minimumBackgroundTime = minimumBackgroundTime;
    this.debounceDelay = debounceDelay;
  }

  // Method to update user and trigger callbacks if needed
  updateUser(newUser, callbacks) {
	console.log('in updateUser ' + newUser.id + ',' + this.currentUserId);
    const userChanged = this.currentUserId !== newUser?.id;
    
    if (userChanged && this.isListening && !this.isProcessingCallbacks) {
      console.log('User changed from', this.currentUserId, 'to', newUser?.id);
      this.currentUserId = newUser?.id;
      this.deviceChecked = false;
      
      // Trigger callbacks immediately for user change
      if (newUser && AppState.currentState === 'active') {
        this.executeCallbacks(newUser, callbacks, 'User changed');
      }
    } else {
      this.currentUserId = newUser?.id;
    }
  }

  // Helper method to execute callbacks
  async executeCallbacks(currentUser, callbacks, reason) {
    if (this.isProcessingCallbacks) {
      console.log('Callbacks already processing, skipping');
      return;
    }

    this.isProcessingCallbacks = true;
    console.log(`Executing callbacks - Reason: ${reason}`);
    
    try {
      const { isActive, gracePeriodActive } = await callbacks.getUserDetails();
      console.log('getUserDetails result:', { isActive, gracePeriodActive });
      
      await callbacks.checkDevice(isActive, gracePeriodActive);
      await callbacks.activatePubSub(isActive || gracePeriodActive);
	  callbacks.checkProfileCompletion();
      
      this.deviceChecked = true;
      console.log('Callbacks completed successfully');
    } catch (error) {
      console.error('Error handling callbacks:', error);
    } finally {
      this.isProcessingCallbacks = false;
    }
  }
}

export default AppStateManager;