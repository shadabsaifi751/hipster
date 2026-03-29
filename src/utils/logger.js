const prefix = (level) => `[spa-booking][${level}]`;

export const logApiError = (message, meta = {}) => {
  console.error(prefix('api'), message, meta);
};

export const logUiError = (message, meta = {}) => {
  console.error(prefix('ui'), message, meta);
};

export const logAction = (action, meta = {}) => {
  console.info(prefix('action'), action, meta);
};
