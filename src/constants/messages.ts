/** User-facing texts shown by DemoBlaze (native alerts and the purchase dialog). */
export const ALERT = {
  SIGN_UP_SUCCESS: 'Sign up successful.',
  USER_EXISTS: 'This user already exist.',
  WRONG_PASSWORD: 'Wrong password.',
  USER_NOT_FOUND: 'User does not exist.',
  LOGIN_FIELDS_REQUIRED: 'Please fill out Username and Password.',
  PRODUCT_ADDED: 'Product added.',
  ORDER_FIELDS_REQUIRED: 'Please fill out Name and Creditcard.',
} as const;

export const PURCHASE_CONFIRMATION_TITLE = 'Thank you for your purchase!';

/** Error messages returned by the DemoBlaze API. */
export const API_ERROR = {
  WRONG_PASSWORD: 'Wrong password.',
  USER_NOT_FOUND: 'User does not exist.',
  USER_EXISTS: 'This user already exist.',
  TOKEN_MALFORMED: 'Bad parameter, token malformed.',
  NOT_FOUND: 'Not found.',
} as const;
