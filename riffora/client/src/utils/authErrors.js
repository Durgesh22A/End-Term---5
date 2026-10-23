export const getAuthErrorMessage = (error, fallback) => {
  const responseMessage = error?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (error?.request && !error?.response) {
    return 'The server could not be reached. Check that RIFFORA is running and try again.';
  }
  return fallback;
};
