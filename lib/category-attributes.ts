export interface CategoryAttribute {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  placeholder?: string;
  options?: string[];
  level: 'required' | 'recommended' | 'optional';
  productTypes?: string[];
}

export interface SubCategoryConfig {
  name: string;
  productTypes: string[];
  attributes: CategoryAttribute[];
}

export interface CategoryConfig {
  id: string;
  name: string;
  subcategories: SubCategoryConfig[];
  generalAttributes: CategoryAttribute[];
  defaultHsn: string;
  defaultGst: number;
}

export const CATEGORY_ENGINE: Record<string, CategoryConfig> = {
  'Fashion & Apparel': {
    id: 'fashion',
    name: 'Fashion & Apparel',
    defaultHsn: '6204',
    defaultGst: 5,
    generalAttributes: [
      { key: 'Gender', label: 'Target Gender', type: 'select', options: ['Women', 'Men', 'Unisex', 'Girls', 'Boys'], level: 'required' },
      { key: 'Fabric', label: 'Primary Fabric / Material', type: 'text', placeholder: 'e.g. Pure Georgette, Rayon, Cotton', level: 'required' },
      { key: 'Pattern', label: 'Print / Pattern', type: 'select', options: ['Embroidered', 'Solid / Plain', 'Floral Print', 'Bandhani / Bandhej', 'Zari Work', 'Striped', 'Printed'], level: 'recommended' },
      { key: 'Occasion', label: 'Occasion', type: 'select', options: ['Festive & Wedding', 'Casual Wear', 'Party Wear', 'Formal / Office', 'Daily Wear'], level: 'recommended' },
      { key: 'Fit Type', label: 'Fit Type', type: 'select', options: ['Regular Fit', 'Slim Fit', 'Relaxed / Loose Fit', 'A-Line', 'Straight'], level: 'optional' },
      { key: 'Country of Origin', label: 'Country of Origin', type: 'text', placeholder: 'India', level: 'recommended' }
    ],
    subcategories: [
      {
        name: 'Women Ethnic Wear',
        productTypes: ['Kurtis & Kurta Sets', 'Sarees', 'Dhoti Choli Sets', 'Lehenga Choli', 'Gowns & Anarkalis'],
        attributes: [
          { key: 'Sleeve Length', label: 'Sleeve Length', type: 'select', options: ['3/4th Sleeve', 'Full Sleeve', 'Sleeveless', 'Half Sleeve'], level: 'recommended', productTypes: ['Kurtis & Kurta Sets', 'Dhoti Choli Sets', 'Gowns & Anarkalis'] },
          { key: 'Neck Style', label: 'Neckline', type: 'select', options: ['Round Neck', 'V-Neck', 'Mandarin / Chinese Collar', 'Sweetheart', 'Boat Neck'], level: 'recommended', productTypes: ['Kurtis & Kurta Sets', 'Dhoti Choli Sets'] },
          { key: 'Blouse Piece', label: 'Blouse Included?', type: 'select', options: ['Unstitched Blouse Piece', 'Stitched Blouse', 'Without Blouse'], level: 'required', productTypes: ['Sarees'] },
          { key: 'Saree Length', label: 'Saree Length (Meters)', type: 'text', placeholder: 'e.g. 5.5m + 0.8m Blouse', level: 'recommended', productTypes: ['Sarees'] },
          { key: 'Dupatta Details', label: 'Dupatta Included', type: 'select', options: ['With Matching Dupatta', 'Without Dupatta'], level: 'recommended', productTypes: ['Kurtis & Kurta Sets', 'Dhoti Choli Sets', 'Lehenga Choli'] }
        ]
      },
      {
        name: 'Girls',
        productTypes: ['Girls Nightwear'],
        attributes: [
          { key: 'Age Group', label: 'Age Group', type: 'select', options: ['2-4 Years', '4-6 Years', '6-8 Years', '8-10 Years', '10-12 Years', '12-14 Years', '14-16 Years'], level: 'required' },
          { key: 'Nightwear Type', label: 'Nightwear Type', type: 'select', options: ['Night Suit Set', 'Pyjama Set', 'Night Dress', 'Top & Pyjama Set'], level: 'recommended' },
          { key: 'Sleeve Length', label: 'Sleeve Length', type: 'select', options: ['Sleeveless', 'Half Sleeve', 'Full Sleeve'], level: 'recommended' }
        ]
      },
      {
        name: 'Men Ethnic & Western',
        productTypes: ['Shirts', 'Kurta Pajama Sets', 'T-Shirts', 'Trousers & Jeans'],
        attributes: [
          { key: 'Collar Style', label: 'Collar Type', type: 'select', options: ['Spread Collar', 'Mandarin Collar', 'Button-Down Collar', 'Round Neck'], level: 'recommended' },
          { key: 'Sleeve Type', label: 'Sleeve', type: 'select', options: ['Full Sleeve', 'Short Sleeve'], level: 'recommended' }
        ]
      }
    ]
  },

  'Home & Kitchen': {
    id: 'home_kitchen',
    name: 'Home & Kitchen',
    defaultHsn: '',
    defaultGst: 18,
    generalAttributes: [
      { key: 'Material', label: 'Primary Material', type: 'text', placeholder: 'e.g. Plastic, Stainless Steel, Silicone, Glass', level: 'required' },
      { key: 'Country of Origin', label: 'Country of Origin', type: 'text', placeholder: 'India', level: 'recommended' }
    ],
    subcategories: [
      {
        name: 'Kitchen Storage & Containers',
        productTypes: ['Jar', 'Canister', 'Bottle', 'Spice Storage', 'Storage Container'],
        attributes: [
          { key: 'Capacity / Size', label: 'Capacity / Size', type: 'text', placeholder: 'e.g. 500 ml, 1 Litre', level: 'recommended' },
          { key: 'Lid / Seal Type', label: 'Lid / Seal Type', type: 'text', placeholder: 'e.g. Airtight Lid, Screw Lid, Standard Lid', level: 'recommended' },
          { key: 'Dishwasher Safe', label: 'Dishwasher Safe', type: 'select', options: ['Yes', 'No', 'Not Applicable'], level: 'optional' }
        ]
      },
      {
        name: 'Dining & Table Accessories',
        productTypes: ['Coaster', 'Placemat', 'Table Mat', 'Cup Mat', 'Drinkware'],
        attributes: [
          { key: 'Capacity / Size', label: 'Capacity / Size', type: 'text', placeholder: 'e.g. 10 cm coaster, 300 ml mug', level: 'recommended' },
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Dining, serving, table protection', level: 'recommended' }
        ]
      },
      {
        name: 'Home Organization',
        productTypes: ['Holder', 'Rack', 'Organizer', 'Brush', 'Drain', 'Sink', 'Utility Storage', 'Hair Dryer'],
        attributes: [
          { key: 'Mounting Type', label: 'Mounting / Placement Type', type: 'text', placeholder: 'e.g. Adhesive Wall Mount, Hanging, Freestanding', level: 'recommended' },
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Household storage, cleaning, sink area, cable organisation', level: 'recommended' }
        ]
      }
    ]
  },

  'Electronics & Gadgets': {
    id: 'electronics',
    name: 'Electronics & Gadgets',
    defaultHsn: '8518',
    defaultGst: 18,
    generalAttributes: [
      { key: 'Model Name / Number', label: 'Model Number / Name', type: 'text', placeholder: 'e.g. SB-TWS-01', level: 'required' },
      { key: 'Connectivity', label: 'Connectivity Type', type: 'select', options: ['Bluetooth 5.3 Wireless', 'USB Type-C Wired', 'Dual Mode (Wireless + Wired)'], level: 'required' },
      { key: 'Battery Backup', label: 'Battery Life / Playtime', type: 'text', placeholder: 'e.g. Up to 36 Hours, 5000 mAh', level: 'recommended' },
      { key: 'Warranty Period', label: 'Brand Warranty Duration', type: 'select', options: ['1 Year Manufacturer Warranty', '6 Months Warranty', 'No Warranty'], level: 'recommended' },
      { key: 'Country of Origin', label: 'Country of Origin', type: 'text', placeholder: 'India', level: 'recommended' }
    ],
    subcategories: [
      {
        name: 'Audio & Wearables',
        productTypes: ['TWS Earbuds', 'Bluetooth Neckbands', 'Smartwatches'],
        attributes: [
          { key: 'Water Resistance', label: 'IPX Rating', type: 'select', options: ['IPX5 Water/Sweat Resistant', 'IPX7 Waterproof', 'Not Rated'], level: 'recommended' },
          { key: 'Mic / Calling', label: 'Microphone Setup', type: 'select', options: ['Quad Mic with ENC Noise Cancellation', 'Built-in HD Mic'], level: 'recommended' }
        ]
      }
    ]
  },

  'Beauty & Personal Care': {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    defaultHsn: '3304',
    defaultGst: 18,
    generalAttributes: [
      { key: 'Country of Origin', label: 'Country of Origin', type: 'text', placeholder: 'India', level: 'recommended' }
    ],
    subcategories: [
      {
        name: 'Skin & Hair Care',
        productTypes: ['Face Serum', 'Moisturizer & Creams', 'Hair Oils & Shampoos'],
        attributes: [
          { key: 'Net Quantity', label: 'Net Volume / Weight', type: 'text', placeholder: 'e.g. 100 ml, 250 g', level: 'required' },
          { key: 'Skin / Hair Type', label: 'Suitable For', type: 'select', options: ['All Skin Types', 'Oily Skin', 'Dry Skin', 'All Hair Types'], level: 'recommended' },
          { key: 'Key Ingredients', label: 'Key Active Ingredients', type: 'text', placeholder: 'e.g. Aloe Vera, Tea Tree Oil, Vitamin C', level: 'recommended' },
          { key: 'Expiry / Shelf Life', label: 'Shelf Life', type: 'text', placeholder: 'e.g. 24 Months from MFG Date', level: 'recommended' },
          { key: 'Formulation', label: 'Formulation', type: 'select', options: ['Liquid Serum', 'Gel', 'Cream', 'Lotion', 'Oil'], level: 'recommended' }
        ]
      },
      {
        name: 'Makeup Accessories',
        productTypes: ['Foldable Makeup Mirror', 'Vanity Mirror', 'Compact Mirror'],
        attributes: [
          { key: 'Mirror Type', label: 'Mirror Type', type: 'select', options: ['Foldable', 'Free Standing', 'Compact / Travel', 'Tabletop'], level: 'required' },
          { key: 'Mirror Shape', label: 'Shape', type: 'select', options: ['Rectangle', 'Round', 'Square', 'Oval'], level: 'recommended' },
          { key: 'Frame / Cover Material', label: 'Frame / Cover Material', type: 'text', placeholder: 'e.g. PU Leather, ABS Plastic', level: 'recommended' },
          { key: 'Mirror Material', label: 'Mirror Material', type: 'text', placeholder: 'e.g. Glass', level: 'recommended' },
          { key: 'Magnification', label: 'Magnification', type: 'select', options: ['1X', '2X', '5X', '10X', 'Not Applicable'], level: 'optional' },
          { key: 'Lighted Mirror', label: 'Lighted Mirror', type: 'select', options: ['No', 'Yes - LED'], level: 'optional' },
          { key: 'Stand Included', label: 'Stand Included', type: 'select', options: ['Yes', 'No'], level: 'recommended' },
          { key: 'Foldable', label: 'Foldable', type: 'select', options: ['Yes', 'No'], level: 'recommended' },
          { key: 'Product Dimensions', label: 'Product Dimensions', type: 'text', placeholder: 'e.g. 20 × 15 cm', level: 'optional' },
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Makeup, skincare, travel grooming', level: 'recommended' }
        ]
      }
    ]
  }
};