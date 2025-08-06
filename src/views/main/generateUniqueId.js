let idCounter = 0;

const generateUniqueId = () => {
  return ++idCounter;
};

const resetIdCounter = () => {
  idCounter = 0;
};

const getIdCounter = () => {
	return idCounter;
}

export { generateUniqueId, resetIdCounter, getIdCounter };