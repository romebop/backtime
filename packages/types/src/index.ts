export type PurchasedItem = {
  id: string;
  name: string;
  purchaseDate: Date;
  returnByDate?: Date;
  warrantyEndDate?: Date;
};