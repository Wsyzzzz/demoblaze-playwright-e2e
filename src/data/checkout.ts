export interface CheckoutDetails {
  name: string;
  country: string;
  city: string;
  card: string;
  month: string;
  year: string;
}

/** Dummy checkout data. 4111111111111111 is the standard Visa test number, not a real card. */
export const VALID_CHECKOUT: CheckoutDetails = {
  name: 'Wong Test',
  country: 'Malaysia',
  city: 'Kuala Lumpur',
  card: '4111111111111111',
  month: '10',
  year: '2027',
};

export const EMPTY_CHECKOUT: CheckoutDetails = {
  name: '',
  country: '',
  city: '',
  card: '',
  month: '',
  year: '',
};
