const analyticsCache = {
  data: {},
  set: function(key, value) {
    this.data[key] = {
      value,
      timestamp: Date.now(),
      date: new Date().toDateString() // Store the date string for daily comparison
    };
  },
  get: function(key) {
    return this.data[key];
  },
  isValid: function(key, options = {}) {
    const item = this.data[key];
    
    // If item doesn't exist, it's not valid
    if (!item) return false;
    
    // Check if we should refresh daily
    if (options.refreshDaily) {
      const today = new Date().toDateString();
      // If the cached date is not today, consider it invalid
      if (item.date !== today) {
		console.log('not cached today');
        return false;
      }
    }
    
    // If we have a TTL, check against that as well
    if (options.ttl && (Date.now() - item.timestamp > options.ttl)) {
      return false;
    }
    
    return true;
  }
};

export default analyticsCache;
