import { EMPTY_CHECKOUT, VALID_CHECKOUT, type CheckoutDetails } from './checkout';

export interface OrderValidationCase {
  id: string;
  title: string;
  details: CheckoutDetails;
}

/** Data-driven negative cases for the Place Order form (CRT-032..034). */
export const REQUIRED_FIELD_CASES: OrderValidationCase[] = [
  {
    id: 'CRT-032',
    title: "Verify 'Purchase' is blocked when all fields are empty",
    details: EMPTY_CHECKOUT,
  },
  {
    id: 'CRT-033',
    title: "Verify 'Purchase' is blocked when Credit card is empty",
    details: { ...EMPTY_CHECKOUT, name: VALID_CHECKOUT.name },
  },
  {
    id: 'CRT-034',
    title: "Verify 'Purchase' is blocked when Name is empty",
    details: { ...EMPTY_CHECKOUT, card: VALID_CHECKOUT.card },
  },
];
