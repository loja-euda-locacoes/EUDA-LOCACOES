export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  measurements: string;
  recommendations: string;
  images: string[];
  category?: string;
  videoUrl?: string;
  mostWanted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  address: string;
  instagram?: string;
  secondaryContactName: string;
  secondaryContactPhone: string;
  createdAt: string;
}

export type RentalStatus = 'active' | 'picked_up' | 'finished' | 'late' | 'canceled';

export interface Rental {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  productPrice: number;
  status: RentalStatus;
  pickupDate: string;
  returnDate: string;
  totalValue: number;
  fineValue: number;
  notes?: string;
  createdAt: string;
}

export interface Settings {
  storeName: string;
  whatsappNumber: string;
  address?: string;
  impactPhrase: string;
  bannerUrl?: string;
  logoUrl?: string;
  fixedFine: number;
  percentFine: number;
  toleranceHours: number;
  defaultPickupTime: string;
  defaultReturnTime: string;
}
