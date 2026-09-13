export interface CategoryAttribute {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  placeholder?: string;
  options?: string[];
  level: 'required' | 'recommended' | 'optional';
  productTypes?: string[]; // If omitted, applies to all in subcategory
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
      { key: 'Color', label: 'Color / Shade', type: 'text', placeholder: 'e.g. Mustard Yellow, Navy Blue', level: 'required' },
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
          { key: 'Age Group', label: 'Age Group', type: 'select', options: ['2-4 Years', '4-6 Years', '6-8 Years', '8-10 Years', '10-12 Years', '12-14 Years', '14-16 Years'], level: 'required', productTypes: ['Girls Nightwear'] },
          { key: 'Nightwear Type', label: 'Nightwear Type', type: 'select', options: ['Night Suit Set', 'Pyjama Set', 'Night Dress', 'Top & Pyjama Set'], level: 'recommended', productTypes: ['Girls Nightwear'] },
          { key: 'Sleeve Length', label: 'Sleeve Length', type: 'select', options: ['Sleeveless', 'Half Sleeve', 'Full Sleeve'], level: 'recommended', productTypes: ['Girls Nightwear'] }
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
        name: 'Sink, Drain & Faucet Accessories',
        productTypes: ['Drain & Sink Accessories', 'Faucet & Nozzle Accessories', 'Sink Racks & Drainers'],
        attributes: [
          { key: 'Compatible Size', label: 'Compatible Size', type: 'text', placeholder: 'e.g. 1.5 inch drain / standard faucet', level: 'recommended' },
          { key: 'Installation Type', label: 'Installation Type', type: 'text', placeholder: 'e.g. Push Fit, Screw Fit, Clip On', level: 'optional' },
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Kitchen sink, bathroom drain, faucet extension', level: 'recommended' }
        ]
      },
      {
        name: 'Kitchen Tools & Cutlery',
        productTypes: ['Kitchen Tools', 'Knives & Cutters', 'Spoons & Cutlery', 'Spatulas Ladles & Tongs', 'Measuring & Prep Tools'],
        attributes: [
          { key: 'Tool Type', label: 'Tool Type', type: 'text', placeholder: 'e.g. Ladle, Knife, Whisk, Tong, Cutter', level: 'recommended' },
          { key: 'Size', label: 'Size / Length', type: 'text', placeholder: 'e.g. 28 cm', level: 'optional' },
          { key: 'Handle Material', label: 'Handle Material', type: 'text', placeholder: 'e.g. Wood, Nylon, Stainless Steel', level: 'optional' }
        ]
      },
      {
        name: 'Kitchen Storage & Containers',
        productTypes: ['Jars & Canisters', 'Bottles & Pourers', 'Spice Storage', 'Storage Containers'],
        attributes: [
          { key: 'Capacity / Size', label: 'Capacity / Size', type: 'text', placeholder: 'e.g. 500 ml, 1 Litre', level: 'recommended' },
          { key: 'Lid / Seal Type', label: 'Lid / Seal Type', type: 'text', placeholder: 'e.g. Airtight Lid, Screw Lid, Standard Lid', level: 'recommended' }
        ]
      },
      {
        name: 'Dining & Serving',
        productTypes: ['Bowls & Dishes', 'Plates & Serving Ware', 'Coasters & Placemats', 'Cutlery Sets', 'Mugs & Drinkware'],
        attributes: [
          { key: 'Capacity / Size', label: 'Capacity / Size', type: 'text', placeholder: 'e.g. 300 ml bowl, 10 inch plate', level: 'recommended' },
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Serving, dining, snacks, table protection', level: 'recommended' }
        ]
      },
      {
        name: 'Cleaning & Laundry',
        productTypes: ['Cleaning Brushes', 'Laundry Accessories', 'Cleaning Cloths & Towels', 'Washing Machine Accessories', 'Stain Removal Tools'],
        attributes: [
          { key: 'Cleaning Use', label: 'Cleaning / Laundry Use', type: 'text', placeholder: 'e.g. Fabric cleaning, dust removal, washing machine support', level: 'recommended' },
          { key: 'Reusable', label: 'Reusable', type: 'select', options: ['Yes', 'No', 'Not Applicable'], level: 'optional' }
        ]
      },
      {
        name: 'Home Organization & Storage',
        productTypes: ['Hooks & Holders', 'Racks & Organizers', 'Storage Bags & Covers', 'Key Holders', 'Utility Storage'],
        attributes: [
          { key: 'Mounting Type', label: 'Mounting / Placement Type', type: 'text', placeholder: 'e.g. Adhesive Wall Mount, Hanging, Freestanding', level: 'recommended' },
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Keys, shoes, quilts, plugs, household storage', level: 'recommended' }
        ]
      },
      {
        name: 'Bathroom & Personal Care Accessories',
        productTypes: ['Hair Dryer Holders', 'Makeup Mirrors', 'Hair & Scalp Accessories', 'Foot Care Accessories', 'Grooming Tools'],
        attributes: [
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Hair dryer storage, grooming, mirror, foot care', level: 'recommended' },
          { key: 'Mounting Type', label: 'Mounting Type', type: 'text', placeholder: 'e.g. Adhesive Wall Mount / Freestanding', level: 'optional' }
        ]
      },
      {
        name: 'Furniture & Surface Protection',
        productTypes: ['Corner & Edge Protectors', 'Table Protection', 'Wall Protection', 'Mats & Surface Protectors'],
        attributes: [
          { key: 'Protection Use', label: 'Protection Use', type: 'text', placeholder: 'e.g. Table edge, corner, wall, floor surface', level: 'recommended' },
          { key: 'Length / Size', label: 'Length / Size', type: 'text', placeholder: 'e.g. 1.2 metre, 45 x 30 cm', level: 'optional' }
        ]
      },
      {
        name: 'Home Utility & Appliances',
        productTypes: ['Small Home Appliances', 'Timers & Utility Tools', 'Stands & Brackets', 'Household Utility Accessories'],
        attributes: [
          { key: 'Primary Use', label: 'Primary Use', type: 'text', placeholder: 'e.g. Kitchen timer, stand, bracket, small appliance', level: 'recommended' },
          { key: 'Power Source', label: 'Power Source', type: 'text', placeholder: 'e.g. Manual, Battery, Electric, Not Applicable', level: 'optional' }
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
      { key: 'Color', label: 'Color', type: 'text', placeholder: 'e.g. Midnight Black', level: 'required' },
      { key: 'Connectivity', label: 'Connectivity Type', type: 'select', options: ['Bluetooth 5.3 Wireless', 'USB Type-C Wired', 'Dual Mode (Wireless + Wired)'], level: 'required' },
      { key: 'Battery Backup', label: 'Battery Life / Playtime', type: 'text', placeholder: 'e.g. Up to 36 Hours, 5000 mAh', level: 'recommended' },
      { key: 'Warranty Period', label: 'Brand Warranty Duration', type: 'select', options: ['1 Year Manufacturer Warranty', '6 Months Warranty', 'No Warranty'], level: 'recommended' }
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
      { key: 'Net Quantity', label: 'Net Volume / Weight', type: 'text', placeholder: 'e.g. 100 ml, 250 g', level: 'required' },
      { key: 'Skin / Hair Type', label: 'Suitable For', type: 'select', options: ['All Skin Types', 'Oily Skin', 'Dry Skin', 'All Hair Types'], level: 'recommended' },
      { key: 'Key Ingredients', label: 'Key Active Ingredients', type: 'text', placeholder: 'e.g. Aloe Vera, Tea Tree Oil, Vitamin C', level: 'recommended' },
      { key: 'Expiry / Shelf Life', label: 'Shelf Life', type: 'text', placeholder: 'e.g. 24 Months from MFG Date', level: 'recommended' },
      { key: 'Country of Origin', label: 'Country of Origin', type: 'text', placeholder: 'India', level: 'recommended' }
    ],
    subcategories: [
      {
        name: 'Skin & Hair Care',
        productTypes: ['Face Serum', 'Moisturizer & Creams', 'Hair Oils & Shampoos'],
        attributes: [
          { key: 'Formulation', label: 'Formulation', type: 'select', options: ['Liquid Serum', 'Gel', 'Cream', 'Lotion', 'Oil'], level: 'recommended' }
        ]
      }
    ]
  }
};
