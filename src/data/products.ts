export type Category = 'Phones' | 'Laptops' | 'Monitors';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: Category;
}

/** Catalogue entries used by the tests (verified against GET /entries on 20-Oct-2026). */
export const PRODUCTS = {
  samsungGalaxyS6: { id: 1, name: 'Samsung galaxy s6', price: 360, category: 'Phones' },
  nokiaLumia1520: { id: 2, name: 'Nokia lumia 1520', price: 820, category: 'Phones' },
  nexus6: { id: 3, name: 'Nexus 6', price: 650, category: 'Phones' },
  samsungGalaxyS7: { id: 4, name: 'Samsung galaxy s7', price: 800, category: 'Phones' },
  iphone6: { id: 5, name: 'Iphone 6 32gb', price: 790, category: 'Phones' },
  sonyXperiaZ5: { id: 6, name: 'Sony xperia z5', price: 320, category: 'Phones' },
  htcOneM9: { id: 7, name: 'HTC One M9', price: 700, category: 'Phones' },
  sonyVaioI5: { id: 8, name: 'Sony vaio i5', price: 790, category: 'Laptops' },
  sonyVaioI7: { id: 9, name: 'Sony vaio i7', price: 790, category: 'Laptops' },
} as const satisfies Record<string, Product>;

/** The 9 products on the first page of the home catalogue. */
export const HOME_PAGE_PRODUCTS: readonly Product[] = [
  PRODUCTS.samsungGalaxyS6,
  PRODUCTS.nokiaLumia1520,
  PRODUCTS.nexus6,
  PRODUCTS.samsungGalaxyS7,
  PRODUCTS.iphone6,
  PRODUCTS.sonyXperiaZ5,
  PRODUCTS.htcOneM9,
  PRODUCTS.sonyVaioI5,
  PRODUCTS.sonyVaioI7,
];

export const totalOf = (items: readonly Product[]): number =>
  items.reduce((sum, item) => sum + item.price, 0);
