import { useState, useEffect } from 'react';
import { storage } from '../extra/storage';

const PROFILE_MODAL_KEY = 'profile_modal_last_shown';
const SHOW_INTERVAL = 7 * 24 * 60 * 60 * 1000;

export const useProfileCompletionModal = () => {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkShouldShowModal();
  }, []);

  const checkShouldShowModal = async () => {
    try {
      const lastShown = storage.getString(PROFILE_MODAL_KEY);
      const now = Date.now();
      
      if (!lastShown) {
        // First time - show modal
        setShouldShowModal(true);
      } else {
        const timeSinceLastShown = now - parseInt(lastShown);
        if (timeSinceLastShown >= SHOW_INTERVAL) {
          setShouldShowModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking modal status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hideModal = async () => {
    try {
      storage.set(PROFILE_MODAL_KEY, Date.now().toString());
      setShouldShowModal(false);
    } catch (error) {
      console.error('Error saving modal status:', error);
    }
  };

  const resetTimer = async () => {
    try {
      storage.delete(PROFILE_MODAL_KEY);
      setShouldShowModal(true);
    } catch (error) {
      console.error('Error resetting modal timer:', error);
    }
  };

  return {
    shouldShowModal,
    hideModal,
    resetTimer,
    isLoading,
	setShouldShowModal
  };
};