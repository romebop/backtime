export interface PurchasedItem {
  id: string;
  name: string;
  purchaseDate: Date;
  returnByDate?: Date;
  warrantyEndDate?: Date;
};

export interface UserData {
  sub: string;
  email: string;
  name: string;
  picture: string;
}